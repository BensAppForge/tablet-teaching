import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

if (getApps().length === 0) {
	initializeApp();
}

export const auth = getAuth();
export const db = getFirestore();
export { FieldValue };
