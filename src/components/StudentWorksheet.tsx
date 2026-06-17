"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Download, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { Class, getClass } from "@/lib/firebase/classes";
import {
	getTest,
	Test,
	Question,
	MultipleChoiceQuestion,
	TrueFalseQuestion,
	GapFillQuestion,
	MatchingQuestion,
	ReorderingQuestion,
} from "@/lib/firebase/tests";
import { getStrings, mapTargetLanguageToLocale } from "@/lib/i18n";
import type { Strings } from "@/lib/i18n/types";
import { shareOrDownload } from "@/lib/download";
import {
	gradeAll,
	GapAnswer,
	MCAnswer,
	MatchingAnswer,
	ReorderingAnswer,
	TFAnswer,
} from "@/lib/student/scoring";
import {
	clearAttempt,
	loadAttempt,
	saveAttempt,
	SubmissionResult,
} from "@/lib/student/storage";
import {
	createSubmission,
	getLatestStudentSubmission,
} from "@/lib/firebase/submissions";
import { createQuickSubmission } from "@/lib/firebase/quickSubmissions";
import type { QuickRetention } from "@/lib/firebase/tests";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
	MultipleChoiceView,
	TrueFalseView,
	GapFillView,
	MatchingView,
	HorizontalReorderingView,
	VerticalReorderingView,
} from "@/components/student";

type Answers = Record<string, unknown>;

function renderQuestion(
	q: Question,
	displayIndex: number,
	answer: unknown,
	onAnswer: (a: unknown) => void,
	mode: "take" | "review",
	strings: Strings
): React.ReactNode {
	const ws = strings.worksheet;
	switch (q.type) {
		case "multiple-choice":
			return (
				<MultipleChoiceView
					question={q as MultipleChoiceQuestion}
					index={displayIndex}
					answer={answer as MCAnswer | undefined}
					onAnswer={onAnswer as (a: MCAnswer) => void}
					mode={mode}
					strings={ws}
				/>
			);
		case "true-false":
			return (
				<TrueFalseView
					question={q as TrueFalseQuestion}
					index={displayIndex}
					answer={answer as TFAnswer | undefined}
					onAnswer={onAnswer as (a: TFAnswer) => void}
					mode={mode}
					strings={ws}
				/>
			);
		case "gap-fill":
			return (
				<GapFillView
					question={q as GapFillQuestion}
					index={displayIndex}
					answer={answer as GapAnswer | undefined}
					onAnswer={onAnswer as (a: GapAnswer) => void}
					mode={mode}
					strings={ws}
				/>
			);
		case "matching":
			return (
				<MatchingView
					question={q as MatchingQuestion}
					index={displayIndex}
					answer={answer as MatchingAnswer | undefined}
					onAnswer={onAnswer as (a: MatchingAnswer) => void}
					mode={mode}
					strings={ws}
				/>
			);
		case "reordering-horizontal":
			return (
				<HorizontalReorderingView
					question={q as ReorderingQuestion}
					index={displayIndex}
					answer={answer as ReorderingAnswer | undefined}
					onAnswer={onAnswer as (a: ReorderingAnswer) => void}
					mode={mode}
					strings={ws}
				/>
			);
		case "reordering-vertical":
			return (
				<VerticalReorderingView
					question={q as ReorderingQuestion}
					index={displayIndex}
					answer={answer as ReorderingAnswer | undefined}
					onAnswer={onAnswer as (a: ReorderingAnswer) => void}
					mode={mode}
					strings={ws}
				/>
			);
		default:
			return (
				<p className="text-destructive text-sm">
					Unbekannter Fragentyp: {(q as any).type}
				</p>
			);
	}
}

