// AI-driven test generation. The callable accepts a free-form prompt
// plus structured constraints (count, language, CEFR, allowed question
// types) and an optional pre-extracted source text. The model is asked
// for structured JSON matching our actual Question schema; we then
// post-process each question (validate per-type required fields,
// compute gap-fill positions, sanity-check reordering correctOrder)
// before returning the cleaned set to the client.

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { z } from "zod";
import mammoth from "mammoth";
import { buildAi } from "./ai";
import { enforceRateLimit } from "./rateLimit";
import { assertAiQuota, consumeAiQuota } from "./aiQuota";

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

// Supported source-document MIME types. PDFs are passed through to
// Gemini natively as a multimodal media part (it parses layout and
// tables itself). DOCX is text-extracted server-side with mammoth and
// merged into the textual source block, because Gemini's document
// support list does not include the OOXML word format.
const PDF_MIME = "application/pdf";
const DOCX_MIME =
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Image MIME types passed straight to Gemini as multimodal media parts —
// it reads the text in the picture itself, so no OCR step is needed.
// Mirrors AI_SOURCE_IMAGE_MIMES on the client.
const IMAGE_MIMES = [
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/heic",
	"image/heif",
] as const;

// Cap the number of images and the combined binary payload so the encoded
// callable request stays under Firebase's ~10 MB request limit even when a
// teacher attaches several screenshots (plus a possible PDF/DOCX).
const MAX_IMAGES = 6;
const MAX_TOTAL_BINARY_BYTES = 7 * 1024 * 1024; // ~9.4 MB base64

const SourceFileSchema = z.object({
	// Optional original filename — kept for logs only.
	name: z.string().max(255).optional(),
	mimeType: z.enum([PDF_MIME, DOCX_MIME]),
	// Plain base64 (no `data:` prefix). Capped below 10 MB even after
	// JSON wrapping; the picker UI rejects larger binary files client-side.
	dataBase64: z.string().max(9_500_000),
});
type SourceFile = z.infer<typeof SourceFileSchema>;

const SourceImageSchema = z.object({
	name: z.string().max(255).optional(),
	mimeType: z.enum(IMAGE_MIMES),
	dataBase64: z.string().max(9_500_000),
});
type SourceImage = z.infer<typeof SourceImageSchema>;

