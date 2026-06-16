// Service worker for Tablet Teaching.
//
// Two jobs:
//  1. Update channel — every deploy rewrites __APP_VERSION__ so the SW's
//     bytes change, the browser reinstalls it, and VersionGuard surfaces
//     the "Neue Version verfügbar" toast. The new SW stays WAITING until
//     the user accepts (SKIP_WAITING), so we never reload mid-task.
//  2. App-shell offline — cache static assets + visited pages so the app
//     still opens without a network, with a self-contained offline page as
//     the last-resort navigation fallback. (Loading brand-new test content
//     still needs a connection — that's Firestore, not cached here.)
//
// The cache name is keyed to APP_VERSION, so activating a new version
// purges the previous version's cache and we never serve stale assets.

// __APP_VERSION__ is rewritten at build time by scripts/sync-version.mjs.
const APP_VERSION = "__APP_VERSION__";
const CACHE = `tt-cache-${APP_VERSION}`;
const OFFLINE_URL = "/offline.html";
// Minimal precache: the offline fallback + a couple of icons it references.
// Everything else is cached lazily as it's fetched (hashed Next assets are
// immutable, so cache-first is safe).
const PRECACHE = [OFFLINE_URL, "/app-icon.svg", "/icon-192.png"];

const STATIC_RE = /\.(?:js|css|woff2?|ttf|otf|png|svg|jpg|jpeg|webp|gif|ico)$/;

self.addEventListener("install", (event) => {
	// Precache the offline fallback so the first offline navigation works.
	// Do NOT skipWaiting — stay waiting until the user accepts the update.
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(PRECACHE))
			.catch(() => {
				// Best-effort: a precache miss must not block installation.
			})
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			// Drop caches from previous versions so we never serve stale
			// hashed assets after an update.
			const keys = await caches.keys();
			await Promise.all(
				keys
					.filter((k) => k.startsWith("tt-cache-") && k !== CACHE)
					.map((k) => caches.delete(k))
			);
			// Control open clients immediately so the next navigation runs
			// against the new SW without an extra reload.
			await self.clients.claim();
		})()
	);
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

self.addEventListener("fetch", (event) => {
	const req = event.request;
	if (req.method !== "GET") return;

	let url;
	try {
		url = new URL(req.url);
	} catch {
		return;
	}

	// Cross-origin (Firestore, Google APIs, font CDNs, …) → always network.
	if (url.origin !== self.location.origin) return;
	// Control files must never be served from cache — they drive updates.
	if (url.pathname === "/version.json" || url.pathname === "/sw.js") return;

	// Page navigations: network-first (always fresh online), fall back to a
	// cached copy, then the offline page.
	if (req.mode === "navigate") {
		event.respondWith(
			(async () => {
				try {
					const fresh = await fetch(req);
					const cache = await caches.open(CACHE);
					cache.put(req, fresh.clone());
					return fresh;
				} catch {
					const cache = await caches.open(CACHE);
					return (
						(await cache.match(req)) ||
						(await cache.match(OFFLINE_URL)) ||
						Response.error()
					);
				}
			})()
		);
		return;
	}

	// Static assets (content-hashed Next chunks, icons, fonts): cache-first.
	if (url.pathname.startsWith("/_next/") || STATIC_RE.test(url.pathname)) {
		event.respondWith(
			(async () => {
				const cache = await caches.open(CACHE);
				const cached = await cache.match(req);
				if (cached) return cached;
				try {
					const fresh = await fetch(req);
					if (fresh && fresh.ok) cache.put(req, fresh.clone());
					return fresh;
				} catch {
					return cached || Response.error();
				}
			})()
		);
		return;
	}

	// Everything else falls through to the default network handling.
});
