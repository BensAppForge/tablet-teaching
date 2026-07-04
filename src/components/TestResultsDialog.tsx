"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
	Check,
	ChevronDown,
	ChevronRight,
	Clock,
	Loader2,
	Trash2,
	Users,
	X,
} from "lucide-react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";

import { Test, Question, getTest } from "@/lib/firebase/tests";
import {
	Submission,
	subscribeToSubmissions,
	deleteSubmission,
} from "@/lib/firebase/submissions";
import {
	QuickSubmission,
	subscribeToQuickSubmissions,
	deleteQuickSubmission,
} from "@/lib/firebase/quickSubmissions";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	test: Test | null;
}

interface SubmissionRowProps {
	name: string;
	submittedAt: Timestamp | null;
	totalEarned: number;
	totalPossible: number;
	perQuestion: Submission["perQuestion"];
	questions: Question[];
	onDelete: () => void;
	// Quick results carry an expiry; shown so the teacher knows it's
	// temporary.
	expiresAt?: Timestamp | null;
	// >1 when the student retook the test; the row shows their latest attempt.
	attempts?: number;
}

const SubmissionRow: React.FC<SubmissionRowProps> = ({
	name,
	submittedAt,
	totalEarned,
	totalPossible,
	perQuestion,
	questions,
	onDelete,
	expiresAt,
	attempts,
}) => {
	const [expanded, setExpanded] = useState(false);

	const pct =
		totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

	const submittedLabel = submittedAt
		? format(submittedAt.toDate(), "dd.MM.yyyy HH:mm", { locale: de })
		: "—";
	const expiresLabel = expiresAt
		? format(expiresAt.toDate(), "dd.MM. HH:mm", { locale: de })
		: null;

	return (
		<div className="border rounded-md">
			<div className="flex items-center gap-2 p-3">
				<button
					type="button"
					onClick={() => setExpanded((e) => !e)}
					aria-label={expanded ? "Details ausblenden" : "Details einblenden"}
					className="inline-flex h-11 w-11 shrink-0 items-center justify-center -m-1.5 text-muted-foreground hover:text-foreground"
				>
					{expanded ? (
						<ChevronDown className="h-4 w-4" />
					) : (
						<ChevronRight className="h-4 w-4" />
					)}
				</button>
				<div className="flex-1 min-w-0">
					<div className="font-medium truncate">{name}</div>
					<div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
						<span>{submittedLabel}</span>
							{attempts && attempts > 1 && (
								<span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5">
									{attempts} Versuche · neuester
								</span>
							)}
						{expiresLabel && (
							<span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-500">
								<Clock className="h-3 w-3" />
								läuft ab {expiresLabel}
							</span>
						)}
					</div>
				</div>
				<div className="text-right shrink-0">
					<div className="font-medium tabular-nums">
						{totalEarned} / {totalPossible}
					</div>
					<div className="text-xs text-muted-foreground">{pct}%</div>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="h-11 w-11 text-destructive shrink-0"
					onClick={onDelete}
					aria-label="Ergebnis löschen"
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
			{expanded && (
				<div className="border-t bg-muted/30 px-3 py-2 space-y-1">
					{questions.length === 0 ? (
						<p className="text-xs text-muted-foreground italic">
							Fragen werden geladen…
						</p>
					) : (
						questions.map((q, idx) => {
							const result = q.id ? perQuestion?.[q.id] : null;
							if (!result) {
								return (
									<div
										key={q.id ?? idx}
										className="text-xs text-muted-foreground flex items-center gap-2"
									>
										<span className="w-5 text-right">{idx + 1}.</span>
										<span>nicht beantwortet</span>
									</div>
								);
							}
							return (
								<div
									key={q.id ?? idx}
									className="text-xs flex items-center gap-2"
								>
									<span className="w-5 text-right text-muted-foreground">
										{idx + 1}.
									</span>
									{result.correct ? (
										<Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
									) : (
										<X className="h-3.5 w-3.5 text-destructive shrink-0" />
									)}
									<span className="flex-1 truncate text-muted-foreground">
										{q.text || `Frage ${idx + 1}`}
									</span>
									<span className="tabular-nums text-muted-foreground shrink-0">
										{result.earned} / {result.max}
									</span>
								</div>
							);
						})
					)}
				</div>
			)}
		</div>
	);
};

type DeleteTarget = {
	kind: "managed" | "quick";
	id: string;
	name: string;
};

