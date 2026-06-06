import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
	Firestore,
	getFirestore,
	initializeFirestore,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
	databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// Initialize Firebase for SSR + SSG, prevent initializing duplicate apps
// Check if running in the browser before getting apps
let app;
if (typeof window !== "undefined" && !getApps().length) {
	app = initializeApp(firebaseConfig);
} else if (typeof window !== "undefined") {
	app = getApp();
} else {
	// Handle server-side initialization if necessary, or provide a default/mock
	// For now, we assume client-side initialization primarily.
	// If server-side Firebase access is needed (e.g., in API routes without passing client app),
	// you might need the Firebase Admin SDK.
	app = getApps().length ? getApp() : initializeApp(firebaseConfig); // Basic server-side fallback
}

let firestore: Firestore;
if (typeof window !== "undefined") {
	try {
		// Force long-polling instead of WebSockets. WebKit (Safari, iPad PWA)
		// can leave WebSocket handshakes in a half-open state without ever
		// signalling failure, so experimentalAutoDetectLongPolling's fallback
		// never triggers and queries stall until manual refresh. Long polling
		// is marginally slower steady-state but reliable across school
		// networks, captive portals, and bfcache returns.
		firestore = initializeFirestore(app, {
			experimentalForceLongPolling: true,
		});
	} catch {
		// In dev/HMR the Firestore instance may already exist.
		firestore = getFirestore(app);
	}
} else {
	firestore = getFirestore(app);
}
const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app, "europe-west1");

export { app, firestore, auth, storage, functions };
