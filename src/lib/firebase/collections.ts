// Collections = teacher-owned virtual folders for organising tests
// (e.g. one per textbook). A test points at a collection via its
// `collectionId` field; the collection doc holds only display metadata.
// Membership is single (one folder per test) and flat (no nesting) in v1.

import {
	addDoc,
	collection,
	deleteDoc,
	deleteField,
	doc,
	getDocs,
	onSnapshot,
	query,
	serverTimestamp,
	Timestamp,
	Unsubscribe,
	updateDoc,
	where,
	writeBatch,
} from "firebase/firestore";
import { firestore } from "./config";

export interface TestCollection {
	id?: string;
	teacherId: string;
	name: string;
	createdAt?: Timestamp;
	updatedAt?: Timestamp;
}

export const COLLECTION_NAME_MAX = 60;

function cleanName(name: string): string {
	return name.trim().slice(0, COLLECTION_NAME_MAX);
}

export const createCollection = async (
	teacherId: string,
	name: string
): Promise<string> => {
	const trimmed = cleanName(name);
	if (!trimmed) throw new Error("Name darf nicht leer sein.");
	const ref = await addDoc(collection(firestore, "collections"), {
		teacherId,
		name: trimmed,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	});
	return ref.id;
};

export const renameCollection = async (
	id: string,
	name: string
): Promise<void> => {
	const trimmed = cleanName(name);
	if (!trimmed) throw new Error("Name darf nicht leer sein.");
	await updateDoc(doc(firestore, "collections", id), {
		name: trimmed,
		updatedAt: serverTimestamp(),
	});
};

/**
 * Delete a collection and clear `collectionId` on every test that points
 * at it, so those tests fall back to "Ohne Sammlung". The tests
 * themselves are never deleted. Both clauses carry the teacherId filter
 * so the list read satisfies the security rule. Batched (≤500 ops);
 * fine for any realistic per-teacher collection size in v1.
 */
export const deleteCollection = async (
	id: string,
	teacherId: string
): Promise<void> => {
	const testsSnap = await getDocs(
		query(
			collection(firestore, "tests"),
			where("teacherId", "==", teacherId),
			where("collectionId", "==", id)
		)
	);
	const batch = writeBatch(firestore);
	testsSnap.docs.forEach((d) =>
		batch.update(d.ref, {
			collectionId: deleteField(),
			updatedAt: serverTimestamp(),
		})
	);
	batch.delete(doc(firestore, "collections", id));
	await batch.commit();
};

/**
 * Move a test into a collection, or out of any collection when
 * `collectionId` is null (the field is removed — Firestore rejects
 * `undefined`, and an absent field is what the UI reads as uncategorised).
 */
export const setTestCollection = async (
	testId: string,
	collectionId: string | null
): Promise<void> => {
	await updateDoc(doc(firestore, "tests", testId), {
		collectionId: collectionId ?? deleteField(),
		updatedAt: serverTimestamp(),
	});
};

/**
 * Live subscription to a teacher's collections, sorted by name. No
 * orderBy in the query (would need a composite index alongside the
 * teacherId filter); a single-field equality is enough and we sort
 * client-side. Caller MUST invoke the returned Unsubscribe on cleanup.
 */
export const subscribeToTeacherCollections = (
	teacherId: string,
	onData: (collections: TestCollection[]) => void,
	onError?: (err: Error) => void
): Unsubscribe => {
	const q = query(
		collection(firestore, "collections"),
		where("teacherId", "==", teacherId)
	);
	return onSnapshot(
		q,
		(snap) => {
			const list = snap.docs.map(
				(d) => ({ id: d.id, ...d.data() } as TestCollection)
			);
			list.sort((a, b) => a.name.localeCompare(b.name, "de"));
			onData(list);
		},
		(err) => onError?.(err)
	);
};
