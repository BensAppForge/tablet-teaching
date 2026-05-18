import type { Strings } from "./types";

export const it: Strings = {
	pdf: {
		documentTitle: "Scheda di lavoro — Risultati",
		student: "Studente",
		class: "Classe",
		submittedOn: "Consegnato il",
		totalScore: "Punteggio totale",
		points: "punti",
		question: "Domanda",
		yourAnswer: "La tua risposta",
		correctAnswer: "Corretto",
		notAnswered: "—",
		correct: "corretto",
		wrong: "sbagliato",
		yourOrder: "Il tuo ordine",
		correctOrder: "Ordine corretto",
		gap: "Spazio",
		wordBank: "Vocabolario",
		trueLabel: "Vero",
		falseLabel: "Falso",
		matchedWith: "→",
		downloadButton: "Scarica PDF",
		generating: "Creazione PDF…",
		generationFailed: "Impossibile creare il PDF",
		questionType: {
			"multiple-choice": "Scelta multipla",
			"true-false": "Vero / Falso",
			"gap-fill": "Testo a riempimento",
			matching: "Abbinamento",
			"reordering-horizontal": "Riordino (orizzontale)",
			"reordering-vertical": "Riordino (verticale)",
		},
	},
	worksheet: {
		fallback: {
			questionMissing: "(Testo della domanda mancante)",
			statementMissing: "(Testo dell'affermazione mancante)",
		},
		gapFillHeader: "Testo a riempimento",
		wordBank: "Vocabolario:",
		correctAnswerInline: "corretto",
		trueLabel: "Vero",
		falseLabel: "Falso",
		hint: {
			matching:
				"Tocca un punto a sinistra, poi un punto a destra per collegarli. Tocca di nuovo per annullare.",
			horizontalReordering: "Trascina le parole nell'ordine corretto.",
			verticalReordering: "Trascina gli elementi nell'ordine corretto.",
		},
		defaultQuestion: {
			matching: "Abbina le coppie.",
			horizontalReordering: "Metti le parole nell'ordine corretto.",
			verticalReordering: "Metti i passaggi nell'ordine corretto.",
		},
	},
};
