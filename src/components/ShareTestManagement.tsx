"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import {
	getTest,
	setAssignedClasses,
	Question,
	Test,
} from "@/lib/firebase/tests";
import { Class, getTeacherClasses } from "@/lib/firebase/classes";
import { getStrings, mapTargetLanguageToLocale } from "@/lib/i18n";
import { shareOrDownload } from "@/lib/download";
import PageShell from "@/components/PageShell";
import ErrorState from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

// "Klasse zuweisen" screen: assign a test to classes and print a blank
// worksheet. Schnellzugang (anonymous quick access) lives on its own
// screen now — see QuickAccessManagement.
const ShareTestManagement: React.FC = () => {
	const router = useRouter();
	const params = useSearchParams();
	const testId = params.get("id") ?? "";
	const { currentUser } = useAuth();

	const [test, setTest] = useState<Test | null>(null);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [classes, setClasses] = useState<Class[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);
	const [reloadKey, setReloadKey] = useState(0);
	const [assigningClass, setAssigningClass] = useState<string | null>(null);
	const [generatingEmptyPdf, setGeneratingEmptyPdf] = useState(false);

	useEffect(() => {
		if (!testId || !currentUser) return;
		let cancelled = false;
		(async () => {
			setLoading(true);
			setLoadError(false);
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
				if (cancelled) return;
				console.error(err);
				setLoadError(true);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [testId, currentUser, router, reloadKey]);

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
			const slug = (s: string) =>
				s
					.normalize("NFKD")
					.replace(/[̀-ͯ]/g, "")
					.replace(/[^a-zA-Z0-9]+/g, "-")
					.replace(/^-+|-+$/g, "")
					.toLowerCase() || "arbeitsblatt";
			await shareOrDownload(blob, `${slug(test.title)}-leer.pdf`);
		} catch (err) {
			console.error(err);
			toast.error("PDF konnte nicht erstellt werden");
		} finally {
			setGeneratingEmptyPdf(false);
		}
	};

	if (loading) {
		return (
			<PageShell title="Klasse zuweisen" backHref="/tests" backLabel="Tests">
				<div className="flex justify-center items-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			</PageShell>
		);
	}

	if (loadError) {
		return (
			<PageShell title="Klasse zuweisen" backHref="/tests" backLabel="Tests">
				<ErrorState onRetry={() => setReloadKey((k) => k + 1)} />
			</PageShell>
		);
	}

	if (!test) {
		return (
			<PageShell title="Klasse zuweisen" backHref="/tests" backLabel="Tests">
				<p className="text-muted-foreground">Test nicht gefunden.</p>
			</PageShell>
		);
	}

	return (
		<PageShell
			title={`Klasse zuweisen: ${test.title}`}
			backHref="/tests"
			backLabel="Tests"
			maxWidth="3xl"
		>
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
						ihrem Bereich. Für anonymen Zugang ohne Klasse nutze den
						Schnellzugang.
					</p>
					{classes.length === 0 ? (
						<div className="text-sm text-muted-foreground italic">
							Sie haben noch keine Klassen angelegt.{" "}
							<button
								type="button"
								className="text-accent hover:underline"
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
									<li key={c.id} className="flex items-center gap-3 p-3">
										<Checkbox
											id={`assign-${c.id}`}
											checked={assigned}
											disabled={pending}
											onCheckedChange={async (next) => {
												if (!c.id) return;
												setAssigningClass(c.id);
												const current = test.assignedClassIds ?? [];
												const updated = next
													? Array.from(new Set([...current, c.id]))
													: current.filter((id) => id !== c.id);
												try {
													await setAssignedClasses(test.id!, updated);
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
		</PageShell>
	);
};

export default ShareTestManagement;
