"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ClipboardList, Book, Tag } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { getClass, Class } from "@/lib/firebase/classes";
import { subscribeToTestsForStudent, Test } from "@/lib/firebase/tests";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const StudentDashboard: React.FC = () => {
	const { studentData } = useAuth();
	const router = useRouter();
	const [cls, setCls] = useState<Class | null>(null);
	const [tests, setTests] = useState<Test[]>([]);
	const [loading, setLoading] = useState(true);

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
					{tests.map((t) => (
						<Card
							key={t.id}
							className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
							onClick={() => router.push(`/student/worksheet?id=${t.id}`)}
						>
							<CardContent className="p-5">
								<h2 className="text-lg font-semibold mb-1 truncate">
									{t.title}
								</h2>
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
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
};

export default StudentDashboard;
