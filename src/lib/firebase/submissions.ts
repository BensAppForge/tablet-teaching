import {
	collection,
	doc,
	addDoc,
	deleteDoc,
	getDocs,
	limit,
	onSnapshot,
	orderBy,
	query,
	serverTimestamp,
	Timestamp,
	Unsubscribe,
	where,
	writeBatch,
} from "firebase/firestore";
import { firestore } from "./config";

export interface PerQuestionResult {
	correct: boolean;
	earned: number;
	max: number;
}

export interface Submission {
	id?: string;
	testId: string;
	studentId: string;
	studentName: string;
	classId: string;
	submittedAt: Timestamp | null;
	totalEarned: number;
	totalPossible: number;
	perQuestion: Record<string, PerQuestionResult>;
}

export interface SubmissionInput {
	studentId: string;
	studentName: string;
	classId: string;
	totalEarned: number;
	totalPossible: number;
	perQuestion: Record<string, PerQuestionResult>;
}

/**
 * Create a new submission under tests/{testId}/submissions. Managed
 * students only — the security rule blocks anonymous Schnellzugang
 * uids. Each retake is a new doc (history is preserved).
 */
export async function createSubmission(
	testId: string,
	input: SubmissionInput
): Promise<string> {
	const ref = collection(firestore, `tests/${testId}/submissions`);
	const docRef = await addDoc(ref, {
		...input,
		testId,
		submittedAt: serverTimestamp(),
	});
	return docRef.id;
}

/**
 * Live subscription to the submissions of a given test. Used by the
 * teacher's results dialog. Returns an Unsubscribe — caller MUST
 * invoke it on cleanup or the listener leaks.
 */
export function subscribeToSubmissions(
	testId: string,
	onSubmissions: (subs: Submission[]) => void,
	onError?: (err: Error) => void
): Unsubscribe {
	const ref = collection(firestore, `tests/${testId}/submissions`);
	const q = query(ref, orderBy("submittedAt", "desc"));
	return onSnapshot(
		q,
		(snap) => {
			onSubmissions(
				snap.docs.map(
					(d) => ({ id: d.id, ...d.data() } as Submission)
				)
			);
		},
		(err) => onError?.(err)
	);
}

/**
 * Fetch the student's most recent submission for a given test, or null
 * if they haven't submitted yet. Used by StudentWorksheet to make
 * Firestore the source of truth for the review state — if the teacher
 * deletes the submission, the student's worksheet shows fresh-take
 * mode on next load instead of a stale localStorage result.
 */
export async function getLatestStudentSubmission(
	testId: string,
	studentId: string
): Promise<Submission | null> {
	const ref = collection(firestore, `tests/${testId}/submissions`);
	const q = query(
		ref,
		where("studentId", "==", studentId),
		orderBy("submittedAt", "desc"),
		limit(1)
	);
	const snap = await getDocs(q);
	if (snap.empty) return null;
	const d = snap.docs[0];
	return { id: d.id, ...d.data() } as Submission;
}

/**
 * Delete a single submission. Teacher-only via rules.
 */
export async function deleteSubmission(
	testId: string,
	submissionId: string
): Promise<void> {
	await deleteDoc(
		doc(firestore, `tests/${testId}/submissions/${submissionId}`)
	);
}

/**
 * Batch-delete every submission for a test. Used by deleteTest so
 * cascading cleanup happens server-side rather than leaving orphans.
 * Bounded by Firestore's 500-op batch limit; for v1 this is plenty.
 */
export async function deleteAllSubmissionsForTest(
	testId: string
): Promise<number> {
	const ref = collection(firestore, `tests/${testId}/submissions`);
	const snap = await getDocs(ref);
	if (snap.empty) return 0;
	const batch = writeBatch(firestore);
	snap.docs.forEach((d) => batch.delete(d.ref));
	await batch.commit();
	return snap.size;
}
