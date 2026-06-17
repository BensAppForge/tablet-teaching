import { DocumentReference } from "firebase-admin/firestore";
import { db } from "./admin";

// Cascade cleanup of student submissions when a student or whole class is
// removed, so deleting people doesn't leave orphaned results behind.
//
// Implementation note: we go test-by-test (tests assigned to the class, then
// each test's submissions subcollection) instead of a collectionGroup query.
// That keeps us on indexes that already exist — the (teacherId,
// assignedClassIds) composite + the auto single-field index on the
// submissions subcollection — so no new collection-group index is needed.
//
// Known edge: a submission on a test that was later UNassigned from the
// class won't be found here (the test no longer matches the array-contains
// filter). Rare, and those results are already detached from the class view.

const BATCH_LIMIT = 450; // under Firestore's 500-op cap, with headroom

async function deleteRefsInBatches(
	refs: DocumentReference[]
): Promise<number> {
	for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
		const batch = db.batch();
		refs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
		await batch.commit();
	}
	return refs.length;
}

async function assignedTestRefs(
	teacherId: string,
	classId: string
): Promise<DocumentReference[]> {
	const snap = await db
		.collection("tests")
		.where("teacherId", "==", teacherId)
		.where("assignedClassIds", "array-contains", classId)
		.get();
	return snap.docs.map((d) => d.ref);
}

/** Delete one student's submissions across all tests assigned to their class. */
export async function deleteSubmissionsForStudent(
	teacherId: string,
	classId: string,
	studentUid: string
): Promise<number> {
	const tests = await assignedTestRefs(teacherId, classId);
	let total = 0;
	for (const testRef of tests) {
		const subs = await testRef
			.collection("submissions")
			.where("studentId", "==", studentUid)
			.get();
		total += await deleteRefsInBatches(subs.docs.map((d) => d.ref));
	}
	return total;
}

/** Delete every submission belonging to a class (all its students). */
export async function deleteSubmissionsForClass(
	teacherId: string,
	classId: string
): Promise<number> {
	const tests = await assignedTestRefs(teacherId, classId);
	let total = 0;
	for (const testRef of tests) {
		const subs = await testRef
			.collection("submissions")
			.where("classId", "==", classId)
			.get();
		total += await deleteRefsInBatches(subs.docs.map((d) => d.ref));
	}
	return total;
}
