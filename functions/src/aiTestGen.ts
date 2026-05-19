// AI-driven test generation. The callable accepts a free-form prompt
// plus structured constraints (count, language, CEFR, allowed question
// types) and an optional pre-extracted source text. The model is asked
// for structured JSON matching our actual Question schema; we then
// post-process each question (validate per-type required fields,
// compute gap-fill positions, sanity-check reordering correctOrder)
// before returning the cleaned set to the client.

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { z } from "zod";
import { buildAi } from "./ai";
import { db } from "./admin";

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const ALL_TYPES = [
	"multiple-choice",
	"true-false",
	"gap-fill",
	"matching",
	"reordering-horizontal",
	"reordering-vertical",
] as const;

const QuestionTypeEnum = z.enum(ALL_TYPES);

const InputSchema = z.object({
	prompt: z.string().trim().min(3).max(4000),
	sourceText: z.string().trim().max(30000).optional(),
	language: z.string().trim().min(1).max(40),
	cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
	count: z.number().int().min(1).max(15),
	allowedTypes: z.array(QuestionTypeEnum).min(1),
});
type InputType = z.infer<typeof InputSchema>;

// Loose output schema — every per-type field is optional so the JSON
// schema we send to Gemini stays small and the model doesn't fail
// because of irrelevant required fields. Per-type validation happens
// post-receive in `cleanQuestion`.
const GeneratedQuestionSchema = z.object({
	type: QuestionTypeEnum,
	text: z.string(),
	explanation: z.string().optional(),

	// multiple-choice
	options: z.array(z.string()).optional(),
	correctOption: z.number().int().optional(),

	// true-false
	isTrue: z.boolean().optional(),

	// gap-fill — gaps are the correct words, in order
	gaps: z.array(z.string()).optional(),
	distractors: z.array(z.string()).optional(),

	// matching
	leftItems: z.array(z.string()).optional(),
	rightItems: z.array(z.string()).optional(),
	correctMatches: z.array(z.number().int()).optional(),

	// reordering
	items: z.array(z.string()).optional(),
	correctOrder: z.array(z.number().int()).optional(),
	isGap: z.array(z.boolean()).optional(),
});
type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;

const OutputSchema = z.object({
	title: z.string(),
	description: z.string().optional(),
	questions: z.array(GeneratedQuestionSchema).min(1),
});

// Mirrors src/lib/firebase/teachers.ts's canCreateAITest but reads
// directly from Firestore via the Admin SDK. Re-implemented here so the
// Function doesn't depend on client-only code.
const AI_TESTS_PER_MONTH_BASIC = 1;
async function canCreateAITest(teacherId: string): Promise<boolean> {
	const teacherSnap = await db.collection("teachers").doc(teacherId).get();
	if (!teacherSnap.exists) return false;
	const data = teacherSnap.data() ?? {};
	if (data.isPremium || data.isBetaTester) return true;
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - 30);
	const q = await db
		.collection("tests")
		.where("teacherId", "==", teacherId)
		.where("createdAt", ">=", cutoff)
		.get();
	const aiCount = q.docs.filter((d) => d.data().isAIGenerated === true).length;
	return aiCount < AI_TESTS_PER_MONTH_BASIC;
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Compute character offsets for each gap word inside the question text,
// matching what GapFillEditor stores. Uses first non-overlapping match
// per gap word; gap words that can't be located in the text are dropped
// (along with their entry in the gaps array, to keep them aligned).
function buildGapPositions(
	text: string,
	gaps: string[]
): { gaps: string[]; gapPositions: { start: number; end: number }[] } {
	const positions: { start: number; end: number }[] = [];
	const keptGaps: string[] = [];
	for (const g of gaps) {
		if (typeof g !== "string" || !g.trim()) continue;
		const rx = new RegExp(escapeRegExp(g.trim()), "i");
		// Search from cursor that's after the last placed gap end.
		let searchFrom = 0;
		for (const pos of positions) searchFrom = Math.max(searchFrom, pos.end);
		const slice = text.slice(searchFrom);
		const m = slice.match(rx);
		if (!m || m.index === undefined) continue;
		const start = searchFrom + m.index;
		const end = start + m[0].length;
		positions.push({ start, end });
		keptGaps.push(g.trim());
	}
	return { gaps: keptGaps, gapPositions: positions };
}

