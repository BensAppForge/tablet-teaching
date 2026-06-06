// Service worker for Tablet Teaching.
//
// Job: make every deploy a "new" SW so the browser detects it on the
// next visit, then post a SKIP_WAITING message when the user opts in
// via VersionGuard. We DON'T cache anything — Next.js's hashed static
// assets are already content-addressable, and Firestore traffic needs
// fresh network. This SW exists purely for the version-update channel.

// __APP_VERSION__ is rewritten at build time by scripts/sync-version.mjs.
// Its presence makes the SW byte content change every deploy so browsers
// fetch + reinstall it instead of treating it as identical.
const APP_VERSION = "__APP_VERSION__";

self.addEventListener("install", () => {
	// Do NOT skipWaiting here — we want the new SW to stay in the
	// "waiting" state until the user accepts the update via the toast.
});

self.addEventListener("activate", (event) => {
	// Take control of all open clients as soon as we're activated so the
	// next page navigation runs against the new SW without an extra reload.
	event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
	const data = event.data;
	if (data && data.type === "SKIP_WAITING") {
		self.skipWaiting();
	}
	if (data && data.type === "GET_VERSION") {
		event.ports[0]?.postMessage({ version: APP_VERSION });
	}
});
