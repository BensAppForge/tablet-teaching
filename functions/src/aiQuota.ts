import { HttpsError } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "./admin";

// Server-authoritative AI-generation quota.
//
// The previous approach counted tests with `isAIGenerated === true`, but
// that flag is written by the client (and was in fact hard-coded false on
// every save), so the count was always 0 and the quota never fired. Instead
// we meter consumption in an Admin-only counter doc at aiUsage/{teacherId}
// (no Firestore rule → default deny → client-inaccessible), incremented
// only AFTER a generation actually succeeds, so a failed Gemini call never
// burns a basic teacher's (very small) monthly allowance.

// Basic (non-premium) teachers get this many successful generations per
// rolling 30-day window. Premium/beta teachers bypass the quota entirely.
export const AI_TESTS_PER_MONTH_BASIC = 1;
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

async function isPremiumTeacher(teacherId: string): Promise<boolean> {
	const snap = await db.collection("teachers").doc(teacherId).get();
	if (!snap.exists) return false;
	const d = snap.data() ?? {};
	if (d.isBetaTester === true) return true;
	if (d.isPremium === true) {
		// Respect premiumExpiresOn if present — expired premium is not premium.
		const exp = d.premiumExpiresOn;
		if (exp && typeof exp.toMillis === "function") {
			return exp.toMillis() > Date.now();
		}
		return true;
	}
	return false;
}

/**
 * Read-only pre-check. Throws `resource-exhausted` if a basic teacher has no
 * generations left in the current window. Does NOT consume — call
 * consumeAiQuota() after a successful generation. Returns whether the caller
 * is premium so the consume step can short-circuit.
 */
export async function assertAiQuota(
	teacherId: string
): Promise<{ premium: boolean }> {
	if (await isPremiumTeacher(teacherId)) return { premium: true };

	const snap = await db.collection("aiUsage").doc(teacherId).get();
	const data = snap.data();
	const windowStart: Timestamp | undefined = data?.windowStart;
	const count: number = data?.count ?? 0;
	const fresh =
		!windowStart || Date.now() - windowStart.toMillis() >= WINDOW_MS;

	if (!fresh && count >= AI_TESTS_PER_MONTH_BASIC) {
		throw new HttpsError(
			"resource-exhausted",
			"Das monatliche Limit für KI-Tests ist erreicht. Mit Premium sind unbegrenzte KI-Tests möglich."
		);
	}
	return { premium: false };
}

/**
 * Atomically record one successful generation for a basic teacher. No-op for
 * premium teachers. Transactional so parallel calls can't both under-count;
 * the tiny check-then-consume race with assertAiQuota is bounded by the flat
 * per-teacher rate limit and, for a limit of 1, is at most one extra test.
 */
export async function consumeAiQuota(
	teacherId: string,
	premium: boolean
): Promise<void> {
	if (premium) return;

	const ref = db.collection("aiUsage").doc(teacherId);
	const now = Timestamp.now();
	await db.runTransaction(async (tx) => {
		const snap = await tx.get(ref);
		const data = snap.data();
		const windowStart: Timestamp | undefined = data?.windowStart;
		const count: number = data?.count ?? 0;
		const fresh =
			!windowStart || now.toMillis() - windowStart.toMillis() >= WINDOW_MS;
		if (fresh) {
			tx.set(ref, { windowStart: now, count: 1 });
		} else {
			tx.update(ref, { count: count + 1 });
		}
	});
}
