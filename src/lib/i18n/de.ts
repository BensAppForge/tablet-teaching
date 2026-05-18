import type { Strings } from "./types";

export const de: Strings = {
	pdf: {
		documentTitle: "Arbeitsblatt – Ergebnisse",
		student: "Schüler:in",
		class: "Klasse",
		submittedOn: "Abgegeben am",
		totalScore: "Gesamtergebnis",
		points: "Punkte",
		question: "Aufgabe",
		yourAnswer: "Deine Antwort",
		correctAnswer: "Richtig",
		notAnswered: "—",
		correct: "richtig",
		wrong: "falsch",
		yourOrder: "Deine Reihenfolge",
		correctOrder: "Richtige Reihenfolge",
		gap: "Lücke",
		wordBank: "Wortschatz",
		trueLabel: "Wahr",
		falseLabel: "Falsch",
		matchedWith: "→",
		downloadButton: "PDF herunterladen",
		generating: "Erstelle PDF…",
		generationFailed: "PDF konnte nicht erstellt werden",
		questionType: {
			"multiple-choice": "Multiple Choice",
			"true-false": "Wahr / Falsch",
			"gap-fill": "Lückentext",
			matching: "Zuordnung",
			"reordering-horizontal": "Horizontale Reihenfolge",
			"reordering-vertical": "Vertikale Reihenfolge",
		},
	},
	worksheet: {
		fallback: {
			questionMissing: "(Frage ohne Text)",
			statementMissing: "(Aussage ohne Text)",
		},
		gapFillHeader: "Lückentext",
		wordBank: "Wortschatz:",
		correctAnswerInline: "richtig",
		trueLabel: "Wahr",
		falseLabel: "Falsch",
		hint: {
			matching:
				"Tippe einen Punkt links und dann einen Punkt rechts, um sie zu verbinden. Tippe erneut, um die Verbindung zu lösen.",
			horizontalReordering: "Ziehe die Wörter in die richtige Reihenfolge.",
			verticalReordering: "Ziehe die Elemente in die richtige Reihenfolge.",
		},
		defaultQuestion: {
			matching: "Ordne die passenden Paare zu.",
			horizontalReordering: "Bringe die Wörter in die richtige Reihenfolge.",
			verticalReordering: "Bringe die Schritte in die richtige Reihenfolge.",
		},
	},
};

// Backwards-compatible alias for code that imported `t` from this module
// before the multi-locale refactor.
export const t = de;