const TestResultsDialog: React.FC<Props> = ({ open, onOpenChange, test }) => {
	const [submissions, setSubmissions] = useState<Submission[]>([]);
	const [quickSubs, setQuickSubs] = useState<QuickSubmission[]>([]);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [loading, setLoading] = useState(true);
	const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
	const [deleting, setDeleting] = useState(false);

	// Subscribe to both managed + quick results and lazy-load questions
	// when the dialog opens. Clean up on close to avoid leaking listeners.
	useEffect(() => {
		if (!open || !test?.id) {
			setSubmissions([]);
			setQuickSubs([]);
			setQuestions([]);
			setLoading(true);
			return;
		}

		const testId = test.id;
		setLoading(true);

		const unsubManaged = subscribeToSubmissions(
			testId,
			(subs) => {
				setSubmissions(subs);
				setLoading(false);
			},
			(err) => {
				console.error("Failed to load submissions:", err);
				toast.error("Fehler beim Laden der Ergebnisse");
				setLoading(false);
			}
		);
		const unsubQuick = subscribeToQuickSubmissions(
			testId,
			setQuickSubs,
			(err) => console.error("Failed to load quick submissions:", err)
		);

		let cancelled = false;
		getTest(testId)
			.then(({ questions: qs }) => {
				if (!cancelled) setQuestions(qs);
			})
			.catch((err) => {
				console.error("Failed to load questions:", err);
			});

		return () => {
			cancelled = true;
			unsubManaged();
			unsubQuick();
		};
	}, [open, test?.id]);

	const handleDelete = async () => {
		if (!deleteTarget || !test?.id) return;
		setDeleting(true);
		try {
			if (deleteTarget.kind === "managed") {
				await deleteSubmission(test.id, deleteTarget.id);
			} else {
				await deleteQuickSubmission(test.id, deleteTarget.id);
			}
			toast.success("Ergebnis gelöscht");
			setDeleteTarget(null);
		} catch (err) {
			console.error(err);
			toast.error("Fehler beim Löschen");
		} finally {
			setDeleting(false);
		}
	};

	// Group managed submissions by student so a retake doesn't show up as
	// several rows. Each student gets one row for their LATEST attempt, with
	// an "N Versuche" marker; the count reflects distinct students.
	const managedRows = useMemo(() => {
		const byStudent = new Map<
			string,
			{ latest: Submission; attempts: number }
		>();
		for (const s of submissions) {
			const key = s.studentId ?? s.id ?? "";
			const existing = byStudent.get(key);
			if (!existing) {
				byStudent.set(key, { latest: s, attempts: 1 });
			} else {
				existing.attempts += 1;
				const ms = s.submittedAt?.toMillis?.() ?? 0;
				const exMs = existing.latest.submittedAt?.toMillis?.() ?? 0;
				if (ms > exMs) existing.latest = s;
			}
		}
		return Array.from(byStudent.values()).sort((a, b) =>
			a.latest.studentName.localeCompare(b.latest.studentName, "de")
		);
	}, [submissions]);

	const total = managedRows.length + quickSubs.length;

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Ergebnisse</DialogTitle>
						<DialogDescription>{test?.title}</DialogDescription>
					</DialogHeader>

					{loading ? (
						<div className="flex justify-center items-center py-8">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : total === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<Users className="h-10 w-10 text-muted-foreground mb-3" />
							<p className="text-sm text-muted-foreground">
								Noch keine Ergebnisse für diesen Test.
							</p>
							<p className="text-xs text-muted-foreground mt-2 max-w-xs">
								Schnellzugang-Ergebnisse erscheinen hier nur, wenn du im
								Schnellzugang das Speichern aktivierst.
							</p>
						</div>
					) : (
						<div className="space-y-5 max-h-[60vh] overflow-y-auto">
							{managedRows.length > 0 && (
								<div className="space-y-2">
									<p className="text-xs font-medium text-muted-foreground px-1">
										Mit Zugang (Klasse) · {managedRows.length}
									</p>
									{managedRows.map(({ latest: s, attempts }) => (
										<SubmissionRow
											key={s.id}
											name={s.studentName}
											submittedAt={s.submittedAt}
											totalEarned={s.totalEarned}
											totalPossible={s.totalPossible}
											perQuestion={s.perQuestion}
											questions={questions}
											attempts={attempts}
											onDelete={() =>
												setDeleteTarget({
													kind: "managed",
													id: s.id!,
													name: s.studentName,
												})
											}
										/>
									))}
								</div>
							)}

							{quickSubs.length > 0 && (
								<div className="space-y-2">
									<p className="text-xs font-medium text-muted-foreground px-1">
										Schnellzugang · {quickSubs.length}{" "}
										<span className="font-normal">
											(temporär, selbst eingegebene Namen)
										</span>
									</p>
									{quickSubs.map((s) => (
										<SubmissionRow
											key={s.id}
											name={s.displayName}
											submittedAt={s.submittedAt}
											expiresAt={s.expiresAt}
											totalEarned={s.totalEarned}
											totalPossible={s.totalPossible}
											perQuestion={s.perQuestion}
											questions={questions}
											onDelete={() =>
												setDeleteTarget({
													kind: "quick",
													id: s.id!,
													name: s.displayName,
												})
											}
										/>
									))}
								</div>
							)}
						</div>
					)}
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={!!deleteTarget}
				onOpenChange={(o) => {
					if (!o) setDeleteTarget(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Ergebnis löschen?</AlertDialogTitle>
						<AlertDialogDescription>
							{deleteTarget && (
								<>
									Das Ergebnis von{" "}
									<strong>{deleteTarget.name}</strong> wird endgültig
									gelöscht. Diese Aktion kann nicht rückgängig gemacht
									werden.
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>
							Abbrechen
						</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={(e) => {
								e.preventDefault();
								handleDelete();
							}}
							disabled={deleting}
						>
							{deleting ? (
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
		</>
	);
};

export default TestResultsDialog;
