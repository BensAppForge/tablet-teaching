import type { Strings } from "./types";

export const fr: Strings = {
	pdf: {
		documentTitle: "Feuille de travail — Résultats",
		student: "Élève",
		class: "Classe",
		submittedOn: "Remis le",
		totalScore: "Score total",
		points: "points",
		question: "Question",
		yourAnswer: "Ta réponse",
		correctAnswer: "Correct",
		notAnswered: "—",
		correct: "correct",
		wrong: "incorrect",
		yourOrder: "Ton ordre",
		correctOrder: "Ordre correct",
		gap: "Lacune",
		wordBank: "Vocabulaire",
		trueLabel: "Vrai",
		falseLabel: "Faux",
		matchedWith: "→",
		downloadButton: "Télécharger le PDF",
		generating: "Génération du PDF…",
		generationFailed: "Impossible de générer le PDF",
		questionType: {
			"multiple-choice": "Choix multiple",
			"true-false": "Vrai / Faux",
			"gap-fill": "Texte à trous",
			matching: "Appariement",
			"reordering-horizontal": "Remettre en ordre (horizontal)",
			"reordering-vertical": "Remettre en ordre (vertical)",
		},
	},
	worksheet: {
		fallback: {
			questionMissing: "(Texte de la question manquant)",
			statementMissing: "(Texte de l'affirmation manquant)",
		},
		gapFillHeader: "Texte à trous",
		wordBank: "Vocabulaire :",
		correctAnswerInline: "correct",
		trueLabel: "Vrai",
		falseLabel: "Faux",
		hint: {
			matching:
				"Touche un point à gauche, puis un point à droite pour les relier. Touche à nouveau pour annuler.",
			horizontalReordering: "Fais glisser les mots dans le bon ordre.",
			verticalReordering: "Fais glisser les éléments dans le bon ordre.",
		},
		defaultQuestion: {
			matching: "Associe les paires.",
			horizontalReordering: "Mets les mots dans le bon ordre.",
			verticalReordering: "Mets les étapes dans le bon ordre.",
		},
	},
};
