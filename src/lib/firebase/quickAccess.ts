// Anonymous Schnellzugang flow: a teacher generates a short code per
// test; students type a display name + code, sign in as anonymous
// Firebase Auth users, and access just that one test. Records live in
// two collections that a scheduled Cloud Function reaps after 24 hours.

import {
	deleteDoc,
	doc,
	getDoc,
	serverTimestamp,
	setDoc,
	Timestamp,
} from "firebase/firestore";
import { firestore } from "./config";

// Lowercase alphabet minus visually ambiguous chars (i / l / o / 0 / 1).
// 31 chars × 6 positions ≈ 887M codes — far more than any single
// classroom will ever consume in a 24h window.
const QUICK_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const QUICK_CODE_LENGTH = 6;
const MAX_COLLISION_RETRIES = 10;

export interface QuickCodeDoc {
	testId: string;
	teacherId: string;
	createdAt?: Timestamp;
}

export interface QuickAttempt {
	testId: string;
	teacherId: string;
	displayName: string;
	code: string;
	createdAt?: Timestamp;
	expiresAt: Timestamp;
}

function randomCode(): string {
	if (typeof crypto === "undefined" || !crypto.getRandomValues) {
		// Fallback for impossible-but-defensive case. Math.random isn't
		// cryptographically strong; with 887M code space and a 6-char
		// alphabet skip this branch in practice.
		let out = "";
		for (let i = 0; i < QUICK_CODE_LENGTH; i++) {
			out += QUICK_ALPHABET[Math.floor(Math.random() * QUICK_ALPHABET.length)];
		}
		return out;
	}
	const buf = new Uint8Array(QUICK_CODE_LENGTH);
	crypto.getRandomValues(buf);
	let out = "";
	for (let i = 0; i < QUICK_CODE_LENGTH; i++) {
		out += QUICK_ALPHABET[buf[i] % QUICK_ALPHABET.length];
	}
	return out;
}

export function isValidQuickCode(code: string): boolean {
	if (typeof code !== "string") return false;
	const trimmed = code.trim().toLowerCase();
	if (trimmed.length !== QUICK_CODE_LENGTH) return false;
	return /^[a-z0-9]+$/.test(trimmed);
}

export function normaliseQuickCode(code: string): string {
	return code.trim().toLowerCase();
}

/**
 * Generate a fresh code that doesn't currently exist in `quickCodes`.
 * Retries up to MAX_COLLISION_RETRIES times before giving up.
 */
export async function findUniqueQuickCode(): Promise<string> {
	for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
		const code = randomCode();
		const snap = await getDoc(doc(firestore, "quickCodes", code));
		if (!snap.exists()) return code;
	}
	throw new Error(
		"Could not generate a unique Schnellzugang code; please try again."
	);
}

export async function createQuickCode(
	code: string,
	testId: string,
	teacherId: string
): Promise<void> {
	await setDoc(doc(firestore, "quickCodes", code), {
		testId,
		teacherId,
		createdAt: serverTimestamp(),
	});
}

export async function deleteQuickCode(code: string): Promise<void> {
	await deleteDoc(doc(firestore, "quickCodes", code));
}

export async function lookupQuickCode(
	code: string
): Promise<QuickCodeDoc | null> {
	const snap = await getDoc(
		doc(firestore, "quickCodes", normaliseQuickCode(code))
	);
	if (!snap.exists()) return null;
	return snap.data() as QuickCodeDoc;
}

const ATTEMPT_TTL_MS = 24 * 60 * 60 * 1000;

export async function createQuickAttempt(
	anonUid: string,
	args: { code: string; testId: string; teacherId: string; displayName: string }
): Promise<void> {
	const expires = new Date(Date.now() + ATTEMPT_TTL_MS);
	await setDoc(doc(firestore, "quickAttempts", anonUid), {
		testId: args.testId,
		teacherId: args.teacherId,
		displayName: args.displayName,
		code: args.code,
		createdAt: serverTimestamp(),
		expiresAt: Timestamp.fromDate(expires),
	});
}

export async function getQuickAttempt(
	anonUid: string
): Promise<QuickAttempt | null> {
	const snap = await getDoc(doc(firestore, "quickAttempts", anonUid));
	if (!snap.exists()) return null;
	return snap.data() as QuickAttempt;
}
