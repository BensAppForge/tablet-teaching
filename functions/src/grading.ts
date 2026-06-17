import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { db, FieldValue } from "./admin";
import { gradeAll, GradableQuestion } from "./scoring";

// Authoritative submission grading for managed students. The student sends
// only their raw answers; the server fetches the test's questions (with the
// correct answers), grades them, and writes the submission via the Admin SDK.
// The submissions create rule is locked to `false`, so this is the ONLY way a
// score reaches Firestore — a tampered client can't inflate it.
//
// Schnellzugang (anonymous) results are deliberately NOT handled here: they
// stay client-graded + client-written (short-lived, self-typed, never
// teacher-trusted the same way).

const GradeSubmissionSchema = z.object({
	testId: z.string().min(1),
	// Raw per-question answers keyed by question id. Shapes are validated by
	// the grader (unknown values simply grade as wrong), so we only bound the
	// payload size here.
	answers: z.record(z.string(), z.unknown()),
});

export const gradeSubmission = onCall(
	{ region: "europe-west1" },
	async (request) => {
		if (!request.auth) {
			throw new HttpsError("unauthenticated", "Sign in required.");
		}
		const uid = request.auth.uid;
		const token = request.auth.token;
		if (token.role !== "student") {
			throw new HttpsError(
				"permission-denied",
				"Nur für angemeldete Schüler:innen."
			);
		}
		const classId = token.classId as string | undefined;
		if (!classId) {
			throw new HttpsError("permission-denied", "Keine Klasse zugeordnet.");
		}

		const parsed = GradeSubmissionSchema.safeParse(request.data);
		if (!parsed.success) {
			throw new HttpsError("invalid-argument", parsed.error.message);
		}
		const { testId, answers } = parsed.data;

		// The test must be assigned to the student's class.
		const testSnap = await db.collection("tests").doc(testId).get();
		if (!testSnap.exists) {
			throw new HttpsError("not-found", "Test nicht gefunden.");
		}
		const assigned: string[] = testSnap.get("assignedClassIds") ?? [];
		if (!assigned.includes(classId)) {
			throw new HttpsError(
				"permission-denied",
				"Dieser Test ist nicht für deine Klasse freigegeben."
			);
		}

		// Grade against the server-held questions (these include the correct
		// answers, which never need to be trusted from the client).
		const qSnap = await db
			.collection("tests")
			.doc(testId)
			.collection("questions")
			.get();
		const questions: GradableQuestion[] = qSnap.docs.map(
			(d) => ({ id: d.id, ...d.data() } as GradableQuestion)
		);
		const { totalEarned, totalPossible, perQuestion } = gradeAll(
			questions,
			answers
		);

		// Identity comes from the trusted student doc, not the client.
		const studentSnap = await db.collection("students").doc(uid).get();
		const firstName = (studentSnap.get("firstName") as string) ?? "";
		const lastInitial = (studentSnap.get("lastInitial") as string) ?? "";
		const studentName = `${firstName} ${lastInitial}`.trim();

		const rounded = Math.round(totalEarned * 100) / 100;
		const ref = await db
			.collection("tests")
			.doc(testId)
			.collection("submissions")
			.add({
				testId,
				studentId: uid,
				studentName,
				classId,
				totalEarned: rounded,
				totalPossible,
				perQuestion,
				submittedAt: FieldValue.serverTimestamp(),
			});

		return {
			submissionId: ref.id,
			totalEarned: rounded,
			totalPossible,
			perQuestion,
		};
	}
);
