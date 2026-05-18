import type { Strings } from "./types";

export const es: Strings = {
	pdf: {
		documentTitle: "Hoja de trabajo — Resultados",
		student: "Estudiante",
		class: "Clase",
		submittedOn: "Entregado el",
		totalScore: "Puntuación total",
		points: "puntos",
		question: "Pregunta",
		yourAnswer: "Tu respuesta",
		correctAnswer: "Correcto",
		notAnswered: "—",
		correct: "correcto",
		wrong: "incorrecto",
		yourOrder: "Tu orden",
		correctOrder: "Orden correcto",
		gap: "Hueco",
		wordBank: "Vocabulario",
		trueLabel: "Verdadero",
		falseLabel: "Falso",
		matchedWith: "→",
		downloadButton: "Descargar PDF",
		generating: "Generando PDF…",
		generationFailed: "No se pudo generar el PDF",
		questionType: {
			"multiple-choice": "Opción múltiple",
			"true-false": "Verdadero / Falso",
			"gap-fill": "Rellenar huecos",
			matching: "Emparejar",
			"reordering-horizontal": "Ordenar (horizontal)",
			"reordering-vertical": "Ordenar (vertical)",
		},
	},
	worksheet: {
		fallback: {
			questionMissing: "(Falta el texto de la pregunta)",
			statementMissing: "(Falta el texto de la afirmación)",
		},
		gapFillHeader: "Rellenar huecos",
		wordBank: "Vocabulario:",
		correctAnswerInline: "correcto",
		trueLabel: "Verdadero",
		falseLabel: "Falso",
		hint: {
			matching:
				"Toca un punto a la izquierda y luego uno a la derecha para conectarlos. Toca de nuevo para deshacer.",
			horizontalReordering: "Arrastra las palabras al orden correcto.",
			verticalReordering: "Arrastra los elementos al orden correcto.",
		},
		defaultQuestion: {
			matching: "Empareja los elementos.",
			horizontalReordering: "Pon las palabras en el orden correcto.",
			verticalReordering: "Pon los pasos en el orden correcto.",
		},
	},
};
