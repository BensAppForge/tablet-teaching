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
export { generateTestQuestions } from "./aiTestGen";

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const ExplainInputSchema = z.object({
	question: z.string(),
	studentAnswer: z.string(),
	correctAnswer: z.string(),
	explanation: z.string(),
});

const ExplainOutputSchema = z.object({
	explanationForStudent: z.string(),
});

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
