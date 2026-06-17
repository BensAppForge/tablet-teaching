"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	Copy,
	Download,
	KeyRound,
	Loader2,
	Pencil,
	Printer,
	Trash2,
	UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import {
	Class,
	deleteClass,
	getClass,
	renameClass,
} from "@/lib/firebase/classes";
import {
	BulkImportResponse,
	bulkImportStudents,
	compareStudents,
	deleteStudent,
	getStudentsByClass,
	resetStudentPassword,
	ResetPasswordResult,
	Student,
	updateStudent,
} from "@/lib/firebase/students";
import { shareOrDownload } from "@/lib/download";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ParsedLine {
	raw: string;
	firstName: string;
	lastInitial: string;
	error?: string;
}

function parseRoster(text: string): ParsedLine[] {
	return text
		.split(/\r?\n/)
		.map((raw) => raw.trim())
		.filter((raw) => raw.length > 0)
		.map((raw) => {
			// Accept comma- and tab-separated input (e.g. pasted from Excel)
			// by normalising any of those to whitespace before splitting.
			const normalised = raw.replace(/[,\t;]+/g, " ").trim();
			const parts = normalised.split(/\s+/);
			if (parts.length < 2) {
				return {
					raw,
					firstName: parts[0] ?? "",
					lastInitial: "",
					error: "Nachname-Initial fehlt",
				};
			}
			const lastInitial = parts[parts.length - 1];
			const firstName = parts.slice(0, -1).join(" ");
			if (!firstName) {
				return { raw, firstName, lastInitial, error: "Vorname fehlt" };
			}
			if (lastInitial.length > 3) {
				return {
					raw,
					firstName,
					lastInitial,
					error: "Nachname-Initial zu lang (max. 3 Zeichen)",
				};
			}
			return { raw, firstName, lastInitial };
		});
}

function credentialsCsv(rows: BulkImportResponse["created"]): string {
	const header = "Vorname,Nachname-Initial,E-Mail,Passwort\n";
	const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
	const body = rows
		.map((r) =>
			[r.firstName, r.lastInitial, r.email, r.password].map(escape).join(",")
		)
		.join("\n");
	return header + body + "\n";
}

async function copyToClipboard(text: string): Promise<boolean> {
	try {
		if (navigator.clipboard && window.isSecureContext) {
			await navigator.clipboard.writeText(text);
			return true;
		}
		// Fallback for non-secure contexts (e.g. local IP testing on iPad).
		const ta = document.createElement("textarea");
		ta.value = text;
		ta.style.position = "fixed";
		ta.style.opacity = "0";
		document.body.appendChild(ta);
		ta.focus();
		ta.select();
		const ok = document.execCommand("copy");
		document.body.removeChild(ta);
		return ok;
	} catch {
		return false;
	}
}

function downloadCsv(filename: string, content: string) {
	const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
	void shareOrDownload(blob, filename);
}

function printCredentials(
	className: string,
	rows: BulkImportResponse["created"]
) {
	const w = window.open("", "_blank", "width=800,height=600");
	if (!w) {
		toast.error("Popup blockiert — bitte erlauben und erneut versuchen");
		return;
	}
	const esc = (s: string) =>
		s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	// One self-contained slip per student, with a dashed cut guide between
	// them so the teacher can snip the printout into individual strips.
	const strips = rows
		.map(
			(r, i) =>
				`<div class="strip">
		<div class="name">${esc(r.firstName)} ${esc(r.lastInitial)}</div>
		<div class="cred"><span class="label">E-Mail</span><span class="mono">${esc(r.email)}</span></div>
		<div class="cred"><span class="label">Passwort</span><span class="mono">${esc(r.password)}</span></div>
	</div>${
		i < rows.length - 1
			? `<div class="cut"><span><span class="sc">✂</span> hier abschneiden</span></div>`
			: ""
	}`
		)
		.join("");
	w.document.write(`<!doctype html>
<html lang="de"><head><meta charset="utf-8" />
<title>Zugangsdaten ${esc(className)}</title>
<style>
	body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
	h1 { font-size: 18px; margin: 0 0 4px 0; }
	p.note { font-size: 12px; color: #555; margin: 0 0 24px 0; }
	.strip { padding: 16px 4px; break-inside: avoid; }
	.name { font-weight: 600; font-size: 15px; margin-bottom: 8px; }
	.cred { font-size: 13px; margin: 3px 0; }
	.label { display: inline-block; width: 90px; color: #555; }
	.mono { font-family: ui-monospace, "SF Mono", Menlo, monospace; }
	/* Dashed cut guide with a centred scissors label sitting on the line. */
	.cut { text-align: center; border-top: 1px dashed #999; line-height: 0; margin: 6px 0; }
	.cut span { background: #fff; padding: 0 10px; font-size: 10px; color: #888; }
	/* Rotate just the scissors so it points right, not down. */
	.cut .sc { display: inline-block; transform: rotate(-90deg); background: none; padding: 0; }
	@media print { body { padding: 0; } }
</style></head><body>
<h1>Zugangsdaten — Klasse ${esc(className)}</h1>
<p class="note">Die Passwörter werden nicht gespeichert. Bitte jetzt ausdrucken. Tipp: an den gestrichelten Linien (✂) ausschneiden — so bekommt jede:r Schüler:in einen eigenen Zettel.</p>
${strips}
<script>window.print();</script>
</body></html>`);
	w.document.close();
}

