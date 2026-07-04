"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	ArrowLeft,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Loader2,
	XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { getTest, Test, Question } from "@/lib/firebase/tests";
import { getStrings, mapTargetLanguageToLocale } from "@/lib/i18n";
import { gradeQuestion } from "@/lib/student/scoring";
import { renderQuestion } from "@/components/student/renderQuestion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

/**
 * Teacher-led classroom review ("Besprechung"). The teacher opens a test
 * on their (projected) device and walks the class through it one question
 * at a time: the class proposes an answer out loud, the teacher enters the
 * agreed solution and taps "Korrigieren" to reveal correct/incorrect plus
 * the correct solution for THAT question, then discusses and moves on.
 *
 * This is a pure, ephemeral teaching aid — it writes NOTHING: no
 * localStorage, no submission, no score. It reuses the same per-question
 * renderers and grader as the student worksheet (mode "take" → interactive,
 * mode "review" → shows the solution).
 */
const BesprechungView: React.FC = () => {
	const router = useRouter();
	const params = useSearchParams();
	const testId = params.get("id") ?? "";
	const { currentUser } = useAuth();

	const [test, setTest] = useState<Test | null>(null);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [loading, setLoading] = useState(true);

	const [index, setIndex] = useState(0);
	// Teacher-entered answers, in memory only, keyed per question.
	const [answers, setAnswers] = useState<Record<string, unknown>>({});
	// Which questions have been "Korrigiert" → shown in review mode.
	const [corrected, setCorrected] = useState<Record<string, boolean>>({});

	useEffect(() => {
		if (!testId || !currentUser) return;
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const { test, questions } = await getTest(testId);
				if (cancelled) return;
				if (test.teacherId !== currentUser.uid) {
					toast.error("Dieser Test gehört nicht zu Ihrem Konto.");
					router.push("/tests");
					return;
				}
				setTest(test);
				setQuestions(questions);
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

	const strings = useMemo(
		() => getStrings(mapTargetLanguageToLocale(test?.targetLanguage)),
		[test?.targetLanguage]
	);

	const total = questions.length;
	const q = questions[index];
	const qId = q ? q.id ?? `q-${index}` : "";
	const isCorrected = !!corrected[qId];
	const mode: "take" | "review" = isCorrected ? "review" : "take";

	const setAnswerFor = useCallback(
		(id: string) => (a: unknown) => {
			// Once corrected, the question is locked until "Nochmal".
			setCorrected((prev) => {
				if (prev[id]) return prev;
				setAnswers((cur) => ({ ...cur, [id]: a }));
				return prev;
			});
		},
		[]
	);

	const handleCheck = () => setCorrected((prev) => ({ ...prev, [qId]: true }));

	const goPrev = () => setIndex((i) => Math.max(0, i - 1));
	const goNext = () => setIndex((i) => Math.min(total - 1, i + 1));

	const grade = useMemo(
		() => (q && isCorrected ? gradeQuestion(q, answers[qId]) : null),
		[q, isCorrected, answers, qId]
	);
	const round = (n: number) => Math.round(n * 100) / 100;

	if (!testId) {
		return (
			<div className="container mx-auto px-4 py-6">
				<p className="text-muted-foreground">Keine Test-ID angegeben.</p>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-4xl px-4 py-5 ipad-safe-x">
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

			<div className="mb-5 border-b pb-4">
				<p className="text-sm font-medium uppercase tracking-wide text-primary">
					Besprechung
				</p>
				<h1 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-gray-100 md:text-3xl">
					{loading ? "Laden…" : test?.title ?? "Test"}
				</h1>
			</div>

			{loading ? (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			) : total === 0 ? (
				<Card>
					<CardContent className="py-8 text-center text-muted-foreground">
						Dieser Test enthält noch keine Aufgaben.
					</CardContent>
				</Card>
			) : (
				<>
					<div className="mb-5 rounded-lg border bg-background/95 p-3 shadow-sm">
						<div className="mb-2 flex items-center justify-between gap-3 text-sm">
							<span className="font-medium">
								Frage {index + 1} von {total}
							</span>
							<span className="text-muted-foreground">
								{Object.values(corrected).filter(Boolean).length} besprochen
							</span>
						</div>
						<Progress
							value={total > 0 ? ((index + 1) / total) * 100 : 0}
							className="h-2"
						/>
					</div>

					{grade && (
						<div
							className={
								"mb-4 flex items-center gap-3 rounded-lg border p-4 text-base font-medium " +
								(grade.correct
									? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
									: grade.earned > 0
										? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
										: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200")
							}
							aria-live="polite"
						>
							{grade.correct ? (
								<CheckCircle2 className="h-6 w-6 shrink-0" />
							) : (
								<XCircle className="h-6 w-6 shrink-0" />
							)}
							<span>
								{grade.correct
									? "Richtig"
									: grade.earned > 0
										? `Teilweise richtig — ${round(grade.earned)} / ${grade.max} Punkte`
										: "Noch nicht richtig"}
							</span>
						</div>
					)}

					<Card>
						<CardContent className="p-5 md:p-6">
							{q &&
								renderQuestion(
									q,
									index,
									answers[qId],
									setAnswerFor(qId),
									mode,
									strings
								)}
						</CardContent>
					</Card>

					<div className="sticky bottom-0 z-50 mt-6 flex items-center justify-between gap-2 border-t bg-background/95 py-3 backdrop-blur ipad-safe-bottom">
						<Button
							variant="outline"
							size="lg"
							onClick={goPrev}
							disabled={index === 0}
						>
							<ChevronLeft className="mr-1 h-5 w-5" />
							Zurück
						</Button>

						{!isCorrected && (
							<Button size="lg" onClick={handleCheck}>
								<CheckCircle2 className="mr-2 h-5 w-5" />
								Korrigieren
							</Button>
						)}

						<Button
							variant="outline"
							size="lg"
							onClick={goNext}
							disabled={index >= total - 1}
						>
							Weiter
							<ChevronRight className="ml-1 h-5 w-5" />
						</Button>
					</div>
				</>
			)}
		</div>
	);
};

export default BesprechungView;
