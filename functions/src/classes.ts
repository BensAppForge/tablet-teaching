import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { auth, db } from "./admin";
import { deleteSubmissionsForClass } from "./submissionCleanup";

const DeleteClassSchema = z.object({
	classId: z.string().min(1),
});

/**
 * Cascading class delete: removes every student in the class (Auth user +
 * Firestore doc) and then deletes the class doc itself.
 *
 * Best-effort on per-student failures — returns the list of student uids
 * that couldn't be removed so the teacher can retry. The class doc is only
 * removed if all students were removed cleanly; otherwise the class is
 * left in place with whichever students could not be deleted.
 */
export const deleteClass = onCall(
	{ region: "europe-west1" },
	async (request) => {
		if (!request.auth) {
			throw new HttpsError("unauthenticated", "Sign in required.");
		}
		const teacherId = request.auth.uid;

		const parsed = DeleteClassSchema.safeParse(request.data);
		if (!parsed.success) {
			throw new HttpsError("invalid-argument", parsed.error.message);
		}
		const { classId } = parsed.data;

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

		// Remove the class's submissions first. On failure nothing else is
		// touched, so the teacher can retry cleanly.
		await deleteSubmissionsForClass(teacherId, classId);

		const studentsSnap = await db
			.collection("students")
			.where("teacherId", "==", teacherId)
			.where("classId", "==", classId)
			.get();

		const failedStudents: { uid: string; error: string }[] = [];

		// Auth deletes in parallel.
		const authResults = await Promise.allSettled(
			studentsSnap.docs.map((d: QueryDocumentSnapshot) =>
				auth.deleteUser(d.id)
			)
		);
		authResults.forEach((r: PromiseSettledResult<void>, i: number) => {
			if (r.status === "rejected") {
				failedStudents.push({
					uid: studentsSnap.docs[i].id,
					error: r.reason?.message ?? String(r.reason),
				});
			}
		});

		// Only delete Firestore docs for students whose Auth user was
		// successfully removed (so a retry can re-attempt the orphaned auth
		// users on the next deleteClass call).
		const failedUids = new Set(failedStudents.map((f) => f.uid));
		const batch = db.batch();
		studentsSnap.docs.forEach((d: QueryDocumentSnapshot) => {
			if (!failedUids.has(d.id)) batch.delete(d.ref);
		});
		if (failedStudents.length === 0) {
			batch.delete(classSnap.ref);
		}
		await batch.commit();

		return {
			deletedStudentCount: studentsSnap.size - failedStudents.length,
			failedStudents,
			classDeleted: failedStudents.length === 0,
		};
	}
);
