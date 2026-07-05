import {
	EmailAuthProvider,
	reauthenticateWithCredential,
	updatePassword,
	type User,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { firestore, functions } from "./config";

/** Update the teacher's display-name fields on their profile doc. */
export async function updateTeacherName(
	uid: string,
	firstName: string,
	lastName: string
): Promise<void> {
	await updateDoc(doc(firestore, "teachers", uid), {
		firstName: firstName.trim(),
		lastName: lastName.trim(),
	});
}

/** Reauthenticate the teacher with their password (Firebase's recent-login
 * requirement for security-sensitive actions). Throws on a wrong password. */
export async function reauthenticate(
	user: User,
	password: string
): Promise<void> {
	if (!user.email) throw new Error("no-email");
	const cred = EmailAuthProvider.credential(user.email, password);
	await reauthenticateWithCredential(user, cred);
}

/** Change the signed-in teacher's password (reauthenticates first). */
export async function changePassword(
	user: User,
	currentPassword: string,
	newPassword: string
): Promise<void> {
	await reauthenticate(user, currentPassword);
	await updatePassword(user, newPassword);
}

const deleteAccountFn = httpsCallable<Record<string, never>, { ok: boolean }>(
	functions,
	"deleteAccount"
);

/**
 * Permanently delete the teacher's account and ALL their data (tests, classes,
 * students, submissions, …). Runs server-side via the Admin SDK. The caller
 * should reauthenticate first (confirmation) and sign out afterwards.
 */
export async function deleteAccount(): Promise<void> {
	await deleteAccountFn({});
}
