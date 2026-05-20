import { onSchedule } from "firebase-functions/v2/scheduler";
import { Timestamp, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { auth, db } from "./admin";

/**
 * Daily cleanup of expired Schnellzugang attempts. Deletes the Firebase
 * Anonymous Auth user AND the quickAttempts/{uid} doc. Driven by the
 * `expiresAt` field set when the student first signs in.
 *
 * Runs at 03:00 Europe/Berlin so it never collides with a classroom in
 * session. Best-effort: missing auth users (already cleaned up by a
 * previous run, or manually deleted) are not treated as failures.
 */
export const cleanupQuickAttempts = onSchedule(
	{
		schedule: "every day 03:00",
		timeZone: "Europe/Berlin",
		region: "europe-west1",
	},
	async () => {
		const now = Timestamp.fromDate(new Date());
		const snap = await db
			.collection("quickAttempts")
			.where("expiresAt", "<=", now)
			.get();

		if (snap.empty) {
			console.log("cleanupQuickAttempts: nothing to delete");
			return;
		}

		const results = await Promise.allSettled(
			snap.docs.map(async (d: QueryDocumentSnapshot) => {
				try {
					await auth.deleteUser(d.id);
				} catch (err: any) {
					if (err?.code !== "auth/user-not-found") throw err;
				}
				await d.ref.delete();
			})
		);

		const failed = results.filter(
			(r: PromiseSettledResult<void>) => r.status === "rejected"
		);
		console.log(
			`cleanupQuickAttempts: ${snap.size - failed.length} cleaned, ${failed.length} failed`
		);
		failed.forEach((r: PromiseSettledResult<void>) => {
			if (r.status === "rejected") console.error(r.reason);
		});
	}
);
