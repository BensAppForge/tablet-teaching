import { httpsCallable } from "firebase/functions";
import { functions } from "./config";

import type { Question } from "@/lib/firebase/tests";

export type AiQuestionType =
	| "multiple-choice"
	| "true-false"
	| "gap-fill"
	| "matching"
	| "reordering-horizontal"
	| "reordering-vertical";

export interface GenerateTestQuestionsInput {
	prompt: string;
	sourceText?: string;
	language: string;
	cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
	count: number;
	allowedTypes: AiQuestionType[];
}

export interface GenerateTestQuestionsResponse {
	title: string;
	description?: string;
	// Each entry is already shaped like our Question schema, ready to be
	// passed to createTest without further normalisation.
	questions: Question[];
}

export interface ExplainAnswerResponse {
	explanationForStudent: string;
}

const generateTestQuestionsFn = httpsCallable<
	GenerateTestQuestionsInput,
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

export async function generateTestQuestions(
	input: GenerateTestQuestionsInput
): Promise<GenerateTestQuestionsResponse> {
	const res = await generateTestQuestionsFn(input);
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