function isPermutation(arr: number[], n: number): boolean {
	if (arr.length !== n) return false;
	const seen = new Set<number>();
	for (const v of arr) {
		if (!Number.isInteger(v) || v < 0 || v >= n) return false;
		if (seen.has(v)) return false;
		seen.add(v);
	}
	return true;
}

/**
 * Validate and shape a single generated question into the form
 * createTest() expects. Returns null if the question is malformed
 * enough to be unsalvageable — the caller drops it.
 */
function cleanQuestion(raw: GeneratedQuestion): any | null {
	if (!raw.text || typeof raw.text !== "string") return null;
	const base = {
		type: raw.type,
		text: raw.text.trim(),
		...(raw.explanation ? { explanation: raw.explanation.trim() } : {}),
	};

	switch (raw.type) {
		case "multiple-choice": {
			const options = (raw.options ?? [])
				.filter((o) => typeof o === "string" && o.trim())
				.map((o) => o.trim());
			if (options.length < 2 || options.length > 4) return null;
			const correct =
				typeof raw.correctOption === "number" ? raw.correctOption : -1;
			if (!Number.isInteger(correct) || correct < 0 || correct >= options.length)
				return null;
			return { ...base, options, correctOption: correct };
		}

		case "true-false": {
			if (typeof raw.isTrue !== "boolean") return null;
			return { ...base, isTrue: raw.isTrue };
		}

		case "gap-fill": {
			const gaps = (raw.gaps ?? [])
				.filter((g) => typeof g === "string" && g.trim())
				.map((g) => g.trim());
			if (gaps.length === 0) return null;
			const { gaps: kept, gapPositions } = buildGapPositions(base.text, gaps);
			if (kept.length === 0) return null;
			const distractors = (raw.distractors ?? [])
				.filter((d) => typeof d === "string" && d.trim())
				.map((d) => d.trim());
			return {
				...base,
				gaps: kept,
				gapPositions,
				...(distractors.length > 0 ? { distractors } : {}),
			};
		}

		case "matching": {
			const left = (raw.leftItems ?? [])
				.filter((s) => typeof s === "string" && s.trim())
				.map((s) => s.trim());
			const right = (raw.rightItems ?? [])
				.filter((s) => typeof s === "string" && s.trim())
				.map((s) => s.trim());
			if (left.length < 2 || left.length > 6) return null;
			if (right.length < left.length) return null;
			const matches = raw.correctMatches ?? [];
			if (matches.length !== left.length) return null;
			for (const m of matches) {
				if (!Number.isInteger(m) || m < 0 || m >= right.length) return null;
			}
			const distractors = (raw.distractors ?? [])
				.filter((d) => typeof d === "string" && d.trim())
				.map((d) => d.trim());
			return {
				...base,
				leftItems: left,
				rightItems: right,
				correctMatches: matches,
				...(distractors.length > 0 ? { distractors } : {}),
			};
		}

		case "reordering-horizontal":
		case "reordering-vertical": {
			const items = (raw.items ?? [])
				.filter((s) => typeof s === "string" && s.trim())
				.map((s) => s.trim());
			if (items.length < 2 || items.length > 8) return null;
			const correctOrder =
				Array.isArray(raw.correctOrder) && raw.correctOrder.length === items.length
					? raw.correctOrder
					: items.map((_, i) => i);
			if (!isPermutation(correctOrder, items.length)) return null;
			const isGap =
				Array.isArray(raw.isGap) && raw.isGap.length === items.length
					? raw.isGap.map((b) => !!b)
					: items.map(() => false);
			const distractors = (raw.distractors ?? [])
				.filter((d) => typeof d === "string" && d.trim())
				.map((d) => d.trim());
			return {
				...base,
				items,
				correctOrder,
				isGap,
				...(distractors.length > 0 ? { distractors } : {}),
			};
		}
	}
	return null;
}

function typeLabel(t: string): string {
	switch (t) {
		case "multiple-choice":
			return "Multiple Choice";
		case "true-false":
			return "Wahr/Falsch";
		case "gap-fill":
			return "Lückentext";
		case "matching":
			return "Zuordnung";
		case "reordering-horizontal":
			return "Horizontale Reihenfolge";
		case "reordering-vertical":
			return "Vertikale Reihenfolge";
	}
	return t;
}

