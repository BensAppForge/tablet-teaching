import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { z } from "zod";
import { buildAi } from "./ai";
import { enforceRateLimit } from "./rateLimit";

// Per-user cap for the (Gemini-billed) explainAnswer callable.
const EXPLAIN_LIMIT = 40;
const EXPLAIN_WINDOW_SECONDS = 60 * 60; // 1 hour

export {
	bulkImportStudents,
	updateStudent,
	deleteStudent,
	resetStudentPassword,
} from "./students";
export { deleteClass } from "./classes";
export { deleteAccount } from "./deleteAccount";
export { cleanupQuickAttempts, cleanupQuickSubmissions } from "./quickAccess";
export { generateTestQuestions } from "./aiTestGen";
export { gradeSubmission } from "./grading";

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const ExplainInputSchema = z.object({
	question: z.string().min(1).max(2000),
	studentAnswer: z.string().max(2000),
	correctAnswer: z.string().max(2000),
	explanation: z.string().max(2000),
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
		// Anonymous (Schnellzugang) callers are rejected: their worksheet
		// review is local-only and they're unauthenticated humans, so this
		// Gemini-billed callable stays for managed students/teachers.
		if (request.auth.token.firebase?.sign_in_provider === "anonymous") {
			throw new HttpsError(
				"permission-denied",
				"Diese Funktion steht für den Schnellzugang nicht zur Verfügung."
			);
		}

		const input = ExplainInputSchema.safeParse(request.data);
		if (!input.success) {
			throw new HttpsError("invalid-argument", input.error.message);
		}

		// Per-user rate limit (Gemini cost protection).
		await enforceRateLimit({
			key: `explainAnswer:${request.auth.uid}`,
			limit: EXPLAIN_LIMIT,
			windowSeconds: EXPLAIN_WINDOW_SECONDS,
			message:
				"Zu viele Erklärungen in kurzer Zeit. Bitte versuche es später erneut.",
		});

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
