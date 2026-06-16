// Schnellzugang (anonymous) results — stored only when the teacher opts
// in via a retention setting on the test. Each doc carries an `expiresAt`;
// a scheduled Cloud Function reaps expired ones hourly. Kept separate from
// the managed `submissions` subcollection because the schema (self-typed
// name, no class, an expiry) and the security rules differ.

import {
	addDoc,
	collection,
	deleteDoc,
	doc,
	onSnapshot,
	orderBy,
	query,
	serverTimestamp,
	Timestamp,
	Unsubscribe,
} from "firebase/firestore";
import { firestore } from "./config";
import type { QuickRetention } from "./tests";
import type { PerQuestionResult } from "./submissions";

export interface QuickSubmission {
	id?: string;
	testId: string;
	displayName: string;
	code?: string;
	submittedAt: Timestamp | null;
	expiresAt: Timestamp | null;
	totalEarned: number;
	totalPossible: number;
	perQuestion: Record<string, PerQuestionResult>;
}

export interface QuickSubmissionInput {
	displayName: string;
	code?: string;
	totalEarned: number;
	totalPossible: number;
	perQuestion: Record<string, PerQuestionResult>;
}

/**
 * The instant a quick result should expire for a given retention, or null
 * when retention is off. "eod" is the end of the current local day; "24h"
 * is exactly 24 hours out. The create rule caps expiresAt at now + 25h.
 */
export function computeQuickExpiry(
	retention: QuickRetention,
	now: Date = new Date()
): Date | null {
	if (retention === "24h") {
		return new Date(now.getTime() + 24 * 60 * 60 * 1000);
	}
	if (retention === "eod") {
		const end = new Date(now);
		end.setHours(23, 59, 59, 999);
		return end;
	}
	return null;
}

/**
 * Persist a Schnellzugang result. Returns null without writing when
 * retention is off (the caller need not pre-check). Anonymous-only via
 * the security rule.
 */
export async function createQuickSubmission(
	testId: string,
	input: QuickSubmissionInput,
	retention: QuickRetention
): Promise<string | null> {
	const expiry = computeQuickExpiry(retention);
	if (!expiry) return null;
	const ref = collection(firestore, `tests/${testId}/quickSubmissions`);
	const docRef = await addDoc(ref, {
		...input,
		testId,
		submittedAt: serverTimestamp(),
		expiresAt: Timestamp.fromDate(expiry),
	});
	return docRef.id;
}

/**
 * Live subscription to a test's quick results for the teacher's results
 * dialog. Caller MUST invoke the returned Unsubscribe on cleanup.
 */
export function subscribeToQuickSubmissions(
	testId: string,
	onData: (subs: QuickSubmission[]) => void,
	onError?: (err: Error) => void
): Unsubscribe {
	const ref = collection(firestore, `tests/${testId}/quickSubmissions`);
	const q = query(ref, orderBy("submittedAt", "desc"));
	return onSnapshot(
		q,
		(snap) => {
			onData(
				snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuickSubmission))
			);
		},
		(err) => onError?.(err)
	);
}

/** Delete a single quick result. Teacher-only via rules. */
export async function deleteQuickSubmission(
	testId: string,
	submissionId: string
): Promise<void> {
	await deleteDoc(
		doc(firestore, `tests/${testId}/quickSubmissions/${submissionId}`)
	);
}
