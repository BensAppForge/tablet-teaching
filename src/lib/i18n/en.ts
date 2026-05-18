import type { Strings } from "./types";

export const en: Strings = {
	pdf: {
		documentTitle: "Worksheet — Results",
		student: "Student",
		class: "Class",
		submittedOn: "Submitted on",
		totalScore: "Total score",
		points: "points",
		question: "Question",
		yourAnswer: "Your answer",
		correctAnswer: "Correct",
		notAnswered: "—",
		correct: "correct",
		wrong: "incorrect",
		yourOrder: "Your order",
		correctOrder: "Correct order",
		gap: "Gap",
		wordBank: "Word bank",
		trueLabel: "True",
		falseLabel: "False",
		matchedWith: "→",
		downloadButton: "Download PDF",
		generating: "Generating PDF…",
		generationFailed: "Could not generate PDF",
		questionType: {
			"multiple-choice": "Multiple choice",
			"true-false": "True / False",
			"gap-fill": "Fill in the blanks",
			matching: "Matching",
			"reordering-horizontal": "Horizontal reordering",
			"reordering-vertical": "Vertical reordering",
		},
	},
	worksheet: {
		fallback: {
			questionMissing: "(Question text missing)",
			statementMissing: "(Statement text missing)",
		},
		gapFillHeader: "Fill in the blanks",
		wordBank: "Word bank:",
		correctAnswerInline: "correct",
		trueLabel: "True",
		falseLabel: "False",
		hint: {
			matching:
				"Tap a dot on the left, then a dot on the right to connect them. Tap again to undo.",
			horizontalReordering: "Drag the words into the correct order.",
			verticalReordering: "Drag the items into the correct order.",
		},
		defaultQuestion: {
			matching: "Match the pairs.",
			horizontalReordering: "Put the words in the correct order.",
			verticalReordering: "Put the steps in the correct order.",
		},
	},
};
