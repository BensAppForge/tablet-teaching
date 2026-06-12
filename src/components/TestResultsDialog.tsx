"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
	Check,
	ChevronDown,
	ChevronRight,
	Loader2,
	Trash2,
	Users,
	X,
} from "lucide-react";
import { toast } from "sonner";

import { Test, Question, getTest } from "@/lib/firebase/tests";
import {
	Submission,
	subscribeToSubmissions,
	deleteSubmission,
} from "@/lib/firebase/submissions";
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
	submission: Submission;
	questions: Question[];
	onDelete: () => void;
}

const SubmissionRow: React.FC<SubmissionRowProps> = ({
	submission,
	questions,
	onDelete,
}) => {
	const [expanded, setExpanded] = useState(false);

	const pct =
		submission.totalPossible > 0
			? Math.round(
					(submission.totalEarned / submission.totalPossible) * 100
			  )
			: 0;

	const submittedAt = submission.submittedAt
		? format(submission.submittedAt.toDate(), "dd.MM.yyyy HH:mm", {
				locale: de,
		  })
		: "—";

	return (
		<div className="border rounded-md">
			<div className="flex items-center gap-2 p-3">
				<button
					type="button"
					onClick={() => setExpanded((e) => !e)}
					aria-label={
						expanded ? "Details ausblenden" : "Details einblenden"
					}
					className="text-muted-foreground hover:text-foreground shrink-0"
				>
					{expanded ? (
						<ChevronDown className="h-4 w-4" />
					) : (
						<ChevronRight className="h-4 w-4" />
					)}
				</button>
				<div className="flex-1 min-w-0">
					<div className="font-medium truncate">
						{submission.studentName}
					</div>
					<div className="text-xs text-muted-foreground">
						{submittedAt}
					</div>
				</div>
				<div className="text-right shrink-0">
					<div className="font-medium tabular-nums">
						{submission.totalEarned} / {submission.totalPossible}
					</div>
					<div className="text-xs text-muted-foreground">{pct}%</div>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 text-destructive shrink-0"
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
							const result = q.id
								? submission.perQuestion?.[q.id]
								: null;
							if (!result) {
								return (
									<div
										key={q.id ?? idx}
										className="text-xs text-muted-foreground flex items-center gap-2"
									>
										<span className="w-5 text-right">
											{idx + 1}.
										</span>
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

const TestResultsDialog: React.FC<Props> = ({ open, onOpenChange, test }) => {
	const [submissions, setSubmissions] = useState<Submission[]>([]);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [loading, setLoading] = useState(true);
	const [deleteTarget, setDeleteTarget] = useState<Submission | null>(null);
	const [deleting, setDeleting] = useState(false);

	// Subscribe + lazy-load questions when the dialog opens. Cleans up
	// both on close so we don't leak listeners across opens.
	useEffect(() => {
		if (!open || !test?.id) {
			setSubmissions([]);
			setQuestions([]);
			setLoading(true);
			return;
		}

		const testId = test.id;
		setLoading(true);

		const unsubscribe = subscribeToSubmissions(
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

		// Load questions for the per-question breakdown. Cheap — one
		// getTest per dialog open. We don't subscribe because the
		// questions array doesn't change while results are being viewed.
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
			unsubscribe();
		};
	}, [open, test?.id]);

	const handleDelete = async () => {
		if (!deleteTarget?.id || !test?.id) return;
		setDeleting(true);
		try {
			await deleteSubmission(test.id, deleteTarget.id);
			toast.success("Ergebnis gelöscht");
			setDeleteTarget(null);
		} catch (err) {
			console.error(err);
			toast.error("Fehler beim Löschen");
		} finally {
			setDeleting(false);
		}
	};

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
					) : submissions.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<Users className="h-10 w-10 text-muted-foreground mb-3" />
							<p className="text-sm text-muted-foreground">
								Noch keine Ergebnisse für diesen Test.
							</p>
							<p className="text-xs text-muted-foreground mt-2 max-w-xs">
								Hinweis: Nur Abgaben von Schüler:innen mit eigenem
								Zugang werden gespeichert. Ergebnisse aus dem
								Schnellzugang erscheinen hier nicht.
							</p>
						</div>
					) : (
						<div className="space-y-2 max-h-[60vh] overflow-y-auto">
							<p className="text-xs text-muted-foreground px-1">
								{submissions.length}{" "}
								{submissions.length === 1
									? "Ergebnis"
									: "Ergebnisse"}
							</p>
							{submissions.map((s) => (
								<SubmissionRow
									key={s.id}
									submission={s}
									questions={questions}
									onDelete={() => setDeleteTarget(s)}
								/>
							))}
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
									<strong>{deleteTarget.studentName}</strong> wird
									endgültig gelöscht. Diese Aktion kann nicht
									rückgängig gemacht werden.
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
