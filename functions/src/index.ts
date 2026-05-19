import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { z } from "zod";
import { buildAi } from "./ai";

export {
	bulkImportStudents,
	updateStudent,
	deleteStudent,
} from "./students";
export { deleteClass } from "./classes";
export { cleanupQuickAttempts } from "./quickAccess";

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const QuestionTypeEnum = z.enum([
	"multiple-choice",
	"true-false",
	"gap-fill",
	"matching",
	"reordering-horizontal",
	"reordering-vertical",
]);

const GeneratedQuestionSchema = z.object({
	type: QuestionTypeEnum,
	question: z.string(),
	answers: z.array(z.string()),
	correctAnswer: z.union([z.string(), z.array(z.string())]),
	explanation: z.string().optional(),
});

const GenerateInputSchema = z.object({
	prompt: z.string().min(1).max(4000),
});

const GenerateOutputSchema = z.object({
	questions: z.array(GeneratedQuestionSchema),
});

const ExplainInputSchema = z.object({
	question: z.string(),
	studentAnswer: z.string(),
	correctAnswer: z.string(),
	explanation: z.string(),
});

const ExplainOutputSchema = z.object({
	explanationForStudent: z.string(),
});

export const generateTestQuestions = onCall(
	{ secrets: [GEMINI_API_KEY], region: "europe-west1" },
	async (request) => {
		if (!request.auth) {
			throw new HttpsError("unauthenticated", "Sign in required.");
		}

		const input = GenerateInputSchema.safeParse(request.data);
		if (!input.success) {
			throw new HttpsError("invalid-argument", input.error.message);
		}

		const ai = buildAi(GEMINI_API_KEY.value());

		const prompt = ai.definePrompt({
			name: "generateTestQuestionsPrompt",
			input: { schema: GenerateInputSchema },
			output: { schema: GenerateOutputSchema },
			prompt: `You generate language-learning test questions for teachers as JSON.

Each question must use one of these types (use the hyphenated values exactly):
multiple-choice, true-false, gap-fill, matching, reordering-horizontal, reordering-vertical.

Each question object has:
- type (string, one of the values above)
- question (string)
- answers (array of strings)
- correctAnswer (string or array of strings)
- explanation (optional string)

Generate questions that are accurate and appropriate for the target audience.

Prompt: {{{prompt}}}`,
		});

		try {
			const { output } = await prompt(input.data);
			return output;
		} catch (err) {
			console.error("generateTestQuestions failed", err);
			throw new HttpsError("internal", "Failed to generate questions.");
		}
	}
);

export const explainAnswer = onCall(
	{ secrets: [GEMINI_API_KEY], region: "europe-west1" },
	async (request) => {
		if (!request.auth) {
			throw new HttpsError("unauthenticated", "Sign in required.");
		}

		const input = ExplainInputSchema.safeParse(request.data);
		if (!input.success) {
			throw new HttpsError("invalid-argument", input.error.message);
		}

		const ai = buildAi(GEMINI_API_KEY.value());

		const prompt = ai.definePrompt({
			name: "explainAnswerPrompt",
			input: { schema: ExplainInputSchema },
			output: { schema: ExplainOutputSchema },
			prompt: `You are a tutor explaining the correct answer to a student.

Question: {{{question}}}
Student's Answer: {{{studentAnswer}}}
Correct Answer: {{{correctAnswer}}}
Explanation: {{{explanation}}}

Explain to the student why their answer was wrong and why the correct answer is correct. Be friendly and encouraging.`,
		});

		try {
			const { output } = await prompt(input.data);
			return output;
		} catch (err) {
			console.error("explainAnswer failed", err);
			throw new HttpsError("internal", "Failed to generate explanation.");
		}
	}
);