function buildPrompt(input: InputType): string {
	const typeList = input.allowedTypes
		.map((t) => `- ${t} (${typeLabel(t)})`)
		.join("\n");
	const sourceBlock = input.sourceText
		? `\n\nQuelltext, auf den die Aufgaben sich beziehen sollen (auf Deutsch oder in der Zielsprache; verwende ihn als Grundlage, zitiere nicht wörtlich, sondern stelle Verständnisfragen):\n---\n${input.sourceText.slice(0, 28000)}\n---`
		: "";
	return `Du erstellst ${input.count} Aufgaben für einen Sprachtest auf Niveau ${input.cefrLevel} in der Sprache ${input.language}.

Verwende ausschließlich diese Aufgabentypen (in der Antwort exakt diese Werte für das Feld "type"):
${typeList}

Mische die Typen, wenn mehrere erlaubt sind. Lass die Antworten NICHT im Aufgabentext durchscheinen.

Schema-Hinweise je Typ:
- multiple-choice: text + options (2–4 Strings) + correctOption (0-basierter Index in options).
- true-false: text + isTrue (Boolean).
- gap-fill: text als Fließtext, in dem die Lückenwörter ENTHALTEN sind. gaps[] ist die Liste der korrekten Wörter in der Reihenfolge, in der sie im Text auftauchen. Optional distractors[] für falsche Wortbank-Einträge.
- matching: leftItems[] + rightItems[] (gleich lang) + correctMatches[] (für jedes leftItem den Index des passenden rightItem). Optional distractors[] für zusätzliche, irrelevante Einträge in der rechten Spalte.
- reordering-horizontal / reordering-vertical: items[] in korrekter Reihenfolge, correctOrder = [0,1,2,...] (Identität). Optional isGap[] gleiche Länge: true für Items, die der Schüler eintippen soll. Optional distractors[] für Wortschatz-Einträge.

Anweisung der Lehrkraft: ${input.prompt}${sourceBlock}

Gib zusätzlich einen passenden Test-Titel und eine kurze Beschreibung zurück. Antworte ausschließlich mit gültigem JSON, das dem Output-Schema entspricht.`;
}

export const generateTestQuestions = onCall(
	{ secrets: [GEMINI_API_KEY], region: "europe-west1", timeoutSeconds: 120 },
	async (request) => {
		if (!request.auth) {
			throw new HttpsError("unauthenticated", "Sign in required.");
		}
		const teacherId = request.auth.uid;

		const parsed = InputSchema.safeParse(request.data);
		if (!parsed.success) {
			throw new HttpsError("invalid-argument", parsed.error.message);
		}
		const input = parsed.data;

		const allowed = await canCreateAITest(teacherId);
		if (!allowed) {
			throw new HttpsError(
				"resource-exhausted",
				"Das monatliche Limit für KI-Tests ist erreicht. Mit Premium sind unbegrenzte KI-Tests möglich."
			);
		}

		const ai = buildAi(GEMINI_API_KEY.value());
		const prompt = ai.definePrompt({
			name: "generateTestQuestions",
			input: { schema: InputSchema },
			output: { schema: OutputSchema, format: "json" },
			prompt: buildPrompt(input),
		});

		let output: z.infer<typeof OutputSchema> | undefined;
		try {
			const res = await prompt(input);
			output = res.output as z.infer<typeof OutputSchema> | undefined;
		} catch (err) {
			console.error("Gemini call failed", err);
			throw new HttpsError(
				"internal",
				"KI-Anfrage fehlgeschlagen. Bitte erneut versuchen."
			);
		}
		if (!output) {
			throw new HttpsError("internal", "Die KI hat keine Antwort geliefert.");
		}

		const cleaned = output.questions
			.map(cleanQuestion)
			.filter((q): q is NonNullable<typeof q> => q !== null);

		if (cleaned.length === 0) {
			throw new HttpsError(
				"internal",
				"Die KI-Antwort enthielt keine gültigen Aufgaben."
			);
		}

		return {
			title: output.title?.trim() || "KI-generierter Test",
			description: output.description?.trim() || "",
			questions: cleaned,
		};
	}
);
