import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { DocumentReference } from "firebase-admin/firestore";
import { auth, db } from "./admin";

// Self-service teacher account deletion (DSGVO Art. 17). Wipes everything the
// teacher owns, via the Admin SDK, then deletes their Auth user LAST so a
// mid-run failure leaves them still authenticated and able to retry (all the
// deletes are idempotent).

const BATCH_LIMIT = 450; // under Firestore's 500-op cap, with headroom

async function deleteRefs(refs: DocumentReference[]): Promise<void> {
	for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
		const batch = db.batch();
		refs.slice(i, i + BATCH_LIMIT).forEach((r) => batch.delete(r));
		await batch.commit();
	}
}

async function deleteSubcollection(
	parent: DocumentReference,
	name: string
): Promise<void> {
	const snap = await parent.collection(name).get();
	await deleteRefs(snap.docs.map((d) => d.ref));
}

// Deleting an Auth user that's already gone is success (the end state we want).
async function deleteAuthUserQuietly(uid: string): Promise<void> {
	try {
		await auth.deleteUser(uid);
	} catch (err: unknown) {
		if ((err as { code?: string })?.code !== "auth/user-not-found") throw err;
	}
}

export const deleteAccount = onCall(
	{ region: "europe-west1", timeoutSeconds: 300 },
	async (request) => {
		if (!request.auth) {
			throw new HttpsError("unauthenticated", "Sign in required.");
		}
		const teacherId = request.auth.uid;
		// Managed students (role claim) must not use this path — only teachers.
		if (request.auth.token.role === "student") {
			throw new HttpsError("permission-denied", "Nicht erlaubt.");
		}

		logger.info("deleteAccount:start", { teacherId });

		// 1. Tests owned by the teacher: delete each test's subcollections
		//    (questions, submissions, quickSubmissions) and its quickCode doc,
		//    then the test docs themselves.
		const testsSnap = await db
			.collection("tests")
			.where("teacherId", "==", teacherId)
			.get();
		for (const testDoc of testsSnap.docs) {
			await deleteSubcollection(testDoc.ref, "questions");
			await deleteSubcollection(testDoc.ref, "submissions");
			await deleteSubcollection(testDoc.ref, "quickSubmissions");
			const code = testDoc.get("quickCode");
			if (typeof code === "string" && code) {
				await db
					.collection("quickCodes")
					.doc(code)
					.delete()
					.catch(() => undefined);
			}
		}
		await deleteRefs(testsSnap.docs.map((d) => d.ref));

		// 2. Collections (test folders).
		const collSnap = await db
			.collection("collections")
			.where("teacherId", "==", teacherId)
			.get();
		await deleteRefs(collSnap.docs.map((d) => d.ref));

		// 3. Managed students: Auth users + docs (all of the teacher's classes).
		const studentsSnap = await db
			.collection("students")
			.where("teacherId", "==", teacherId)
			.get();
		for (const s of studentsSnap.docs) {
			await deleteAuthUserQuietly(s.id);
		}
		await deleteRefs(studentsSnap.docs.map((d) => d.ref));

		// 4. Classes.
		const classesSnap = await db
			.collection("classes")
			.where("teacherId", "==", teacherId)
			.get();
		await deleteRefs(classesSnap.docs.map((d) => d.ref));

		// 5. Anonymous quick attempts bound to this teacher (also reaped by the
		//    scheduled cleanup, but remove now for completeness).
		const attemptsSnap = await db
			.collection("quickAttempts")
			.where("teacherId", "==", teacherId)
			.get();
		for (const a of attemptsSnap.docs) {
			await deleteAuthUserQuietly(a.id);
		}
		await deleteRefs(attemptsSnap.docs.map((d) => d.ref));

		// 6. Server-side counters keyed by this teacher.
		await deleteRefs([
			db.collection("aiUsage").doc(teacherId),
			db.collection("rateLimits").doc(`explainAnswer:${teacherId}`),
			db.collection("rateLimits").doc(`generateTestQuestions:${teacherId}`),
		]);

		// 7. Teacher profile doc.
		await db
			.collection("teachers")
			.doc(teacherId)
			.delete()
			.catch(() => undefined);

		// 8. The teacher's own Auth user — LAST.
		await deleteAuthUserQuietly(teacherId);

		logger.info("deleteAccount:done", {
			teacherId,
			tests: testsSnap.size,
			collections: collSnap.size,
			students: studentsSnap.size,
			classes: classesSnap.size,
		});

		return { ok: true };
	}
);
