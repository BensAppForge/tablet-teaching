"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Loader2, Printer, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { Class, getClass } from "@/lib/firebase/classes";
import {
	BulkImportResponse,
	bulkImportStudents,
	getStudentsByClass,
	Student,
} from "@/lib/firebase/students";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
			// Last token = initial, everything before = first name
			// (handles multi-word first names like "Anna Maria B" or "Max von M").
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

	const [roster, setRoster] = useState("");
	const [importing, setImporting] = useState(false);

	const [resultOpen, setResultOpen] = useState(false);
	const [result, setResult] = useState<BulkImportResponse | null>(null);

	const parsed = useMemo(() => parseRoster(roster), [roster]);
	const validParsed = parsed.filter((p) => !p.error);
	const hasErrors = parsed.some((p) => p.error);

	useEffect(() => {
		if (!currentUser || !classId) return;
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const [c, sts] = await Promise.all([
					getClass(classId),
					getStudentsByClass(classId),
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
		try {
			const res = await bulkImportStudents(
				classId,
				validParsed.map((p) => ({
					firstName: p.firstName,
					lastInitial: p.lastInitial,
				}))
			);
			setResult(res);
			setResultOpen(true);
			setRoster("");
			const updated = await getStudentsByClass(classId);
			setStudents(updated);
		} catch (err: any) {
			console.error(err);
			toast.error(
				err?.message
					? `Import fehlgeschlagen: ${err.message}`
					: "Import fehlgeschlagen"
			);
		} finally {
			setImporting(false);
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

			<div className="border-b mb-6">
				<h1 className="text-2xl font-semibold py-2 text-gray-700 dark:text-gray-200">
					{loading ? "Laden…" : cls?.name ?? "Klasse"}
				</h1>
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
											className="py-2 flex items-center justify-between gap-3"
										>
											<span className="font-medium">
												{s.firstName} {s.lastInitial}
											</span>
											<span className="text-xs text-muted-foreground font-mono truncate">
												{s.synthEmail}
											</span>
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
												<span className="font-mono">„{p.raw}“</span>:{" "}
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
		</div>
	);
};

export default ClassDetailManagement;
