import { HttpsError } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "./admin";

// Fixed-window per-key rate limit backed by a counter doc at
// rateLimits/{key}. Transactional so concurrent calls can't overshoot the
// limit. The rateLimits collection has no Firestore rule, so it's
// client-inaccessible (default deny) and only the Admin SDK touches it.
//
// Fixed-window (not sliding) is deliberate: it's one transaction per call
// and the worst case is up to 2× the limit across a window boundary, which
// is fine for cost/abuse protection.
export async function enforceRateLimit(opts: {
	/** Stable per-subject key, e.g. `explainAnswer:${uid}`. */
	key: string;
	/** Max calls allowed per window. */
	limit: number;
	/** Window length in seconds. */
	windowSeconds: number;
	/** Message thrown when the limit is exceeded. */
	message?: string;
}): Promise<void> {
	const ref = db.collection("rateLimits").doc(opts.key);
	const now = Timestamp.now();

	await db.runTransaction(async (tx) => {
		const snap = await tx.get(ref);
		const data = snap.data();
		const windowStart: Timestamp | undefined = data?.windowStart;
		const count: number = data?.count ?? 0;

		const expired =
			!windowStart ||
			now.toMillis() - windowStart.toMillis() >= opts.windowSeconds * 1000;

		if (expired) {
			tx.set(ref, { windowStart: now, count: 1 });
			return;
		}

		if (count >= opts.limit) {
			throw new HttpsError(
				"resource-exhausted",
				opts.message ??
					"Zu viele Anfragen. Bitte versuche es später erneut."
			);
		}

		tx.update(ref, { count: count + 1 });
	});
}
