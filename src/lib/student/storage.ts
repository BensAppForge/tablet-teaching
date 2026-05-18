// localStorage-backed persistence for student worksheet attempts.
//
// One key per (student uid, test id). Stores both the in-progress
// answer map and the locked submission result if the student has
// pressed "Fertig". v1 keeps everything client-side; v2 will mirror
// to Firestore (the `attempts` collection that's currently rule-locked).

export interface StoredAttempt {
	answers: Record<string, unknown>;
	submitted?: SubmissionResult;
}

export interface SubmissionResult {
	submittedAt: number; // epoch ms
	totalEarned: number;
	totalPossible: number;
	perQuestion: Record<string, { correct: boolean; earned: number; max: number }>;
}

function key(studentUid: string, testId: string): string {
	return `tt:worksheet:${studentUid}:${testId}`;
}

export function loadAttempt(
	studentUid: string,
	testId: string
): StoredAttempt | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(key(studentUid, testId));
		if (!raw) return null;
		const parsed = JSON.parse(raw) as StoredAttempt;
		// Minimal shape check; ignore broken/legacy entries silently.
		if (!parsed || typeof parsed !== "object" || !parsed.answers) return null;
		return parsed;
	} catch {
		return null;
	}
}

export function saveAttempt(
	studentUid: string,
	testId: string,
	attempt: StoredAttempt
): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(key(studentUid, testId), JSON.stringify(attempt));
	} catch {
		// Quota or private-mode failures are non-fatal for v1.
	}
}

export function clearAttempt(studentUid: string, testId: string): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.removeItem(key(studentUid, testId));
	} catch {
		// ignore
	}
}
