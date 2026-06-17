"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Book, Tag, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { getClass, Class } from "@/lib/firebase/classes";
import { subscribeToTestsForStudent, Test } from "@/lib/firebase/tests";
import {
	getLatestStudentSubmission,
	Submission,
} from "@/lib/firebase/submissions";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const StudentDashboard: React.FC = () => {
	const { studentData, currentUser } = useAuth();
	const [cls, setCls] = useState<Class | null>(null);
	const [tests, setTests] = useState<Test[]>([]);
	const [loading, setLoading] = useState(true);
	// testId → latest own submission (or null = not yet done). Fetched
	// per-test with the existing point query, so no collectionGroup index
	// or rule change is needed.
	const [submissions, setSubmissions] = useState<
		Record<string, Submission | null>
	>({});

	useEffect(() => {
		if (!studentData) return;
		let cancelled = false;
		setLoading(true);

		// Class name is one-shot — it doesn't change while the dashboard
		// is open. Tests use a live subscription so a newly assigned test
		// appears without the student refreshing.
		getClass(studentData.classId)
			.then((klass) => {
				if (!cancelled) setCls(klass);
			})
			.catch((err) => {
				console.error(err);
				if (!cancelled) toast.error("Fehler beim Laden der Klasse");
			});

		const unsubscribe = subscribeToTestsForStudent(
			studentData.teacherId,
			studentData.classId,
			(list) => {
				if (cancelled) return;
				setTests(list);
				setLoading(false);
			},
			(err) => {
				console.error(err);
				if (cancelled) return;
				toast.error("Fehler beim Laden der Arbeitsblätter");
				setLoading(false);
			}
		);

		return () => {
			cancelled = true;
			unsubscribe();
		};
	}, [studentData]);

	// Fetch the student's latest result per assigned test so each card can
	// show a "done / score" chip. Re-runs whenever the test list changes.
	useEffect(() => {
		if (!currentUser || tests.length === 0) {
			setSubmissions({});
			return;
		}
		let cancelled = false;
		(async () => {
			const entries = await Promise.all(
				tests.map(async (t) => {
					try {
						const sub = await getLatestStudentSubmission(
							t.id!,
							currentUser.uid
						);
						return [t.id!, sub] as const;
					} catch (err) {
						console.error("Submission lookup failed:", err);
						return [t.id!, null] as const;
					}
				})
			);
			if (!cancelled) setSubmissions(Object.fromEntries(entries));
		})();
		return () => {
			cancelled = true;
		};
	}, [tests, currentUser]);

	if (!studentData) {
		return (
			<div className="container mx-auto px-4 py-6">
				<p className="text-muted-foreground">
					Profil wird geladen…
				</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-6">
			<div className="border-b mb-6">
				<h1 className="text-2xl font-semibold py-2 text-gray-700 dark:text-gray-200">
					Hallo, {studentData.firstName}!
				</h1>
				<p className="text-sm text-muted-foreground pb-2">
					Klasse: <strong>{cls?.name ?? "—"}</strong>
				</p>
			</div>

			{loading ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{[0, 1, 2].map((i) => (
						<Card key={i} className="overflow-hidden">
							<CardContent className="p-5 space-y-3">
								<Skeleton className="h-5 w-3/4" />
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-2/3" />
								<div className="flex gap-3 pt-2">
									<Skeleton className="h-3 w-16" />
									<Skeleton className="h-3 w-10" />
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			) : tests.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<ClipboardList className="h-10 w-10 text-muted-foreground mb-3" />
						<p className="text-muted-foreground">
							Aktuell sind keine Arbeitsblätter für dich verfügbar.
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{tests.map((t) => {
						const sub = submissions[t.id!];
						const pct =
							sub && sub.totalPossible > 0
								? Math.round((sub.totalEarned / sub.totalPossible) * 100)
								: null;
						return (
							<Link
								key={t.id}
								href={`/student/worksheet?id=${t.id}`}
								className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								<Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
									<CardContent className="p-5">
										<div className="flex items-start justify-between gap-2 mb-1">
											<h2 className="text-lg font-semibold truncate">
												{t.title}
											</h2>
											{sub && (
												<span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
													<CheckCircle2 className="h-3.5 w-3.5" />
													{sub.totalEarned}/{sub.totalPossible}
													{pct !== null && (
														<span className="opacity-70">· {pct}%</span>
													)}
												</span>
											)}
										</div>
										{t.description && (
											<p className="text-sm text-muted-foreground line-clamp-2 mb-3">
												{t.description}
											</p>
										)}
										<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
											<span className="flex items-center gap-1">
												<Book className="h-3.5 w-3.5" />
												{t.targetLanguage}
											</span>
											<span className="flex items-center gap-1">
												<Tag className="h-3.5 w-3.5" />
												{t.cefrLevel}
											</span>
											{!sub && (
												<span className="ml-auto text-xs font-medium text-muted-foreground">
													Noch offen
												</span>
											)}
										</div>
									</CardContent>
								</Card>
							</Link>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default StudentDashboard;
