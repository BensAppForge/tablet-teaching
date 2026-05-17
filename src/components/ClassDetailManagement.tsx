"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	ArrowLeft,
	Download,
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
	Student,
	updateStudent,
} from "@/lib/firebase/students";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
		.split("\n")
		.map((raw) => raw.trim())
		.filter((raw) => raw.length > 0)
		.map((raw) => {
			const parts = raw.split(/\s+/);
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

function downloadCsv(filename: string, content: string) {
	const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
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
	const tableRows = rows
		.map(
			(r) => `<tr>
				<td>${r.firstName} ${r.lastInitial}</td>
				<td class="mono">${r.email}</td>
				<td class="mono">${r.password}</td>
			</tr>`
		)
		.join("");
	w.document.write(`<!doctype html>
<html lang="de"><head><meta charset="utf-8" />
<title>Zugangsdaten ${className}</title>
<style>
	body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
	h1 { font-size: 18px; margin: 0 0 4px 0; }
	p.note { font-size: 12px; color: #555; margin: 0 0 20px 0; }
	table { border-collapse: collapse; width: 100%; font-size: 13px; }
	th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
	th { background: #f0f0f0; }
	.mono { font-family: ui-monospace, "SF Mono", Menlo, monospace; }
	@media print { body { padding: 0; } }
</style></head><body>
<h1>Zugangsdaten — Klasse ${className}</h1>
<p class="note">Die Passwörter werden nicht gespeichert. Bitte jetzt notieren oder ausdrucken.</p>
<table>
	<thead><tr><th>Name</th><th>E-Mail</th><th>Passwort</th></tr></thead>
	<tbody>${tableRows}</tbody>
</table>
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

	if (!classId) {
		return (
			<div className="container mx-auto px-4 py-6">
				<p className="text-muted-foreground">Keine Klassen-ID angegeben.</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-6">
			<div className="flex items-center gap-2 mb-4">
				<Button
					variant="outline"
					size="sm"
					className="gap-1 text-muted-foreground"
					onClick={() => router.push("/classes")}
				>
					<ArrowLeft className="h-4 w-4" />
					<span>Klassen</span>
				</Button>
			</div>

			<div className="border-b mb-6 flex items-center justify-between gap-3">
				<h1 className="text-2xl font-semibold py-2 text-gray-700 dark:text-gray-200 truncate">
					{loading ? "Laden…" : cls?.name ?? "Klasse"}
				</h1>
				{!loading && cls && (
					<div className="flex items-center gap-2 shrink-0">
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
					</div>
				)}
			</div>

			{loading ? (
				<div className="flex justify-center items-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			) : (
				<div className="grid gap-6 lg:grid-cols-2">
					{/* Existing students */}
					<Card>
						<CardContent className="p-5">
							<h2 className="text-lg font-semibold mb-3">
								Schüler:innen ({students.length})
							</h2>
							{students.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									Noch keine Schüler:innen in dieser Klasse.
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
													className="h-8 w-8"
													onClick={() => openEditStudent(s)}
													aria-label="Bearbeiten"
												>
													<Pencil className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 text-destructive"
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

					{/* Bulk import */}
					<Card>
						<CardContent className="p-5">
							<h2 className="text-lg font-semibold mb-1">
								Schüler:innen importieren
							</h2>
							<p className="text-sm text-muted-foreground mb-3">
								Eine Schüler:in pro Zeile: <strong>Vorname</strong>, dann
								Leerzeichen, dann <strong>Initial des Nachnamens</strong>.
								Mehrteilige Vornamen sind erlaubt — das letzte Wort gilt
								immer als Initial.
								<br />
								<code className="text-xs">Anna B</code>,{" "}
								<code className="text-xs">Anna Maria S</code>,{" "}
								<code className="text-xs">Max von M</code>
							</p>

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
								<div className="text-xs text-muted-foreground mt-2">
									{validParsed.length} gültig
									{hasErrors && (
										<span className="text-destructive ml-2">
											· {parsed.length - validParsed.length} fehlerhaft
										</span>
									)}
								</div>
							)}

							{hasErrors && (
								<ul className="text-xs text-destructive mt-2 space-y-1">
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

							<div className="flex justify-end mt-4">
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
							</div>
						</CardContent>
					</Card>
				</div>
			)}

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
		</div>
	);
};

export default ClassDetailManagement;
