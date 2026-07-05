"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import {
	updateTeacherName,
	changePassword,
	reauthenticate,
	deleteAccount,
} from "@/lib/firebase/account";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
	AlertDialogAction,
} from "@/components/ui/alert-dialog";

const CONFIRM_WORD = "LÖSCHEN";

const SettingsManagement: React.FC = () => {
	const { currentUser, teacherData, logout } = useAuth();
	const router = useRouter();

	// --- Profile ---
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [savingProfile, setSavingProfile] = useState(false);

	useEffect(() => {
		if (teacherData) {
			setFirstName(teacherData.firstName ?? "");
			setLastName(teacherData.lastName ?? "");
		}
	}, [teacherData]);

	const handleSaveProfile = async () => {
		if (!currentUser) return;
		if (!firstName.trim() || !lastName.trim()) {
			toast.error("Bitte Vor- und Nachnamen ausfüllen.");
			return;
		}
		setSavingProfile(true);
		try {
			await updateTeacherName(currentUser.uid, firstName, lastName);
			toast.success("Profil gespeichert.");
		} catch (err) {
			console.error(err);
			toast.error("Speichern fehlgeschlagen.");
		} finally {
			setSavingProfile(false);
		}
	};

	// --- Password ---
	const [curPw, setCurPw] = useState("");
	const [newPw, setNewPw] = useState("");
	const [confirmPw, setConfirmPw] = useState("");
	const [changingPw, setChangingPw] = useState(false);

	const handleChangePassword = async () => {
		if (!currentUser) return;
		if (newPw.length < 6) {
			toast.error("Das neue Passwort muss mindestens 6 Zeichen haben.");
			return;
		}
		if (newPw !== confirmPw) {
			toast.error("Die neuen Passwörter stimmen nicht überein.");
			return;
		}
		setChangingPw(true);
		try {
			await changePassword(currentUser, curPw, newPw);
			toast.success("Passwort geändert.");
			setCurPw("");
			setNewPw("");
			setConfirmPw("");
		} catch (err) {
			console.error(err);
			const code = (err as { code?: string })?.code;
			if (
				code === "auth/wrong-password" ||
				code === "auth/invalid-credential"
			) {
				toast.error("Das aktuelle Passwort ist falsch.");
			} else if (code === "auth/weak-password") {
				toast.error("Das neue Passwort ist zu schwach.");
			} else {
				toast.error("Passwort konnte nicht geändert werden.");
			}
		} finally {
			setChangingPw(false);
		}
	};

	// --- Delete account ---
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deletePw, setDeletePw] = useState("");
	const [confirmText, setConfirmText] = useState("");
	const [deleting, setDeleting] = useState(false);

	const canDelete = deletePw.length > 0 && confirmText.trim() === CONFIRM_WORD;

	const handleDeleteAccount = async () => {
		if (!currentUser || !canDelete) return;
		setDeleting(true);
		try {
			// Confirm identity (recent login), then wipe everything server-side.
			await reauthenticate(currentUser, deletePw);
			await deleteAccount();
			toast.success("Dein Konto und alle Daten wurden gelöscht.");
			await logout(); // signs out + redirects home
		} catch (err) {
			console.error(err);
			const code = (err as { code?: string })?.code;
			if (
				code === "auth/wrong-password" ||
				code === "auth/invalid-credential"
			) {
				toast.error("Das Passwort ist falsch.");
			} else {
				toast.error(
					"Konto konnte nicht gelöscht werden. Bitte erneut versuchen."
				);
			}
			setDeleting(false);
		}
	};

	return (
		<PageShell
			title="Einstellungen"
			backHref="/teacher/dashboard"
			backLabel="Dashboard"
			maxWidth="2xl"
		>
			<div className="space-y-6">
				{/* Profile */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Profil</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-2 sm:grid-cols-2">
							<div className="grid gap-1.5">
								<Label htmlFor="firstName">Vorname</Label>
								<Input
									id="firstName"
									value={firstName}
									onChange={(e) => setFirstName(e.target.value)}
								/>
							</div>
							<div className="grid gap-1.5">
								<Label htmlFor="lastName">Nachname</Label>
								<Input
									id="lastName"
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
								/>
							</div>
						</div>
						<div className="grid gap-1.5">
							<Label>E-Mail</Label>
							<Input value={currentUser?.email ?? ""} disabled readOnly />
							<p className="text-xs text-muted-foreground">
								Die Änderung der E-Mail-Adresse ist derzeit noch nicht
								möglich.
							</p>
						</div>
						<div className="flex justify-end">
							<Button onClick={handleSaveProfile} disabled={savingProfile}>
								{savingProfile && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								Speichern
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Password */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Passwort ändern</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-1.5">
							<Label htmlFor="curPw">Aktuelles Passwort</Label>
							<Input
								id="curPw"
								type="password"
								autoComplete="current-password"
								value={curPw}
								onChange={(e) => setCurPw(e.target.value)}
							/>
						</div>
						<div className="grid gap-2 sm:grid-cols-2">
							<div className="grid gap-1.5">
								<Label htmlFor="newPw">Neues Passwort</Label>
								<Input
									id="newPw"
									type="password"
									autoComplete="new-password"
									value={newPw}
									onChange={(e) => setNewPw(e.target.value)}
								/>
							</div>
							<div className="grid gap-1.5">
								<Label htmlFor="confirmPw">Neues Passwort wiederholen</Label>
								<Input
									id="confirmPw"
									type="password"
									autoComplete="new-password"
									value={confirmPw}
									onChange={(e) => setConfirmPw(e.target.value)}
								/>
							</div>
						</div>
						<div className="flex justify-end">
							<Button
								onClick={handleChangePassword}
								disabled={changingPw || !curPw || !newPw || !confirmPw}
							>
								{changingPw && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								Passwort ändern
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Danger zone */}
				<Card className="border-destructive/40">
					<CardHeader>
						<CardTitle className="text-base text-destructive">
							Konto löschen
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<p className="text-sm text-muted-foreground">
							Löscht dein Konto unwiderruflich — zusammen mit allen deinen
							Tests, Klassen, Schüler:innen-Zugängen und Ergebnissen. Diese
							Aktion kann nicht rückgängig gemacht werden.
						</p>
						<Button
							variant="destructive"
							onClick={() => {
								setDeletePw("");
								setConfirmText("");
								setDeleteOpen(true);
							}}
						>
							<Trash2 className="mr-2 h-4 w-4" />
							Konto dauerhaft löschen
						</Button>
					</CardContent>
				</Card>
			</div>

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2">
							<AlertTriangle className="h-5 w-5 text-destructive" />
							Konto wirklich löschen?
						</AlertDialogTitle>
						<AlertDialogDescription>
							Alle deine Tests, Klassen, Schüler:innen-Zugänge und Ergebnisse
							werden dauerhaft gelöscht. Zur Bestätigung gib dein Passwort ein
							und tippe <strong>{CONFIRM_WORD}</strong>.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="space-y-3 py-1">
						<div className="grid gap-1.5">
							<Label htmlFor="deletePw">Passwort</Label>
							<Input
								id="deletePw"
								type="password"
								autoComplete="current-password"
								value={deletePw}
								onChange={(e) => setDeletePw(e.target.value)}
							/>
						</div>
						<div className="grid gap-1.5">
							<Label htmlFor="confirmText">
								Tippe {CONFIRM_WORD} zur Bestätigung
							</Label>
							<Input
								id="confirmText"
								value={confirmText}
								onChange={(e) => setConfirmText(e.target.value)}
								autoCorrect="off"
								autoCapitalize="characters"
							/>
						</div>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>
							Abbrechen
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								handleDeleteAccount();
							}}
							disabled={!canDelete || deleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Endgültig löschen
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</PageShell>
	);
};

export default SettingsManagement;
