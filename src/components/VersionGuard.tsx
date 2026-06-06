"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { APP_VERSION } from "@/lib/version";

// Polling cadence for /version.json. Five minutes balances "kid leaves
// iPad open at lunch and sees the update before the next lesson" with
// "don't burn battery for nothing." The SW updatefound path covers the
// in-tab case directly; this polling is the backup for PWAs returning
// from background and stale registrations.
const VERSION_POLL_MS = 5 * 60 * 1000;

const POLL_PATH = "/version.json";
const SW_PATH = "/sw.js";

/**
 * Mounts once near the root. Registers the SW, detects when a new
 * version is deployed, and surfaces a persistent toast inviting the
 * user to reload. Renders nothing.
 */
const VersionGuard: React.FC = () => {
	const promptedRef = useRef(false);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!("serviceWorker" in navigator)) return;

		let registration: ServiceWorkerRegistration | null = null;
		let reloadedOnControllerChange = false;

		const promptReload = () => {
			if (promptedRef.current) return;
			promptedRef.current = true;
			toast("Neue Version verfügbar", {
				description:
					"Lade die Seite neu, um die neueste Version zu nutzen.",
				duration: Infinity,
				action: {
					label: "Neu laden",
					onClick: () => {
						const waiting = registration?.waiting;
						if (waiting) {
							// SW will activate and fire controllerchange,
							// which triggers our reload below.
							waiting.postMessage({ type: "SKIP_WAITING" });
						} else {
							// Polling-only path: no waiting SW, just reload.
							window.location.reload();
						}
					},
				},
			});
		};

		const watchInstallingWorker = (
			reg: ServiceWorkerRegistration,
			worker: ServiceWorker | null
		) => {
			if (!worker) return;
			worker.addEventListener("statechange", () => {
				// Only prompt if there's an existing controller — otherwise
				// this is the very first install on a fresh page and the
				// user is already on the latest version.
				if (
					worker.state === "installed" &&
					navigator.serviceWorker.controller
				) {
					promptReload();
				}
			});
		};

		(async () => {
			try {
				registration = await navigator.serviceWorker.register(SW_PATH);

				if (registration.waiting && navigator.serviceWorker.controller) {
					// Previous session left an installed-but-waiting SW; ask
					// the user right away so they don't keep using the old
					// version unknowingly.
					promptReload();
				}

				registration.addEventListener("updatefound", () => {
					watchInstallingWorker(
						registration!,
						registration!.installing
					);
				});

				navigator.serviceWorker.addEventListener(
					"controllerchange",
					() => {
						if (reloadedOnControllerChange) return;
						reloadedOnControllerChange = true;
						window.location.reload();
					}
				);
			} catch (err) {
				console.error("VersionGuard: SW registration failed:", err);
			}
		})();

		// Belt-and-suspenders polling. Cache-busts via no-store to make
		// sure we hit the network. If the served version differs from
		// the baked-in one, ask the SW to recheck and prompt the user.
		const poll = async () => {
			try {
				const res = await fetch(POLL_PATH, { cache: "no-store" });
				if (!res.ok) return;
				const data = (await res.json()) as { version?: string };
				if (data.version && data.version !== APP_VERSION) {
					registration?.update().catch(() => {});
					promptReload();
				}
			} catch {
				// Ignore network errors — they're expected when offline.
			}
		};

		const interval = window.setInterval(poll, VERSION_POLL_MS);

		// One initial poll a few seconds after mount so a user who left
		// the tab open through a deploy gets the prompt without waiting
		// a full cycle.
		const initialTimeout = window.setTimeout(poll, 8_000);

		return () => {
			window.clearInterval(interval);
			window.clearTimeout(initialTimeout);
		};
	}, []);

	return null;
};

export default VersionGuard;