const StudentWorksheet: React.FC = () => {
	const router = useRouter();
	const params = useSearchParams();
	const testId = params.get("id") ?? "";
	const { currentUser, role, studentData, anonAttempt } = useAuth();
	const [test, setTest] = useState<Test | null>(null);
	const [cls, setCls] = useState<Class | null>(null);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [loading, setLoading] = useState(true);

	const [answers, setAnswers] = useState<Answers>({});
	const [submitted, setSubmitted] = useState<SubmissionResult | null>(null);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [retakeOpen, setRetakeOpen] = useState(false);
	const [generatingPdf, setGeneratingPdf] = useState(false);
	// Sync bookkeeping (managed students only — Schnellzugang stays
	// local-only). `synced` tracks whether the current result reached
	// Firestore; `remoteSubmissionId` is the latest known remote doc;
	// `ignoreSubmissionId` marks a remote result superseded by a local
	// "Neu starten" so it doesn't resurrect on reload.
	const [synced, setSynced] = useState(true);
	const [remoteSubmissionId, setRemoteSubmissionId] = useState<string | null>(
		null
	);
	const [ignoreSubmissionId, setIgnoreSubmissionId] = useState<string | null>(
		null
	);

	// Marks which (user, test) the answer-related state currently belongs to.
	// Autosave is gated on this so a test switch can't persist the previous
	// test's answers under the new test's key: when testId changes, the ref
	// still points at the OLD test until this test's load finishes and sets
	// it, so the save effect no-ops in between (it otherwise fires in the
	// same commit as the testId change, before `loading` flips true).
	const loadedKeyRef = useRef<string | null>(null);

	// Load test + restore any saved attempt for this (user, test). Two
	// identity paths: managed students fetch their class; Schnellzugang
	// (anonymous) kids skip the class lookup and rely on anonAttempt
	// instead.
	useEffect(() => {
		if (!testId || !currentUser) return;
		const isAnon = role === "anonymous";
		if (!isAnon && !studentData) return;
		if (isAnon && !anonAttempt) return;
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const expectedTeacherId = isAnon
					? anonAttempt!.teacherId
					: studentData!.teacherId;
				const [{ test, questions }, klass] = await Promise.all([
					getTest(testId),
					isAnon
						? Promise.resolve(null)
						: getClass(studentData!.classId),
				]);
				if (cancelled) return;
				if (test.teacherId !== expectedTeacherId) {
					toast.error("Dieses Arbeitsblatt ist nicht für dich verfügbar.");
					router.push(isAnon ? "/student/quick" : "/student/dashboard");
					return;
				}
				if (isAnon && test.id !== anonAttempt!.testId) {
					// Anon kids may only access the test they got the code for.
					toast.error("Dieses Arbeitsblatt ist nicht für dich verfügbar.");
					router.push(`/student/worksheet?id=${anonAttempt!.testId}`);
					return;
				}
				setTest(test);
				setQuestions(questions);
				setCls(klass);

				// Clear any state carried over from a previously shown test
				// BEFORE the branches below restore this test's data. Without
				// this, switching to a brand-new test with no saved attempt
				// matches none of the branches and silently inherits the old
				// test's answers.
				setAnswers({});
				setSubmitted(null);
				setSynced(true);
				setRemoteSubmissionId(null);
				setIgnoreSubmissionId(null);

				const stored = loadAttempt(currentUser.uid, testId);

				// For managed students, Firestore is the source of truth for
				// "did I submit this test?". If the teacher deleted the
				// student's previous result, we want the worksheet to come
				// back in fresh-take mode rather than showing the stale
				// localStorage review. Schnellzugang skips this check —
				// their submissions aren't persisted server-side by design.
				if (!isAnon && currentUser && !cancelled) {
					try {
						const remote = await getLatestStudentSubmission(
							testId,
							currentUser.uid
						);
						if (cancelled) return;
						// A remote result the student superseded with a local
						// "Neu starten" must not resurrect — stay in take mode
						// while the latest remote doc is still that one.
						const retakeActive =
							!!remote?.id && stored?.ignoreSubmissionId === remote.id;
						if (remote && !retakeActive) {
							setAnswers(stored?.answers || {});
							setSubmitted({
								submittedAt:
									remote.submittedAt?.toMillis() ?? Date.now(),
								totalEarned: remote.totalEarned,
								totalPossible: remote.totalPossible,
								perQuestion: remote.perQuestion,
							});
							setSynced(true);
							setRemoteSubmissionId(remote.id ?? null);
							setIgnoreSubmissionId(null);
						} else if (retakeActive) {
							setAnswers(stored?.answers || {});
							setSubmitted(null);
							setRemoteSubmissionId(remote?.id ?? null);
							setIgnoreSubmissionId(stored?.ignoreSubmissionId ?? null);
						} else if (stored?.submitted && stored.synced === false) {
							// The upload never reached the server (offline iPad,
							// rules hiccup). Keep the local result — clearing it
							// here would destroy the student's work — and retry
							// the upload now. Safe from duplicates: we only get
							// here when the server has no submission.
							setAnswers(stored.answers || {});
							setSubmitted(stored.submitted);
							setSynced(false);
							if (studentData) {
								createSubmission(testId, {
									studentId: currentUser.uid,
									studentName: `${studentData.firstName} ${studentData.lastInitial}`,
									classId: studentData.classId,
									totalEarned: stored.submitted.totalEarned,
									totalPossible: stored.submitted.totalPossible,
									perQuestion: stored.submitted.perQuestion,
								})
									.then((id) => {
										if (!cancelled) {
											setSynced(true);
											setRemoteSubmissionId(id);
										}
									})
									.catch((err) =>
										console.error("Submission retry failed:", err)
									);
							}
						} else if (stored?.submitted) {
							// Local says submitted AND synced, server says no —
							// teacher wiped the result. Clear local entirely so
							// the student gets a true fresh start.
							clearAttempt(currentUser.uid, testId);
							setAnswers({});
							setSubmitted(null);
							setSynced(true);
							setIgnoreSubmissionId(null);
						} else if (stored) {
							setAnswers(stored.answers || {});
							setSubmitted(null);
						}
					} catch (err) {
						// Fall back to localStorage-only behaviour if the
						// Firestore read fails (rules, offline, etc.) — the
						// student still gets a working worksheet.
						console.error("Latest-submission lookup failed:", err);
						if (stored) {
							setAnswers(stored.answers || {});
							setSubmitted(stored.submitted ?? null);
							setSynced(stored.synced !== false);
							setIgnoreSubmissionId(stored.ignoreSubmissionId ?? null);
						}
					}
				} else if (stored) {
					setAnswers(stored.answers || {});
					setSubmitted(stored.submitted ?? null);
				}

				// State now reflects THIS test — enable autosave for it.
				loadedKeyRef.current = `${currentUser.uid}:${testId}`;
			} catch (err) {
				console.error(err);
				toast.error("Fehler beim Laden des Arbeitsblatts");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [testId, currentUser, role, studentData, anonAttempt, router]);

	// Auto-save on every answer or submission change.
	useEffect(() => {
		if (!currentUser || !testId || loading) return;
		// Only save once the state belongs to THIS (user, test): otherwise a
		// test switch would write the previous test's answers under the new
		// test's key (the effect runs in the same commit as the testId
		// change, before the load resets state / flips `loading`).
		if (loadedKeyRef.current !== `${currentUser.uid}:${testId}`) return;
		saveAttempt(currentUser.uid, testId, {
			answers,
			submitted: submitted ?? undefined,
			synced: submitted ? synced : undefined,
			ignoreSubmissionId: ignoreSubmissionId ?? undefined,
		});
	}, [
		answers,
		submitted,
		synced,
		ignoreSubmissionId,
		currentUser,
		testId,
		loading,
	]);

	const setAnswerFor = useCallback(
		(qId: string) => (a: unknown) => {
			if (submitted) return;
			setAnswers((prev) => ({ ...prev, [qId]: a }));
		},
		[submitted]
	);

	const answered = useMemo(
		() => questions.filter((q) => answers[q.id ?? ""] !== undefined).length,
		[questions, answers]
	);

	const handleSubmit = () => {
		const result = gradeAll(questions, answers);
		const submission: SubmissionResult = {
			submittedAt: Date.now(),
			totalEarned: Math.round(result.totalEarned * 100) / 100,
			totalPossible: result.totalPossible,
			perQuestion: result.perQuestion,
		};
		setSubmitted(submission);
		setConfirmOpen(false);
		// Scroll to the top of the results so the kid sees the score.
		if (typeof window !== "undefined") {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}

		// Persist the submission to Firestore so the teacher can review
		// it. Managed students only — Schnellzugang kids stay local-only
		// by design. The UI doesn't block on the write, but the synced
		// flag records the outcome: an unsynced result is retried on the
		// next load instead of being mistaken for a teacher delete.
		if (role === "student" && studentData && currentUser) {
			setSynced(false);
			setIgnoreSubmissionId(null);
			createSubmission(testId, {
				studentId: currentUser.uid,
				studentName: `${studentData.firstName} ${studentData.lastInitial}`,
				classId: studentData.classId,
				totalEarned: submission.totalEarned,
				totalPossible: submission.totalPossible,
				perQuestion: submission.perQuestion,
			})
				.then((id) => {
					setSynced(true);
					setRemoteSubmissionId(id);
				})
				.catch((err) => {
					console.error("Failed to persist submission to Firestore:", err);
					toast.info(
						"Dein Ergebnis ist gespeichert und wird beim nächsten Öffnen automatisch übertragen."
					);
				});
		} else if (role === "anonymous" && anonAttempt && test) {
			// Schnellzugang: persist only when the teacher enabled retention.
			// Local storage already holds the result for the kid's own review,
			// so this is best-effort and fire-and-forget — a failure is silent.
			const retention = (test.quickResultsRetention ?? "off") as QuickRetention;
			if (retention !== "off") {
				createQuickSubmission(
					testId,
					{
						displayName: anonAttempt.displayName,
						code: anonAttempt.code,
						totalEarned: submission.totalEarned,
						totalPossible: submission.totalPossible,
						perQuestion: submission.perQuestion,
					},
					retention
				).catch((err) => {
					console.error("Failed to persist quick submission:", err);
				});
			}
		}
	};

	const handleRetake = () => {
		if (!currentUser || !testId) return;
		clearAttempt(currentUser.uid, testId);
		setAnswers({});
		setSubmitted(null);
		setSynced(true);
		// Students can't delete their remote submission (teacher-only by
		// rules), so mark it superseded instead — the load logic keeps the
		// worksheet in take mode while the latest remote doc is this one.
		// The next submit creates a newer submission, which wins naturally.
		setIgnoreSubmissionId(remoteSubmissionId);
		setRetakeOpen(false);
	};

	const handleDownloadPdf = async () => {
		if (!test || !submitted) return;
		const isAnon = role === "anonymous";
		const studentDisplayName = isAnon
			? anonAttempt?.displayName ?? ""
			: `${studentData?.firstName ?? ""} ${studentData?.lastInitial ?? ""}`.trim();
		if (!studentDisplayName) return;
		setGeneratingPdf(true);
		try {
			// Dynamic import keeps @react-pdf/renderer (~300KB) out of the
			// page bundle until the student actually asks for a PDF.
			const [{ pdf }, { WorksheetResultsPDF }] = await Promise.all([
				import("@react-pdf/renderer"),
				import("@/components/student/WorksheetResultsPDF"),
			]);
			const blob = await pdf(
				<WorksheetResultsPDF
					testTitle={test.title}
					testDescription={test.description}
					questions={questions}
					answers={answers}
					submission={submitted}
					studentName={studentDisplayName}
					className={cls?.name ?? ""}
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
			const datePart = new Date(submitted.submittedAt)
				.toISOString()
				.slice(0, 10);
			await shareOrDownload(
				blob,
				`${slug(test.title)}-${slug(studentDisplayName.split(" ")[0] || "schueler")}-${datePart}.pdf`
			);
		} catch (err) {
			console.error(err);
			toast.error(strings.pdf.generationFailed);
		} finally {
			setGeneratingPdf(false);
		}
	};

	const strings = useMemo(
		() => getStrings(mapTargetLanguageToLocale(test?.targetLanguage)),
		[test?.targetLanguage]
	);

	if (!testId) {
		return (
			<div className="container mx-auto px-4 py-6">
				<p className="text-muted-foreground">
					Keine Arbeitsblatt-ID angegeben.
				</p>
			</div>
		);
	}

	const mode: "take" | "review" = submitted ? "review" : "take";
	const totalQuestions = questions.length;
	const percent =
		submitted && submitted.totalPossible > 0
			? Math.round((submitted.totalEarned / submitted.totalPossible) * 100)
			: 0;
	const completionPercent =
		totalQuestions > 0 ? Math.round((answered / totalQuestions) * 100) : 0;

	return (
		<div className="mx-auto w-full max-w-4xl px-4 py-5 ipad-safe-x">
			<div className="flex items-center gap-2 mb-4">
				<Button
					variant="outline"
					size="sm"
					className="gap-1 text-muted-foreground"
					onClick={() =>
						router.push(
							role === "anonymous" ? "/" : "/student/dashboard"
						)
					}
				>
					<ArrowLeft className="h-4 w-4" />
					<span>
						{role === "anonymous" ? "Startseite" : "Mein Bereich"}
					</span>
				</Button>
			</div>

			<div className="mb-5 border-b pb-4">
				<h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 md:text-3xl">
					{loading ? "Laden…" : test?.title ?? "Arbeitsblatt"}
				</h1>
				{test?.description && (
					<p className="mt-2 text-base text-muted-foreground">
						{test.description}
					</p>
				)}
			</div>

			{loading ? (
				<div className="flex justify-center items-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			) : questions.length === 0 ? (
				<Card>
					<CardContent className="py-8 text-center text-muted-foreground">
						Dieses Arbeitsblatt enthält noch keine Aufgaben.
					</CardContent>
				</Card>
			) : (
				<>
					{submitted ? (
							<motion.div
								initial={{ opacity: 0, scale: 0.96 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.4, ease: "easeOut" }}
							>
							<Card
								className="mb-6 border-primary/30 bg-primary/5"
								aria-live="polite"
							>
								<CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
									<CheckCircle2 className="h-10 w-10 text-primary shrink-0" />
									<div className="flex-1">
									<p className="text-lg font-semibold">
										{submitted.totalEarned} / {submitted.totalPossible} Punkte
										<span className="text-muted-foreground font-normal text-base ml-2">
											({percent}%)
										</span>
									</p>
									<p className="text-sm text-muted-foreground">
										Abgegeben am{" "}
										{new Date(submitted.submittedAt).toLocaleString("de-DE")}
									</p>
								</div>
									<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
										<Button
											variant="default"
											onClick={handleDownloadPdf}
											disabled={generatingPdf}
											className="w-full sm:w-auto"
										>
										{generatingPdf ? (
											<>
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
												{strings.pdf.generating}
											</>
										) : (
											<>
												<Download className="h-4 w-4 mr-2" />
												{strings.pdf.downloadButton}
											</>
										)}
									</Button>
										<Button
											variant="outline"
											onClick={() => setRetakeOpen(true)}
											className="w-full sm:w-auto"
										>
										<RotateCcw className="h-4 w-4 mr-2" />
										Neu starten
									</Button>
								</div>
							</CardContent>
						</Card>
							</motion.div>
						) : (
							<div className="sticky top-14 z-30 mb-5 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur">
								<div className="mb-2 flex items-center justify-between gap-3 text-sm">
									<span className="font-medium">Fortschritt</span>
									<span className="text-muted-foreground">
										{answered} / {totalQuestions} Aufgaben
									</span>
								</div>
								<Progress value={completionPercent} className="h-2" />
							</div>
						)}

					<div className="space-y-6">
						{questions.map((q, i) => (
							<Card key={q.id ?? i}>
								<CardContent className="p-5">
									{renderQuestion(
										q,
										i,
										answers[q.id ?? ""],
										setAnswerFor(q.id ?? ""),
										mode,
										strings
									)}
								</CardContent>
							</Card>
						))}
					</div>

						{!submitted && (
							<div className="sticky bottom-0 z-50 mt-8 border-t bg-background/95 py-3 backdrop-blur ipad-safe-bottom">
								<Button
									size="lg"
									onClick={() => setConfirmOpen(true)}
									disabled={questions.length === 0}
									className="w-full sm:ml-auto sm:w-auto"
								>
									<CheckCircle2 className="h-5 w-5 mr-2" />
									Fertig & abgeben
								</Button>
						</div>
					)}
				</>
			)}

			{/* Submit confirmation */}
			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Arbeitsblatt abgeben?</AlertDialogTitle>
						<AlertDialogDescription>
							Du hast {answered} von {totalQuestions} Aufgaben bearbeitet.
							Nach dem Abgeben kannst du keine Antworten mehr ändern.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Zurück</AlertDialogCancel>
						<AlertDialogAction onClick={handleSubmit}>
							Abgeben
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Retake confirmation */}
			<AlertDialog open={retakeOpen} onOpenChange={setRetakeOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Arbeitsblatt neu starten?</AlertDialogTitle>
						<AlertDialogDescription>
							Deine bisherigen Antworten und das Ergebnis werden gelöscht.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Abbrechen</AlertDialogCancel>
						<AlertDialogAction onClick={handleRetake}>
							Neu starten
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default StudentWorksheet;
