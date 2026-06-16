import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { auth, db, FieldValue } from "./admin";
import { buildEmailLocalBase, generatePassword } from "./passwords";

const STUDENT_EMAIL_DOMAIN = "tablet-teaching.app";
const MAX_STUDENTS_PER_BATCH = 50;
const MAX_EMAIL_COLLISION_ATTEMPTS = 20;

const StudentInputSchema = z.object({
	firstName: z.string().trim().min(1).max(40),
	lastInitial: z.string().trim().min(1).max(3),
});

const BulkImportSchema = z.object({
	classId: z.string().min(1),
	students: z.array(StudentInputSchema).min(1).max(MAX_STUDENTS_PER_BATCH),
});

const UpdateStudentSchema = z.object({
	studentUid: z.string().min(1),
	firstName: z.string().trim().min(1).max(40).optional(),
	lastInitial: z.string().trim().min(1).max(3).optional(),
});

const DeleteStudentSchema = z.object({
	studentUid: z.string().min(1),
});

const ResetStudentPasswordSchema = z.object({
	studentUid: z.string().min(1),
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

async function ensureTeacherOwnsStudent(
	studentUid: string,
	teacherId: string
): Promise<{
	classId: string;
	firstName: string;
	lastInitial: string;
	synthEmail: string;
}> {
	const snap = await db.collection("students").doc(studentUid).get();
	if (!snap.exists) {
		throw new HttpsError("not-found", "Student not found.");
	}
	if (snap.get("teacherId") !== teacherId) {
		throw new HttpsError("permission-denied", "You do not own this student.");
	}
	return {
		classId: snap.get("classId"),
		firstName: snap.get("firstName") ?? "",
		lastInitial: snap.get("lastInitial") ?? "",
		synthEmail: snap.get("synthEmail") ?? "",
	};
}

async function createOneStudent(
	classId: string,
	teacherId: string,
	firstName: string,
	lastInitial: string
): Promise<CreatedStudent> {
	const base = buildEmailLocalBase(firstName, lastInitial);
	const displayName = `${firstName} ${lastInitial}`.trim();

	// Walk -2, -3, -4, … on collision until we land a free local-part.
	for (let attempt = 0; attempt < MAX_EMAIL_COLLISION_ATTEMPTS; attempt++) {
		const local = attempt === 0 ? base : `${base}-${attempt + 1}`;
		const email = `${local}@${STUDENT_EMAIL_DOMAIN}`;
		const password = generatePassword();

		try {
			const user = await auth.createUser({ email, password, displayName });

			await auth.setCustomUserClaims(user.uid, {
				role: "student",
				classId,
				teacherId,
			});

			await db.collection("students").doc(user.uid).set({
				teacherId,
				classId,
				firstName,
				lastInitial,
				synthEmail: email,
				active: true,
				createdAt: FieldValue.serverTimestamp(),
			});

			return { uid: user.uid, firstName, lastInitial, email, password };
		} catch (err: any) {
			if (err?.code === "auth/email-already-exists") continue;
			throw err;
		}
	}

	throw new Error(
		`Could not find a free email after ${MAX_EMAIL_COLLISION_ATTEMPTS} attempts for ${displayName}`
	);
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

		// Parallel — Firebase Auth admin SDK comfortably handles batches of 50.
		// Per-student email-collision retries handle races on the same base
		// local-part (e.g., two "Anna B"s in the same batch).
		const settled = await Promise.allSettled(
			students.map((s) =>
				createOneStudent(classId, teacherId, s.firstName, s.lastInitial)
			)
		);

		const created: CreatedStudent[] = [];
		const failed: FailedStudent[] = [];

		settled.forEach((r, i) => {
			if (r.status === "fulfilled") {
				created.push(r.value);
			} else {
				failed.push({
					firstName: students[i].firstName,
					lastInitial: students[i].lastInitial,
					error: r.reason?.message ?? String(r.reason),
				});
			}
		});

		return { created, failed };
	}
);

export const updateStudent = onCall(
	{ region: "europe-west1" },
	async (request) => {
		if (!request.auth) {
			throw new HttpsError("unauthenticated", "Sign in required.");
		}
		const teacherId = request.auth.uid;

		const parsed = UpdateStudentSchema.safeParse(request.data);
		if (!parsed.success) {
			throw new HttpsError("invalid-argument", parsed.error.message);
		}
		const { studentUid, firstName, lastInitial } = parsed.data;

		if (firstName === undefined && lastInitial === undefined) {
			throw new HttpsError("invalid-argument", "Nothing to update.");
		}

		// Pull the current name so a partial update (e.g. firstName only)
		// composes the Auth displayName from the MERGED values rather than
		// dropping the field that wasn't sent.
		const existing = await ensureTeacherOwnsStudent(studentUid, teacherId);

		const fields: Record<string, any> = {};
		if (firstName !== undefined) fields.firstName = firstName;
		if (lastInitial !== undefined) fields.lastInitial = lastInitial;

		await db.collection("students").doc(studentUid).update(fields);

		const mergedFirst = firstName ?? existing.firstName;
		const mergedInitial = lastInitial ?? existing.lastInitial;
		const displayName = `${mergedFirst} ${mergedInitial}`
			.trim()
			.replace(/\s+/g, " ");
		if (displayName) {
			await auth.updateUser(studentUid, { displayName });
		}

		return { ok: true };
	}
);

// Teacher-initiated password reset. Managed students have synthetic emails
// (…@tablet-teaching.app) that receive no mail, so Firebase's email reset
// link is useless for them — the teacher regenerates the password here and
// reads the new one back to the student. Owner-checked; the new password is
// returned ONCE and never stored (same contract as the import flow).
export const resetStudentPassword = onCall(
	{ region: "europe-west1" },
	async (request) => {
		if (!request.auth) {
			throw new HttpsError("unauthenticated", "Sign in required.");
		}
		const teacherId = request.auth.uid;

		const parsed = ResetStudentPasswordSchema.safeParse(request.data);
		if (!parsed.success) {
			throw new HttpsError("invalid-argument", parsed.error.message);
		}
		const { studentUid } = parsed.data;

		const student = await ensureTeacherOwnsStudent(studentUid, teacherId);

		const password = generatePassword();
		await auth.updateUser(studentUid, { password });

		return {
			password,
			email: student.synthEmail,
			firstName: student.firstName,
			lastInitial: student.lastInitial,
		};
	}
);

export const deleteStudent = onCall(
	{ region: "europe-west1" },
	async (request) => {
		if (!request.auth) {
			throw new HttpsError("unauthenticated", "Sign in required.");
		}
		const teacherId = request.auth.uid;

		const parsed = DeleteStudentSchema.safeParse(request.data);
		if (!parsed.success) {
			throw new HttpsError("invalid-argument", parsed.error.message);
		}
		const { studentUid } = parsed.data;

		await ensureTeacherOwnsStudent(studentUid, teacherId);

		// Auth user first; if that fails we don't want to leave the Firestore
		// doc orphaned without a way for the teacher to retry.
		await auth.deleteUser(studentUid);
		await db.collection("students").doc(studentUid).delete();

		return { ok: true };
	}
);
