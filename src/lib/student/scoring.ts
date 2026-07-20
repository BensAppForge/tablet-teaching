// Pure scoring functions per question type. Run on the client for v1;
// see TODO.md for the v2 plan to move grading into a Cloud Function so
// correct answers never leave the server.

import {
	GapFillQuestion,
	MatchingQuestion,
	MultipleChoiceQuestion,
	Question,
	ReorderingQuestion,
	TrueFalseQuestion,
} from "@/lib/firebase/tests";

export interface MCAnswer {
	selectedOption: number | null;
}
export interface TFAnswer {
	selected: boolean | null;
}
export interface GapAnswer {
	answers: string[];
}
// connections[i] = the original-right-array index the student joined to
// left[i]. -1 means not connected. Distractor connections are encoded as
// (rightItems.length + distractorIndex) so they're guaranteed never to
// match correctMatches.
export interface MatchingAnswer {
	connections: number[];
}
// order[i] = the original-item-array index at display position i.
// gapTexts[origIndex] = what the student typed into a gap item slot.
export interface ReorderingAnswer {
	order: number[];
	gapTexts: Record<number, string>;
}

export type AnyAnswer =
	| MCAnswer
	| TFAnswer
	| GapAnswer
	| MatchingAnswer
	| ReorderingAnswer;

export interface QuestionGrade {
	correct: boolean; // fully correct (used for the ✓/✗ glyph)
	earned: number; // points actually earned (supports partial credit)
	max: number; // points possible
}

// Normalise free-text answers for case-/whitespace-insensitive comparison.
// Layered defences against the kind of invisible drift that makes "looks
// identical" answers compare unequal:
//   - NFC composes precomposed forms (é = U+00E9, not e + U+0301).
//   - Zero-width and BOM chars stripped (sometimes pasted in from PDFs).
//   - Non-breaking / narrow non-breaking spaces folded to a regular space.
//   - Collapsed runs of whitespace.
//   - Case-folded with the German locale.
export const norm = (s: unknown): string => {
	if (typeof s !== "string") return "";
	return s
		.normalize("NFC")
		.replace(/[​-‍﻿]/g, "")
		.replace(/[  ]/g, " ")
		.trim()
		.replace(/\s+/g, " ")
		.toLocaleLowerCase("de-DE");
};

function maxPoints(q: Question): number {
	return typeof q.points === "number" && q.points > 0 ? q.points : 1;
}

export function gradeQuestion(q: Question, answer: unknown): QuestionGrade {
	const max = maxPoints(q);

	switch (q.type) {
		case "multiple-choice": {
			const mc = q as MultipleChoiceQuestion;
			const a = (answer as MCAnswer | undefined)?.selectedOption ?? null;
			const correct = a !== null && a === mc.correctOption;
			return { correct, earned: correct ? max : 0, max };
		}

		case "true-false": {
			const tf = q as TrueFalseQuestion;
			const a = (answer as TFAnswer | undefined)?.selected ?? null;
			const correct = a !== null && a === tf.isTrue;
			return { correct, earned: correct ? max : 0, max };
		}

		case "gap-fill": {
			const gf = q as GapFillQuestion;
			const answers = (answer as GapAnswer | undefined)?.answers ?? [];
			const total = gf.gaps.length;
			if (total === 0) return { correct: true, earned: max, max };
			let hits = 0;
			gf.gaps.forEach((expected, i) => {
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
			const m = q as MatchingQuestion;
			const conns =
				(answer as MatchingAnswer | undefined)?.connections ?? [];
			const total = m.correctMatches.length;
			if (total === 0) return { correct: true, earned: max, max };
			let hits = 0;
			m.correctMatches.forEach((expected, i) => {
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
			const r = q as ReorderingQuestion;
			const a = (answer as ReorderingAnswer | undefined) ?? {
				order: [],
				gapTexts: {},
			};
			// Grade the VISIBLE word sequence, not the hidden item indices:
			// gap slots render as identical empty boxes, so which underlying
			// item a student dragged where is invisible to them (and random
			// from the initial shuffle). Two students with the same words in
			// the same positions must get the same grade — compare the text
			// shown/typed at each position against the text expected there.
			const items = r.items ?? [];
			const order = a.order ?? [];
			const correctOrder =
				r.correctOrder && r.correctOrder.length === items.length
					? r.correctOrder
					: items.map((_, i) => i);
			const isGapArr = r.isGap ?? [];
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
	questions: Question[],
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
