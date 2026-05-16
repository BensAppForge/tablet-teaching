import { httpsCallable } from "firebase/functions";
import { functions } from "./config";

export interface GeneratedQuestion {
	type:
		| "multiple-choice"
		| "true-false"
		| "gap-fill"
		| "matching"
		| "reordering-horizontal"
		| "reordering-vertical";
	question: string;
	answers: string[];
	correctAnswer: string | string[];
	explanation?: string;
}

export interface GenerateTestQuestionsResponse {
	questions: GeneratedQuestion[];
}

export interface ExplainAnswerResponse {
	explanationForStudent: string;
}

const generateTestQuestionsFn = httpsCallable<
	{ prompt: string },
	GenerateTestQuestionsResponse
>(functions, "generateTestQuestions");

const explainAnswerFn = httpsCallable<
	{
		question: string;
		studentAnswer: string;
		correctAnswer: string;
		explanation: string;
	},
	ExplainAnswerResponse
>(functions, "explainAnswer");

export async function generateTestQuestions(prompt: string) {
	const res = await generateTestQuestionsFn({ prompt });
	return res.data;
}

export async function explainAnswer(input: {
	question: string;
	studentAnswer: string;
	correctAnswer: string;
	explanation: string;
}) {
	const res = await explainAnswerFn(input);
	return res.data;
}