const ClassDetailManagement: React.FC = () => {
	const { currentUser } = useAuth();
	const router = useRouter();
	const params = useSearchParams();
	const classId = params.get("id") ?? "";

	const [cls, setCls] = useState<Class | null>(null);
	const [students, setStudents] = useState<Student[]>([]);
	const [loading, setLoading] = useState(true);

	// Bulk import
	const [roster, setRoster] = useState("");
	const [importing, setImporting] = useState(false);
	const [importOpen, setImportOpen] = useState(false);
	const [resultOpen, setResultOpen] = useState(false);
	const [result, setResult] = useState<BulkImportResponse | null>(null);

	// Class actions
	const [renameOpen, setRenameOpen] = useState(false);
	const [renameValue, setRenameValue] = useState("");
	const [renaming, setRenaming] = useState(false);
	const [deleteClassOpen, setDeleteClassOpen] = useState(false);
	const [deletingClass, setDeletingClass] = useState(false);

	// Student actions
	const [editStudent, setEditStudent] = useState<Student | null>(null);
	const [editFirstName, setEditFirstName] = useState("");
	const [editLastInitial, setEditLastInitial] = useState("");
	const [savingStudent, setSavingStudent] = useState(false);
	const [deleteStudentTarget, setDeleteStudentTarget] =
		useState<Student | null>(null);
	const [deletingStudent, setDeletingStudent] = useState(false);
	// Password reset: confirm target → call → show the new password once.
	const [resetTarget, setResetTarget] = useState<Student | null>(null);
	const [resetting, setResetting] = useState(false);
	const [resetResult, setResetResult] = useState<ResetPasswordResult | null>(
		null
	);

	const parsed = useMemo(() => parseRoster(roster), [roster]);
	const validParsed = parsed.filter((p) => !p.error);
	const hasErrors = parsed.some((p) => p.error);

	const reloadStudents = async () => {
		if (!currentUser) return;
		const updated = await getStudentsByClass(currentUser.uid, classId);
		setStudents(updated);
	};

	useEffect(() => {
		if (!currentUser || !classId) return;
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const [c, sts] = await Promise.all([
					getClass(classId),
					getStudentsByClass(currentUser.uid, classId),
				]);
				if (cancelled) return;
				if (!c) {
					toast.error("Klasse nicht gefunden");
					router.push("/classes");
					return;
				}
				if (c.teacherId !== currentUser.uid) {
					toast.error("Keine Berechtigung für diese Klasse");
					router.push("/classes");
					return;
				}
				setCls(c);
				setStudents(sts);
			} catch (err) {
				console.error(err);
				toast.error("Fehler beim Laden der Klasse");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [currentUser, classId, router]);

	const handleImport = async () => {
		if (!cls || validParsed.length === 0) return;
		if (hasErrors) {
			toast.error("Bitte fehlerhafte Zeilen korrigieren oder entfernen");
			return;
		}

		setImporting(true);
		const promise = bulkImportStudents(
			classId,
			validParsed.map((p) => ({
				firstName: p.firstName,
				lastInitial: p.lastInitial,
			}))
		);
		toast.promise(promise, {
			loading: `Erstelle ${validParsed.length} Zugangsdaten…`,
			success: (data) =>
				data.failed.length > 0
					? `${data.created.length} erstellt, ${data.failed.length} fehlgeschlagen`
					: `${data.created.length} Zugangsdaten erstellt`,
			error: "Fehler beim Erstellen",
		});

		try {
			const res = await promise;
			setResult(res);
			setResultOpen(true);
			setImportOpen(false);
			setRoster("");
			await reloadStudents();
		} catch (err) {
			console.error(err);
		} finally {
			setImporting(false);
		}
	};

	const openRename = () => {
		setRenameValue(cls?.name ?? "");
		setRenameOpen(true);
	};

	const handleRename = async () => {
		if (!cls) return;
		const name = renameValue.trim();
		if (!name) {
			toast.error("Bitte einen Namen eingeben");
			return;
		}
		if (name === cls.name) {
			setRenameOpen(false);
			return;
		}
		setRenaming(true);
		try {
			await renameClass(classId, name);
			setCls({ ...cls, name });
			toast.success("Klasse umbenannt");
			setRenameOpen(false);
		} catch (err) {
			console.error(err);
			toast.error("Fehler beim Umbenennen");
		} finally {
			setRenaming(false);
		}
	};

	const handleDeleteClass = async () => {
		setDeletingClass(true);
		const promise = deleteClass(classId);
		toast.promise(promise, {
			loading: `Lösche Klasse${students.length > 0 ? ` und ${students.length} Schüler:innen` : ""}…`,
			success: (data) =>
				data.classDeleted
					? "Klasse gelöscht"
					: `${data.deletedStudentCount} Schüler:innen gelöscht, Klasse konnte nicht entfernt werden`,
			error: "Fehler beim Löschen",
		});
		try {
			const data = await promise;
			if (data.classDeleted) {
				router.push("/classes");
			} else {
				setDeleteClassOpen(false);
				await reloadStudents();
			}
		} catch (err) {
			console.error(err);
		} finally {
			setDeletingClass(false);
		}
	};

	const openEditStudent = (s: Student) => {
		setEditStudent(s);
		setEditFirstName(s.firstName);
		setEditLastInitial(s.lastInitial);
	};

	const handleSaveStudent = async () => {
		if (!editStudent) return;
		const firstName = editFirstName.trim();
		const lastInitial = editLastInitial.trim();
		if (!firstName || !lastInitial) {
			toast.error("Vorname und Nachname-Initial sind erforderlich");
			return;
		}
		if (
			firstName === editStudent.firstName &&
			lastInitial === editStudent.lastInitial
		) {
			setEditStudent(null);
			return;
		}
		setSavingStudent(true);
		try {
			await updateStudent(editStudent.id, { firstName, lastInitial });
			setStudents((prev) =>
				prev
					.map((s) =>
						s.id === editStudent.id ? { ...s, firstName, lastInitial } : s
					)
					.sort(compareStudents)
			);
			toast.success("Schüler:in aktualisiert");
			setEditStudent(null);
		} catch (err: any) {
			console.error(err);
			toast.error(err?.message ?? "Fehler beim Aktualisieren");
		} finally {
			setSavingStudent(false);
		}
	};

	const handleDeleteStudent = async () => {
		if (!deleteStudentTarget) return;
		setDeletingStudent(true);
		try {
			await deleteStudent(deleteStudentTarget.id);
			setStudents((prev) =>
				prev.filter((s) => s.id !== deleteStudentTarget.id)
			);
			toast.success("Schüler:in gelöscht");
			setDeleteStudentTarget(null);
		} catch (err: any) {
			console.error(err);
			toast.error(err?.message ?? "Fehler beim Löschen");
		} finally {
			setDeletingStudent(false);
		}
	};

	const handleResetPassword = async () => {
		if (!resetTarget) return;
		setResetting(true);
		try {
			const res = await resetStudentPassword(resetTarget.id);
			setResetTarget(null);
			setResetResult(res);
		} catch (err: any) {
			console.error(err);
			toast.error(err?.message ?? "Passwort konnte nicht zurückgesetzt werden");
		} finally {
			setResetting(false);
		}
	};

	if (!classId) {
		return (
			<PageShell title="Klasse" backHref="/classes" backLabel="Klassen">
				<p className="text-muted-foreground">Keine Klassen-ID angegeben.</p>
			</PageShell>
		);
	}

	return (
		<PageShell
			title={loading ? "Laden…" : cls?.name ?? "Klasse"}
			backHref="/classes"
			backLabel="Klassen"
			actions={
				!loading && cls ? (
					<>
						<Button
							variant="outline"
							size="sm"
							onClick={openRename}
							aria-label="Klasse umbenennen"
						>
							<Pencil className="h-4 w-4 mr-2" />
							Umbenennen
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setDeleteClassOpen(true)}
							aria-label="Klasse löschen"
							className="text-destructive"
						>
							<Trash2 className="h-4 w-4 mr-2" />
							Löschen
						</Button>
					</>
				) : undefined
			}
		>
			{loading ? (
				<Card>
					<CardContent className="p-5 space-y-3">
						<div className="flex items-center justify-between gap-3 mb-3">
							<Skeleton className="h-5 w-40" />
							<Skeleton className="h-9 w-32" />
						</div>
						{[0, 1, 2, 3, 4].map((i) => (
							<div key={i} className="flex items-center gap-3 py-2">
								<div className="flex-1 space-y-1.5">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-48" />
								</div>
								<Skeleton className="h-8 w-8 rounded-md" />
								<Skeleton className="h-8 w-8 rounded-md" />
							</div>
						))}
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardContent className="p-5">
						<div className="flex items-center justify-between gap-3 mb-3">
							<h2 className="text-lg font-semibold">
								Schüler:innen ({students.length})
							</h2>
							<Button
								onClick={() => setImportOpen(true)}
								className="gap-2"
							>
								<UserPlus className="h-4 w-4" />
								Importieren
							</Button>
						</div>
						{students.length === 0 ? (
							<p className="text-sm text-muted-foreground py-6 text-center">
								Noch keine Schüler:innen in dieser Klasse. Klicke auf
								„Importieren", um Zugänge anzulegen.
							</p>
						) : (
							<ul className="divide-y">
								{students.map((s) => (
									<li
										key={s.id}
										className="py-2 flex items-center gap-3"
									>
										<div className="flex-1 min-w-0">
											<div className="font-medium truncate">
												{s.firstName} {s.lastInitial}
											</div>
											<div className="text-xs text-muted-foreground font-mono truncate">
												{s.synthEmail}
											</div>
										</div>
										<div className="flex items-center gap-1 shrink-0">
											<Button
												variant="ghost"
												size="icon"
												className="h-11 w-11"
												onClick={() => openEditStudent(s)}
												aria-label="Bearbeiten"
											>
												<Pencil className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-11 w-11"
												onClick={() => setResetTarget(s)}
												aria-label="Passwort zurücksetzen"
												title="Passwort zurücksetzen"
											>
												<KeyRound className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-11 w-11 text-destructive"
												onClick={() => setDeleteStudentTarget(s)}
												aria-label="Löschen"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
			)}

			{/* Bulk import dialog */}
			<Dialog
				open={importOpen}
				onOpenChange={(open) => {
					if (!importing) setImportOpen(open);
				}}
			>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Schüler:innen importieren</DialogTitle>
						<DialogDescription>
							Eine Schüler:in pro Zeile: <strong>Vorname</strong>, dann
							Leerzeichen, dann <strong>Initial des Nachnamens</strong>.
							Mehrteilige Vornamen sind erlaubt — das letzte Wort gilt
							immer als Initial. Komma, Semikolon oder Tab funktionieren
							auch (z. B. aus Excel).
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-2 py-1">
						<Label htmlFor="roster" className="sr-only">
							Schülerliste
						</Label>
						<Textarea
							id="roster"
							value={roster}
							onChange={(e) => setRoster(e.target.value)}
							placeholder={"Anna B\nMax M\nLea S"}
							rows={10}
							className="font-mono text-sm"
							disabled={importing}
						/>

						{parsed.length > 0 && (
							<div className="text-xs text-muted-foreground">
								{validParsed.length} gültig
								{hasErrors && (
									<span className="text-destructive ml-2">
										· {parsed.length - validParsed.length} fehlerhaft
									</span>
								)}
							</div>
						)}

						{hasErrors && (
							<ul className="text-xs text-destructive space-y-1 max-h-24 overflow-y-auto">
								{parsed
									.filter((p) => p.error)
									.map((p, i) => (
										<li key={i}>
											<span className="font-mono">„{p.raw}"</span>:{" "}
											{p.error}
										</li>
									))}
							</ul>
						)}
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setImportOpen(false)}
							disabled={importing}
						>
							Abbrechen
						</Button>
						<Button
							onClick={handleImport}
							disabled={
								importing || validParsed.length === 0 || hasErrors
							}
						>
							{importing ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Erstelle…
								</>
							) : (
								<>
									<UserPlus className="h-4 w-4 mr-2" />
									{validParsed.length > 0
										? `${validParsed.length} importieren`
										: "Importieren"}
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Result modal */}
			<Dialog open={resultOpen} onOpenChange={setResultOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Zugangsdaten</DialogTitle>
						<DialogDescription>
							Die Passwörter werden nicht gespeichert und sind nur jetzt
							einsehbar. Bitte herunterladen oder ausdrucken.
						</DialogDescription>
					</DialogHeader>

					{result && (
						<>
							{result.created.length > 0 && (
								<div className="max-h-80 overflow-y-auto border rounded-md">
									<table className="w-full text-sm">
										<thead className="bg-muted/50">
											<tr>
												<th className="text-left p-2">Name</th>
												<th className="text-left p-2">E-Mail</th>
												<th className="text-left p-2">Passwort</th>
												<th className="w-10 p-2 sr-only">Kopieren</th>
											</tr>
										</thead>
										<tbody>
											{result.created.map((r) => (
												<tr key={r.uid} className="border-t">
													<td className="p-2">
														{r.firstName} {r.lastInitial}
													</td>
													<td className="p-2 font-mono text-xs">{r.email}</td>
													<td className="p-2 font-mono">{r.password}</td>
													<td className="p-1 text-right">
														<Button
															variant="ghost"
															size="icon"
															className="h-11 w-11"
															onClick={async () => {
																const ok = await copyToClipboard(r.password);
																if (ok) {
																	toast.success(
																		`Passwort für ${r.firstName} kopiert`
																	);
																} else {
																	toast.error("Kopieren fehlgeschlagen");
																}
															}}
															aria-label={`Passwort für ${r.firstName} ${r.lastInitial} kopieren`}
														>
															<Copy className="h-4 w-4" />
														</Button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}

							{result.failed.length > 0 && (
								<div className="mt-3 text-sm">
									<p className="font-medium text-destructive mb-1">
										{result.failed.length} fehlgeschlagen:
									</p>
									<ul className="text-xs text-destructive space-y-1">
										{result.failed.map((f, i) => (
											<li key={i}>
												{f.firstName} {f.lastInitial}: {f.error}
											</li>
										))}
									</ul>
								</div>
							)}
						</>
					)}

					<DialogFooter className="gap-2">
						<Button
							variant="outline"
							onClick={() =>
								result &&
								downloadCsv(
									`zugangsdaten-${cls?.name ?? "klasse"}.csv`,
									credentialsCsv(result.created)
								)
							}
							disabled={!result || result.created.length === 0}
						>
							<Download className="h-4 w-4 mr-2" />
							CSV
						</Button>
						<Button
							variant="outline"
							onClick={() =>
								result &&
								cls &&
								printCredentials(cls.name, result.created)
							}
							disabled={!result || result.created.length === 0}
						>
							<Printer className="h-4 w-4 mr-2" />
							Drucken
						</Button>
						<Button onClick={() => setResultOpen(false)}>Fertig</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Rename class dialog */}
			<Dialog open={renameOpen} onOpenChange={setRenameOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Klasse umbenennen</DialogTitle>
					</DialogHeader>
					<div className="grid gap-2 py-2">
						<Label htmlFor="class-rename">Name</Label>
						<Input
							id="class-rename"
							autoFocus
							value={renameValue}
							onChange={(e) => setRenameValue(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !renaming) handleRename();
							}}
						/>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setRenameOpen(false)}
							disabled={renaming}
						>
							Abbrechen
						</Button>
						<Button onClick={handleRename} disabled={renaming}>
							{renaming ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Speichern…
								</>
							) : (
								"Speichern"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete class confirm */}
			<AlertDialog open={deleteClassOpen} onOpenChange={setDeleteClassOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Klasse löschen?</AlertDialogTitle>
						<AlertDialogDescription>
							Diese Aktion kann nicht rückgängig gemacht werden.
							{students.length > 0 && (
								<>
									{" "}
									Die Klasse enthält noch{" "}
									<strong>
										{students.length} Schüler:in
										{students.length === 1 ? "" : "nen"}
									</strong>
									. Diese werden ebenfalls gelöscht (Zugang verfällt sofort).
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deletingClass}>
							Abbrechen
						</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={(e) => {
								e.preventDefault();
								handleDeleteClass();
							}}
							disabled={deletingClass}
						>
							{deletingClass ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Lösche…
								</>
							) : (
								"Endgültig löschen"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Edit student */}
			<Dialog
				open={!!editStudent}
				onOpenChange={(open) => {
					if (!open) setEditStudent(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Schüler:in bearbeiten</DialogTitle>
						<DialogDescription>
							E-Mail und Passwort bleiben unverändert.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-2">
						<div className="grid gap-2">
							<Label htmlFor="edit-first">Vorname</Label>
							<Input
								id="edit-first"
								autoFocus
								value={editFirstName}
								onChange={(e) => setEditFirstName(e.target.value)}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-initial">Nachname-Initial</Label>
							<Input
								id="edit-initial"
								value={editLastInitial}
								onChange={(e) => setEditLastInitial(e.target.value)}
								maxLength={3}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setEditStudent(null)}
							disabled={savingStudent}
						>
							Abbrechen
						</Button>
						<Button onClick={handleSaveStudent} disabled={savingStudent}>
							{savingStudent ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Speichern…
								</>
							) : (
								"Speichern"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete student confirm */}
			<AlertDialog
				open={!!deleteStudentTarget}
				onOpenChange={(open) => {
					if (!open) setDeleteStudentTarget(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Schüler:in löschen?</AlertDialogTitle>
						<AlertDialogDescription>
							{deleteStudentTarget && (
								<>
									<strong>
										{deleteStudentTarget.firstName}{" "}
										{deleteStudentTarget.lastInitial}
									</strong>{" "}
									wird endgültig gelöscht. Der Zugang verfällt sofort.
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deletingStudent}>
							Abbrechen
						</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={(e) => {
								e.preventDefault();
								handleDeleteStudent();
							}}
							disabled={deletingStudent}
						>
							{deletingStudent ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Lösche…
								</>
							) : (
								"Endgültig löschen"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Reset password confirm */}
			<AlertDialog
				open={!!resetTarget}
				onOpenChange={(open) => {
					if (!open && !resetting) setResetTarget(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Passwort zurücksetzen?</AlertDialogTitle>
						<AlertDialogDescription>
							{resetTarget && (
								<>
									Für{" "}
									<strong>
										{resetTarget.firstName} {resetTarget.lastInitial}
									</strong>{" "}
									wird ein neues Passwort erzeugt. Das aktuelle Passwort wird
									sofort ungültig. Das neue Passwort wird danach einmalig
									angezeigt.
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={resetting}>
							Abbrechen
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								handleResetPassword();
							}}
							disabled={resetting}
						>
							{resetting ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Setze zurück…
								</>
							) : (
								"Neues Passwort erzeugen"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* New password result */}
			<Dialog
				open={!!resetResult}
				onOpenChange={(open) => {
					if (!open) setResetResult(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Neues Passwort</DialogTitle>
						<DialogDescription>
							Das Passwort wird nicht gespeichert und ist nur jetzt
							einsehbar. Bitte notieren und an die Schüler:in weitergeben.
						</DialogDescription>
					</DialogHeader>
					{resetResult && (
						<div className="space-y-3 py-1">
							<div className="text-sm">
								<span className="font-medium">
									{resetResult.firstName} {resetResult.lastInitial}
								</span>
								<div className="text-xs text-muted-foreground font-mono">
									{resetResult.email}
								</div>
							</div>
							<div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3">
								<code className="flex-1 font-mono text-base break-all">
									{resetResult.password}
								</code>
								<Button
									variant="ghost"
									size="icon"
									className="h-11 w-11 shrink-0"
									aria-label="Passwort kopieren"
									onClick={async () => {
										const ok = await copyToClipboard(resetResult.password);
										if (ok) toast.success("Passwort kopiert");
										else toast.error("Kopieren fehlgeschlagen");
									}}
								>
									<Copy className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button onClick={() => setResetResult(null)}>Fertig</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageShell>
	);
};

export default ClassDetailManagement;