const InputSchema = z.object({
	prompt: z.string().trim().min(3).max(4000),
	// nullish() so the Firebase callable wire format (which can turn
	// `undefined` into `null` on the way over) doesn't break the call
	// when the teacher leaves the source-text field empty.
	sourceText: z.string().trim().max(30000).nullish(),
	sourceFile: SourceFileSchema.nullish(),
	sourceImages: z.array(SourceImageSchema).max(MAX_IMAGES).nullish(),
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
			// Normalise to "items in correct sequence + correctOrder is
			// identity". Gemini frequently emits items in whatever order
			// it generated them with a permuted correctOrder; reorder so
			// the editor always shows the items in the correct sequence
			// without any further migration logic.
			const reorderedItems = correctOrder.map((i) => items[i]);
			const reorderedIsGap = correctOrder.map((i) => isGap[i]);
			return {
				...base,
				items: reorderedItems,
				correctOrder: reorderedItems.map((_, i) => i),
				isGap: reorderedIsGap,
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

function buildPrompt(
	input: InputType,
	effectiveSourceText: string,
	hasPdfAttachment: boolean,
	hasImageAttachment: boolean
): string {
	const typeList = input.allowedTypes
		.map((t) => `- ${t} (${typeLabel(t)})`)
		.join("\n");
	// Four cases for the source block:
	// 1. A PDF and/or images are attached — tell the model to use the
	//    attachment(s) as the primary source. Any pasted text becomes a
	//    secondary hint.
	// 2. No attachment, just text (typed or extracted from DOCX) — old
	//    behavior.
	// 3. Nothing — empty block.
	const trimmedText = effectiveSourceText.trim();
	let sourceBlock = "";
	if (hasPdfAttachment || hasImageAttachment) {
		const what =
			hasPdfAttachment && hasImageAttachment
				? "das BEIGEFÜGTE PDF-DOKUMENT und die BEIGEFÜGTEN BILDER (Screenshots aus Lehrwerken oder digitalen Inhalten)"
				: hasPdfAttachment
				? "das BEIGEFÜGTE PDF-DOKUMENT"
				: "die BEIGEFÜGTEN BILDER (Screenshots aus Lehrwerken oder digitalen Inhalten)";
		sourceBlock = `\n\nDie Aufgaben sollen sich auf ${what} beziehen. Lies den Inhalt — bei Bildern auch den darin enthaltenen Text — aufmerksam und stelle Verständnis-, Wortschatz- und Grammatikfragen auf dessen Grundlage. Zitiere nicht wörtlich, sondern formuliere die Aufgaben so um, dass sie Verständnis prüfen.`;
		if (trimmedText) {
			sourceBlock += `\n\nZusätzlicher Hinweis vom Lehrer:\n---\n${trimmedText.slice(0, 5000)}\n---`;
		}
	} else if (trimmedText) {
		sourceBlock = `\n\nQuelltext, auf den die Aufgaben sich beziehen sollen (auf Deutsch oder in der Zielsprache; verwende ihn als Grundlage, zitiere nicht wörtlich, sondern stelle Verständnisfragen):\n---\n${trimmedText.slice(0, 28000)}\n---`;
	}
	return `Du erstellst ${input.count} Aufgaben für einen Sprachtest auf Niveau ${input.cefrLevel} in der Sprache ${input.language}.

Verwende ausschließlich diese Aufgabentypen (in der Antwort exakt diese Werte für das Feld "type"):
${typeList}

Mische die Typen, wenn mehrere erlaubt sind. Lass die Antworten NICHT im Aufgabentext durchscheinen.

Schema-Hinweise je Typ:
- multiple-choice: text + options (2–4 Strings) + correctOption (0-basierter Index in options).
- true-false: text + isTrue (Boolean).
- gap-fill: text als Fließtext, in dem die Lückenwörter ENTHALTEN sind. gaps[] ist die Liste der korrekten Wörter in der Reihenfolge, in der sie im Text auftauchen. Optional distractors[] für falsche Wortbank-Einträge.
- matching: leftItems[] + rightItems[] (gleich lang) + correctMatches[] (für jedes leftItem den Index des passenden rightItem). Optional distractors[] für zusätzliche, irrelevante Einträge in der rechten Spalte.
- reordering-horizontal / reordering-vertical: items[] in korrekter Reihenfolge, correctOrder = [0,1,2,...] (Identität). Optional isGap[] gleiche Länge: true für Items, die der Schüler eintippen soll. Optional distractors[] für Wortschatz-Einträge. WICHTIG: Wenn items[] gemeinsam einen Satz ergeben, MUSS der Satz vollständig sein — kein Wort und kein Satzzeichen am Ende darf fehlen. Halte die items kurz (idealerweise 1–3 Wörter pro Eintrag), damit die Antwort komplett bleibt.

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

		// Flat per-teacher throttle — applies to ALL tiers (including
		// premium/beta) purely as cost/abuse protection on the most
		// expensive callable in the system. Independent of the monthly
		// plan quota below.
		await enforceRateLimit({
			key: `generateTestQuestions:${teacherId}`,
			limit: 20,
			windowSeconds: 3600,
			message:
				"Zu viele KI-Anfragen in kurzer Zeit. Bitte einen Moment warten und erneut versuchen.",
		});

		// Plan quota (basic teachers). Read-only pre-check here; consumed
		// only after a successful generation (below) so a failed Gemini
		// call never burns the allowance.
		const { premium } = await assertAiQuota(teacherId);

		// Guard the combined binary payload (PDF/DOCX + all images) so a
		// teacher attaching several large screenshots can't blow past
		// Firebase's callable request limit. base64 length ≈ 4/3 of bytes.
		const images: SourceImage[] = input.sourceImages ?? [];
		const totalBase64 =
			(input.sourceFile?.dataBase64.length ?? 0) +
			images.reduce((sum, img) => sum + img.dataBase64.length, 0);
		if (totalBase64 > Math.ceil(MAX_TOTAL_BINARY_BYTES * 1.4)) {
			throw new HttpsError(
				"invalid-argument",
				"Die angehängten Dateien sind zusammen zu groß. Bitte weniger oder kleinere Dateien wählen."
			);
		}

		// Build the effective text source by merging any typed source
		// text with text extracted from a DOCX attachment (if present).
		// PDFs and images are NOT extracted server-side — they're attached
		// to the Gemini call as multimodal media parts instead.
		let effectiveSourceText = (input.sourceText ?? "").trim();
		let pdfMediaUrl: string | undefined;
		const file: SourceFile | null | undefined = input.sourceFile ?? undefined;
		if (file) {
			if (file.mimeType === PDF_MIME) {
				pdfMediaUrl = `data:${PDF_MIME};base64,${file.dataBase64}`;
			} else if (file.mimeType === DOCX_MIME) {
				try {
					const buf = Buffer.from(file.dataBase64, "base64");
					const extracted = await mammoth.extractRawText({ buffer: buf });
					const extractedText = (extracted.value ?? "").trim();
					if (extractedText) {
						effectiveSourceText = effectiveSourceText
							? `${effectiveSourceText}\n\n${extractedText}`
							: extractedText;
					}
				} catch (err) {
					logger.error("generateTestQuestions:docx-extract-failed", {
						err: String(err),
						name: file.name,
					});
					throw new HttpsError(
						"invalid-argument",
						"Das DOCX-Dokument konnte nicht gelesen werden."
					);
				}
			}
		}

		const ai = buildAi(GEMINI_API_KEY.value());
		const promptText = buildPrompt(
			input,
			effectiveSourceText,
			!!pdfMediaUrl,
			images.length > 0
		);
		const promptParts: Array<{ text: string } | { media: { url: string; contentType?: string } }> = [
			{ text: promptText },
		];
		if (pdfMediaUrl) {
			promptParts.push({
				media: { url: pdfMediaUrl, contentType: PDF_MIME },
			});
		}
		for (const img of images) {
			promptParts.push({
				media: {
					url: `data:${img.mimeType};base64,${img.dataBase64}`,
					contentType: img.mimeType,
				},
			});
		}

		logger.info("generateTestQuestions:request", {
			teacherId,
			count: input.count,
			language: input.language,
			cefrLevel: input.cefrLevel,
			allowedTypes: input.allowedTypes,
			hasSourceText: effectiveSourceText.length > 0,
			sourceTextLen: effectiveSourceText.length,
			hasSourceFile: !!file,
			sourceFileMime: file?.mimeType,
			sourceFileName: file?.name,
			sourceFileBase64Len: file?.dataBase64.length ?? 0,
			imageCount: images.length,
			imageMimes: images.map((i) => i.mimeType),
			imageBase64Len: images.reduce((s, i) => s + i.dataBase64.length, 0),
		});

		let output: z.infer<typeof OutputSchema> | undefined;
		// `any` because Genkit's response type doesn't surface finishReason
		// on the GenerateResponse generic — we read it best-effort for logs.
		let rawRes: any;
		try {
			rawRes = await ai.generate({
				prompt: promptParts,
				output: { schema: OutputSchema, format: "json" },
				// Gemini 2.5 Flash's default maxOutputTokens (~8k) is not
				// enough headroom for 10–15 questions of structured JSON,
				// which previously caused the last item of a reordering
				// sentence to be truncated mid-word. Bumping this gives the
				// model room to finish even a large batch.
				config: { maxOutputTokens: 32768 },
			});
			output = rawRes.output as z.infer<typeof OutputSchema> | undefined;
		} catch (err) {
			logger.error("generateTestQuestions:gemini-call-failed", { err: String(err) });
			throw new HttpsError(
				"internal",
				"KI-Anfrage fehlgeschlagen. Bitte erneut versuchen."
			);
		}

		// finishReason === "MAX_TOKENS" / "length" is the canonical signal
		// that the model hit the output cap. Genkit exposes it on the top
		// level of GenerateResponse in current versions; fall back to
		// digging into raw candidates if not.
		const finishReason: string | undefined =
			rawRes?.finishReason ??
			rawRes?.custom?.candidates?.[0]?.finishReason ??
			rawRes?.raw?.candidates?.[0]?.finishReason;
		const usage = rawRes?.usage ?? undefined;

		logger.info("generateTestQuestions:response", {
			finishReason,
			usage,
			hasOutput: !!output,
			questionsCount: output?.questions?.length ?? 0,
			title: output?.title,
			// For each reordering question, log items lengths + the last
			// item text. Lets us spot truncation (e.g. last item is one
			// short character) or missing trailing words from the logs.
			reorderingDebug: (output?.questions ?? [])
				.map((q, i) => {
					if (
						q.type !== "reordering-horizontal" &&
						q.type !== "reordering-vertical"
					)
						return null;
					const items = q.items ?? [];
					const joined = items.join(" ");
					return {
						idx: i,
						type: q.type,
						itemsCount: items.length,
						itemLengths: items.map((s) => (s ?? "").length),
						lastItem: items[items.length - 1] ?? null,
						joinedLen: joined.length,
						// Heuristic: a complete sentence usually ends with
						// terminal punctuation. Helps spot truncation at a
						// glance in the log entry.
						joinedEndsWithPunct: /[.!?…)"»\]]\s*$/.test(joined),
					};
				})
				.filter(Boolean),
		});

		if (!output) {
			throw new HttpsError("internal", "Die KI hat keine Antwort geliefert.");
		}

		const cleaned = output.questions
			.map(cleanQuestion)
			.filter((q): q is NonNullable<typeof q> => q !== null);

		if (cleaned.length < output.questions.length) {
			logger.warn("generateTestQuestions:dropped-questions", {
				asked: output.questions.length,
				kept: cleaned.length,
			});
		}

		if (cleaned.length === 0) {
			throw new HttpsError(
				"internal",
				"Die KI-Antwort enthielt keine gültigen Aufgaben."
			);
		}

		// Generation succeeded — record consumption against the monthly
		// quota (no-op for premium/beta). Best-effort: a counter write
		// failure must not fail an otherwise-successful generation.
		try {
			await consumeAiQuota(teacherId, premium);
		} catch (err) {
			logger.error("generateTestQuestions:quota-consume-failed", {
				teacherId,
				err: String(err),
			});
		}

		return {
			title: output.title?.trim() || "KI-generierter Test",
			description: output.description?.trim() || "",
			questions: cleaned,
		};
	}
);
