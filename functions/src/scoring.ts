// Authoritative server-side grading. Ported verbatim (same rules, same
// normalisation) from the client grader at src/lib/student/scoring.ts so a
// student can't forge a score — the persisted submission is graded here from
// the server-held questions (which include the correct answers). The client
// still grades locally for instant review display, but only THIS result is
// written to Firestore.
//
// Keep this in lockstep with src/lib/student/scoring.ts: if the grading rule
// for a question type changes in one, change it in the other (otherwise the
// score the kid sees and the score the teacher sees diverge).

export type QuestionType =
	| "multiple-choice"
	| "true-false"
	| "gap-fill"
	| "matching"
	| "reordering-horizontal"
	| "reordering-vertical";

// Loose shape covering every question type's gradable fields. Mirrors the
// Firestore question doc (fields absent for irrelevant types).
export interface GradableQuestion {
	id?: string;
	type: QuestionType;
	points?: number;
	options?: string[];
	correctOption?: number;
	isTrue?: boolean;
	gaps?: string[];
	correctMatches?: number[];
	correctOrder?: number[];
	isGap?: boolean[];
	items?: string[];
}

export interface QuestionGrade {
	correct: boolean;
	earned: number;
	max: number;
}

// Normalise free-text answers for case-/whitespace-insensitive comparison.
// Same layered defences as the client: NFC compose, strip zero-width/BOM,
// fold non-breaking spaces, collapse whitespace, German-locale case-fold.
const norm = (s: unknown): string => {
	if (typeof s !== "string") return "";
	return s
		.normalize("NFC")
		.replace(/[​-‍﻿]/g, "")
		.replace(/[  ]/g, " ")
		.trim()
		.replace(/\s+/g, " ")
		.toLocaleLowerCase("de-DE");
};

function maxPoints(q: GradableQuestion): number {
	return typeof q.points === "number" && q.points > 0 ? q.points : 1;
}

export function gradeQuestion(
	q: GradableQuestion,
	answer: unknown
): QuestionGrade {
	const max = maxPoints(q);

	switch (q.type) {
		case "multiple-choice": {
			const a = (answer as { selectedOption?: number | null } | undefined)
				?.selectedOption ?? null;
			const correct = a !== null && a === q.correctOption;
			return { correct, earned: correct ? max : 0, max };
		}

		case "true-false": {
			const a = (answer as { selected?: boolean | null } | undefined)
				?.selected ?? null;
			const correct = a !== null && a === q.isTrue;
			return { correct, earned: correct ? max : 0, max };
		}

		case "gap-fill": {
			const answers =
				(answer as { answers?: string[] } | undefined)?.answers ?? [];
			const gaps = q.gaps ?? [];
			const total = gaps.length;
			if (total === 0) return { correct: true, earned: max, max };
			let hits = 0;
			gaps.forEach((expected, i) => {
				if (norm(answers[i]) && norm(answers[i]) === norm(expected)) hits++;
			});
			const ratio = hits / total;
			return {
				correct: hits === total,
				earned: Math.round(max * ratio * 100) / 100,
				max,
			};
		}

		case "matching": {
			const conns =
				(answer as { connections?: number[] } | undefined)?.connections ?? [];
			const correctMatches = q.correctMatches ?? [];
			const total = correctMatches.length;
			if (total === 0) return { correct: true, earned: max, max };
			let hits = 0;
			correctMatches.forEach((expected, i) => {
				if (conns[i] === expected) hits++;
			});
			const ratio = hits / total;
			return {
				correct: hits === total,
				earned: Math.round(max * ratio * 100) / 100,
				max,
			};
		}

		case "reordering-horizontal":
		case "reordering-vertical": {
			const a =
				(answer as
					| { order?: number[]; gapTexts?: Record<number, string> }
					| undefined) ?? {};
			// Grade the VISIBLE word sequence, not the hidden item indices:
			// gap slots render as identical empty boxes, so which underlying
			// item a student dragged where is invisible to them (and random
			// from the initial shuffle). Two students with the same words in
			// the same positions must get the same grade — compare the text
			// shown/typed at each position against the text expected there.
			const items = q.items ?? [];
			const order = a.order ?? [];
			const correctOrder =
				q.correctOrder && q.correctOrder.length === items.length
					? q.correctOrder
					: items.map((_, i) => i);
			const isGapArr = q.isGap ?? [];
			const correct =
				order.length === items.length &&
				order.every((origIndex, pos) => {
					const shown = isGapArr[origIndex]
						? a.gapTexts?.[origIndex]
						: items[origIndex];
					return norm(shown) === norm(items[correctOrder[pos]] ?? "");
				});
			return { correct, earned: correct ? max : 0, max };
		}
	}
	return { correct: false, earned: 0, max };
}

export function gradeAll(
	questions: GradableQuestion[],
	answers: Record<string, unknown>
): {
	totalEarned: number;
	totalPossible: number;
	perQuestion: Record<string, QuestionGrade>;
} {
	let totalEarned = 0;
	let totalPossible = 0;
	const perQuestion: Record<string, QuestionGrade> = {};
	questions.forEach((q) => {
		const id = q.id ?? "";
		const grade = gradeQuestion(q, answers[id]);
		perQuestion[id] = grade;
		totalEarned += grade.earned;
		totalPossible += grade.max;
	});
	return { totalEarned, totalPossible, perQuestion };
}
