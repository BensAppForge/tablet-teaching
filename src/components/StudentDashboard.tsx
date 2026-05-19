"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ClipboardList, Book, Tag } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { getClass, Class } from "@/lib/firebase/classes";
import { getTestsForStudent, Test } from "@/lib/firebase/tests";
import { Card, CardContent } from "@/components/ui/card";

const StudentDashboard: React.FC = () => {
	const { studentData } = useAuth();
	const router = useRouter();
	const [cls, setCls] = useState<Class | null>(null);
	const [tests, setTests] = useState<Test[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!studentData) return;
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const [klass, list] = await Promise.all([
					getClass(studentData.classId),
					getTestsForStudent(
						studentData.teacherId,
						studentData.classId
					),
				]);
				if (cancelled) return;
				setCls(klass);
				setTests(list);
			} catch (err) {
				console.error(err);
				toast.error("Fehler beim Laden des Arbeitsbereichs");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
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
				<div className="flex justify-center items-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
