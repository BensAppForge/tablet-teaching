"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
	ArrowLeft,
	Copy,
	Download,
	KeyRound,
	Loader2,
	RefreshCw,
	Users,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import {
	getTest,
	setAssignedClasses,
	updateTest,
	Question,
	Test,
} from "@/lib/firebase/tests";
import { Class, getTeacherClasses } from "@/lib/firebase/classes";
import {
	createQuickCode,
	deleteQuickCode,
	findUniqueQuickCode,
} from "@/lib/firebase/quickAccess";
import { getStrings, mapTargetLanguageToLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const ShareTestManagement: React.FC = () => {
	const router = useRouter();
	const params = useSearchParams();
	const testId = params.get("id") ?? "";
	const { currentUser } = useAuth();

	const [test, setTest] = useState<Test | null>(null);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [classes, setClasses] = useState<Class[]>([]);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [assigningClass, setAssigningClass] = useState<string | null>(null);
	const [generatingEmptyPdf, setGeneratingEmptyPdf] = useState(false);

	useEffect(() => {
		if (!testId || !currentUser) return;
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const [{ test, questions }, klasses] = await Promise.all([
					getTest(testId),
					getTeacherClasses(currentUser.uid),
				]);
				if (cancelled) return;
				if (test.teacherId !== currentUser.uid) {
					toast.error("Keine Berechtigung für diesen Test");
					router.push("/tests");
					return;
				}
				setTest(test);
				setQuestions(questions);
				setClasses(klasses);
			} catch (err) {
				console.error(err);
				toast.error("Fehler beim Laden des Tests");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [testId, currentUser, router]);

	const quickCode = test?.quickCode ?? null;

	// URL the QR code encodes. Prefers NEXT_PUBLIC_APP_URL when set so a
	// production deploy never accidentally emits localhost QR codes from
	// a developer machine; falls back to window.location.origin otherwise.
	const quickUrl = useMemo(() => {
		if (!quickCode) return null;
		const envOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
		const origin =
			envOrigin ||
			(typeof window !== "undefined" ? window.location.origin : null);
		if (!origin) return null;
		return `${origin}/student/quick?code=${quickCode}`;
	}, [quickCode]);

	const enableQuickAccess = async () => {
		if (!test || !currentUser) return;
		setBusy(true);
		try {
			const code = await findUniqueQuickCode();
			await createQuickCode(code, test.id!, currentUser.uid);
			await updateTest(test.id!, { quickCode: code });
			setTest({ ...test, quickCode: code });
			toast.success("Schnellzugang aktiviert");
		} catch (err) {
			console.error(err);
			toast.error("Schnellzugang konnte nicht aktiviert werden");
		} finally {
			setBusy(false);
		}
	};

	const disableQuickAccess = async () => {
		if (!test || !quickCode) return;
		setBusy(true);
		try {
			await deleteQuickCode(quickCode);
			await updateTest(test.id!, { quickCode: undefined });
			setTest({ ...test, quickCode: undefined });
			toast.success("Schnellzugang deaktiviert");
		} catch (err) {
			console.error(err);
			toast.error("Schnellzugang konnte nicht deaktiviert werden");
		} finally {
			setBusy(false);
		}
	};

	const rotateCode = async () => {
		if (!test || !currentUser || !quickCode) return;
		setBusy(true);
		try {
			const next = await findUniqueQuickCode();
			await createQuickCode(next, test.id!, currentUser.uid);
			await updateTest(test.id!, { quickCode: next });
			await deleteQuickCode(quickCode);
			setTest({ ...test, quickCode: next });
			toast.success("Neuer Code erzeugt");
		} catch (err) {
			console.error(err);
			toast.error("Code konnte nicht neu erzeugt werden");
		} finally {
			setBusy(false);
		}
	};

	const copyCode = () => {
		if (!quickCode || typeof navigator === "undefined" || !navigator.clipboard)
			return;
		navigator.clipboard
			.writeText(quickCode)
			.then(() => toast.success("Code kopiert"))
			.catch(() => toast.error("Kopieren fehlgeschlagen"));
	};

	const copyLink = () => {
		if (!quickUrl || typeof navigator === "undefined" || !navigator.clipboard)
			return;
		navigator.clipboard
			.writeText(quickUrl)
			.then(() => toast.success("Link kopiert"))
			.catch(() => toast.error("Kopieren fehlgeschlagen"));
	};

	const handleDownloadEmptyPdf = async () => {
		if (!test) return;
		setGeneratingEmptyPdf(true);
		try {
			const strings = getStrings(
				mapTargetLanguageToLocale(test.targetLanguage)
			);
			const [{ pdf }, { EmptyWorksheetPDF }] = await Promise.all([
				import("@react-pdf/renderer"),
				import("@/components/student/EmptyWorksheetPDF"),
			]);
			const blob = await pdf(
				<EmptyWorksheetPDF
					testTitle={test.title}
					testDescription={test.description}
					questions={questions}
					strings={strings}
				/>
			).toBlob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			const slug = (s: string) =>
				s
					.normalize("NFKD")
					.replace(/[̀-ͯ]/g, "")
					.replace(/[^a-zA-Z0-9]+/g, "-")
					.replace(/^-+|-+$/g, "")
					.toLowerCase() || "arbeitsblatt";
			a.download = `${slug(test.title)}-leer.pdf`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error(err);
			toast.error("PDF konnte nicht erstellt werden");
		} finally {
			setGeneratingEmptyPdf(false);
		}
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!test) {
		return (
			<div className="container mx-auto px-4 py-6">
				<p className="text-muted-foreground">Test nicht gefunden.</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-6 max-w-3xl">
			<div className="flex items-center gap-2 mb-4">
				<Button
					variant="outline"
					size="sm"
					className="gap-1 text-muted-foreground"
					onClick={() => router.push("/tests")}
				>
					<ArrowLeft className="h-4 w-4" />
					<span>Tests</span>
				</Button>
			</div>

			<div className="border-b mb-6">
				<h1 className="text-2xl font-semibold py-2 text-gray-700 dark:text-gray-200">
					Teilen: {test.title}
				</h1>
			</div>

			{/* Schnellzugang */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle>Schnellzugang</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Schüler:innen melden sich anonym mit Namen und Code an. Der
						Zugang verfällt nach 24 Stunden automatisch.
					</p>
					<div className="flex items-center gap-3">
						<Switch
							id="quick-toggle"
							checked={!!quickCode}
							disabled={busy}
							onCheckedChange={(checked) =>
								checked ? enableQuickAccess() : disableQuickAccess()
							}
						/>
						<Label
							htmlFor="quick-toggle"
							className="text-sm font-normal cursor-pointer"
						>
							Schnellzugang aktivieren
						</Label>
						{busy && (
							<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
						)}
					</div>

					{quickCode && (
						<div className="flex flex-col md:flex-row gap-6 pt-2">
							<div className="flex-1 space-y-3">
								<div>
									<Label className="text-xs text-muted-foreground">
										Code zum Diktieren
									</Label>
									<div className="flex items-center gap-2 mt-1">
										<div className="relative flex-1">
											<KeyRound className="absolute left-2.5 top-2.5 h-5 w-5 text-muted-foreground" />
											<Input
												readOnly
												value={quickCode}
												className="pl-10 font-mono tracking-widest text-base"
											/>
										</div>
										<Button
											type="button"
											variant="outline"
											size="icon"
											aria-label="Code kopieren"
											onClick={copyCode}
										>
											<Copy className="h-4 w-4" />
										</Button>
									</div>
								</div>
								<div>
									<Label className="text-xs text-muted-foreground">
										Direkter Link
									</Label>
									<div className="flex items-center gap-2 mt-1">
										<Input
											readOnly
											value={quickUrl ?? ""}
											className="text-xs"
										/>
										<Button
											type="button"
											variant="outline"
											size="icon"
											aria-label="Link kopieren"
											onClick={copyLink}
										>
											<Copy className="h-4 w-4" />
										</Button>
									</div>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={rotateCode}
									disabled={busy}
								>
									<RefreshCw className="h-4 w-4 mr-2" />
									Neuen Code erzeugen
								</Button>
							</div>
							{quickUrl && (
								<div className="flex flex-col items-center gap-2 shrink-0">
									<div className="p-3 bg-white rounded-md border">
										<QRCodeSVG value={quickUrl} size={160} />
									</div>
									<p className="text-xs text-muted-foreground text-center max-w-[12rem]">
										Schüler:innen scannen den Code mit der iPad-Kamera.
									</p>
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Drucken */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle>Drucken</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-sm text-muted-foreground">
						Für Schüler:innen ohne iPad oder ohne Erlaubnis der Eltern: ein
						leeres Arbeitsblatt zum Ausdrucken und Ausfüllen mit Stift und
						Papier.
					</p>
					<Button
						type="button"
						onClick={handleDownloadEmptyPdf}
						disabled={generatingEmptyPdf || questions.length === 0}
					>
						{generatingEmptyPdf ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Erstelle PDF…
							</>
						) : (
							<>
								<Download className="h-4 w-4 mr-2" />
								Leeres Arbeitsblatt herunterladen
							</>
						)}
					</Button>
				</CardContent>
			</Card>

			{/* Klassen-Zuweisung */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						An Klassen zuweisen
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-sm text-muted-foreground">
						Nur Schüler:innen einer zugewiesenen Klasse sehen den Test in
						ihrem Bereich. Schnellzugang funktioniert unabhängig davon.
					</p>
					{classes.length === 0 ? (
						<div className="text-sm text-muted-foreground italic">
							Sie haben noch keine Klassen angelegt.{" "}
							<button
								type="button"
								className="text-primary hover:underline"
								onClick={() => router.push("/classes")}
							>
								Klasse anlegen
							</button>
						</div>
					) : (
						<ul className="divide-y border rounded-md">
							{classes.map((c) => {
								const assigned =
									!!c.id &&
									(test.assignedClassIds ?? []).includes(c.id);
								const pending = assigningClass === c.id;
								return (
									<li
										key={c.id}
										className="flex items-center gap-3 p-3"
									>
										<Checkbox
											id={`assign-${c.id}`}
											checked={assigned}
											disabled={pending}
											onCheckedChange={async (next) => {
												if (!c.id) return;
												setAssigningClass(c.id);
												const current =
													test.assignedClassIds ?? [];
												const updated = next
													? Array.from(new Set([...current, c.id]))
													: current.filter((id) => id !== c.id);
												try {
													await setAssignedClasses(
														test.id!,
														updated
													);
													setTest({
														...test,
														assignedClassIds: updated,
													});
												} catch (err) {
													console.error(err);
													toast.error(
														"Zuweisung konnte nicht gespeichert werden"
													);
												} finally {
													setAssigningClass(null);
												}
											}}
										/>
										<Label
											htmlFor={`assign-${c.id}`}
											className="flex-1 cursor-pointer text-sm font-normal"
										>
											{c.name}
										</Label>
										{pending && (
											<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
										)}
									</li>
								);
							})}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
};

export default ShareTestManagement;
