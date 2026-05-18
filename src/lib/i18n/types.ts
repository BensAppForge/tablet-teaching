// Shape of the locale-specific strings used by the student worksheet
// and the results PDF. App-chrome strings (dashboard, header, login) stay
// hardcoded German for v1 — the locale-aware bits are those that should
// follow the test's target language for immersion.

export type Locale = "de" | "en" | "fr" | "es" | "it";

export interface PdfStrings {
	documentTitle: string;
	student: string;
	class: string;
	submittedOn: string;
	totalScore: string;
	points: string;
	question: string;
	yourAnswer: string;
	correctAnswer: string;
	notAnswered: string;
	correct: string;
	wrong: string;
	yourOrder: string;
	correctOrder: string;
	gap: string;
	wordBank: string;
	trueLabel: string;
	falseLabel: string;
	matchedWith: string;
	downloadButton: string;
	generating: string;
	generationFailed: string;
	questionType: Record<string, string>;
}

export interface WorksheetStrings {
	fallback: {
		questionMissing: string;
		statementMissing: string;
	};
	gapFillHeader: string;
	wordBank: string;
	correctAnswerInline: string;
	trueLabel: string;
	falseLabel: string;
	hint: {
		matching: string;
		horizontalReordering: string;
		verticalReordering: string;
	};
	defaultQuestion: {
		matching: string;
		horizontalReordering: string;
		verticalReordering: string;
	};
}

export interface Strings {
	pdf: PdfStrings;
	worksheet: WorksheetStrings;
}
