import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { auth, db, FieldValue } from "./admin";
import { generateEmailLocal, generatePassword } from "./passwords";

const STUDENT_EMAIL_DOMAIN = "tablet-teaching.app";
const MAX_STUDENTS_PER_BATCH = 50;

const StudentInputSchema = z.object({
	firstName: z.string().trim().min(1).max(40),
	lastInitial: z.string().trim().min(1).max(3),
});

const BulkImportSchema = z.object({
	classId: z.string().min(1),
	students: z.array(StudentInputSchema).min(1).max(MAX_STUDENTS_PER_BATCH),
});

type CreatedStudent = {
	uid: string;
	firstName: string;
	lastInitial: string;
	email: string;
	password: string;
};

type FailedStudent = {
	firstName: string;
	lastInitial: string;
	error: string;
};

async function createOneStudent(
	classId: string,
	teacherId: string,
	firstName: string,
	lastInitial: string
): Promise<CreatedStudent> {
	// Retry once on the (statistically very rare) email collision.
	for (let attempt = 0; attempt < 2; attempt++) {
		const email = `${generateEmailLocal()}@${STUDENT_EMAIL_DOMAIN}`;
		const password = generatePassword();
		const displayName = `${firstName} ${lastInitial}`.trim();

		try {
			const user = await auth.createUser({ email, password, displayName });

			await auth.setCustomUserClaims(user.uid, {
				role: "student",
				classId,
				teacherId,
			});

			await db
				.collection("students")
				.doc(user.uid)
				.set({
					teacherId,
					classId,
					firstName,
					lastInitial,
					synthEmail: email,
					active: true,
					createdAt: FieldValue.serverTimestamp(),
				});

			return {
				uid: user.uid,
				firstName,
				lastInitial,
				email,
				password,
			};
		} catch (err: any) {
			if (err?.code === "auth/email-already-exists" && attempt === 0) {
				// Retry with a fresh email local-part.
				continue;
			}
			throw err;
		}
	}

	// Unreachable in practice; loop either returns or throws.
	throw new Error("Failed to generate a unique email for student");
}

export const bulkImportStudents = onCall(
	{ region: "europe-west1" },
	async (request) => {
		if (!request.auth) {
			throw new HttpsError("unauthenticated", "Sign in required.");
		}
		const teacherId = request.auth.uid;

		const parsed = BulkImportSchema.safeParse(request.data);
		if (!parsed.success) {
			throw new HttpsError("invalid-argument", parsed.error.message);
		}
		const { classId, students } = parsed.data;

		// Verify the caller owns the class.
		const classSnap = await db.collection("classes").doc(classId).get();
		if (!classSnap.exists) {
			throw new HttpsError("not-found", "Class not found.");
		}
		if (classSnap.get("teacherId") !== teacherId) {
			throw new HttpsError(
				"permission-denied",
				"You do not own this class."
			);
		}

		const created: CreatedStudent[] = [];
		const failed: FailedStudent[] = [];

		// Sequential to keep failure attribution clean and avoid burst-rate
		// issues against Firebase Auth.
		for (const input of students) {
			try {
				const s = await createOneStudent(
					classId,
					teacherId,
					input.firstName,
					input.lastInitial
				);
				created.push(s);
			} catch (err: any) {
				failed.push({
					firstName: input.firstName,
					lastInitial: input.lastInitial,
					error: err?.message ?? String(err),
				});
			}
		}

		return { created, failed };
	}
);
