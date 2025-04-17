"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getTeacherTests, Test, deleteTest } from "@/lib/firebase/tests";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Pencil,
	Trash2,
	Share2,
	Trophy,
	ChevronRight,
	Loader2,
	Clock,
	Tag,
	Book,
	Calendar,
	ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
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
import { toast } from "sonner";

const TestsManagement: React.FC = () => {
	const { currentUser } = useAuth();
	const router = useRouter();
	const [tests, setTests] = useState<Test[]>([]);
	const [loading, setLoading] = useState(true);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [testToDelete, setTestToDelete] = useState<string | null>(null);

	// CEFR Level Badge color mapping
	const cefrColors: Record<string, string> = {
		A1: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
		A2: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
		B1: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
		B2: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
		C1: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
		C2: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
	};

	useEffect(() => {
		if (currentUser) {
			loadTests();
		}
	}, [currentUser]);

	const loadTests = async () => {
		if (!currentUser) return;

		setLoading(true);
		try {
			const fetchedTests = await getTeacherTests(currentUser.uid);
			setTests(fetchedTests);
		} catch (error) {
			console.error("Error loading tests:", error);
			toast.error("Fehler beim Laden der Tests");
		} finally {
			setLoading(false);
		}
	};

	const handleEditTest = (testId: string) => {
		router.push(`/edit-test/${testId}`);
	};

	const handleDeleteTest = async () => {
		if (!testToDelete) return;

		try {
			await deleteTest(testToDelete);
			setTests(tests.filter((test) => test.id !== testToDelete));
			toast.success("Test wurde erfolgreich gelöscht");
		} catch (error) {
			console.error("Error deleting test:", error);
			toast.error("Fehler beim Löschen des Tests");
		} finally {
			setDeleteDialogOpen(false);
			setTestToDelete(null);
		}
	};

	const confirmDelete = (testId: string) => {
		setTestToDelete(testId);
		setDeleteDialogOpen(true);
	};

	const handleShareTest = (testId: string) => {
		router.push(`/share-test/${testId}`);
	};

	const handleViewLeaderboard = (testId: string) => {
		router.push(`/leaderboard/${testId}`);
	};

	const formatDate = (timestamp: any) => {
		if (!timestamp) return "Unbekannt";

		// Convert Firestore Timestamp to JS Date if needed
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

		return formatDistanceToNow(date, {
			addSuffix: true,
			locale: de,
		});
	};

	return (
		<div className="container mx-auto px-4 py-6">
			<div className="flex items-center gap-2 mb-4">
				<Button
					variant="outline"
					size="sm"
					className="gap-1 text-muted-foreground"
					onClick={() => router.push("/teacher/dashboard")}
				>
					<ArrowLeft className="h-4 w-4" />
					<span>Dashboard</span>
				</Button>
			</div>

			<div className="border-b mb-6">
				<h1 className="text-2xl font-semibold py-2 text-gray-700 dark:text-gray-200">
					Tests verwalten
				</h1>
			</div>

			{loading ? (
				<div className="flex justify-center items-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			) : tests.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<div className="text-center mb-4">
							<p className="text-muted-foreground">Keine Tests gefunden</p>
							<p className="text-sm text-muted-foreground mt-1">
								Erstellen Sie Ihren ersten Test, um loszulegen
							</p>
						</div>
						<Button onClick={() => router.push("/create-test")}>
							Test erstellen
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					{tests.map((test) => (
						<Card key={test.id} className="overflow-hidden">
							<div className="grid grid-cols-1 md:grid-cols-6 gap-4">
								{/* Test info */}
								<div className="md:col-span-4 p-6">
									<div className="flex items-start justify-between">
										<div>
											<h2 className="text-xl font-semibold">{test.title}</h2>
											{test.description && (
												<p className="text-muted-foreground mt-1 text-sm line-clamp-2">
													{test.description}
												</p>
											)}
										</div>

										<Badge
											className={cefrColors[test.cefrLevel] || "bg-gray-100"}
										>
											{test.cefrLevel}
										</Badge>
									</div>

									<div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
										<div className="flex items-center text-sm text-muted-foreground">
											<Clock className="h-4 w-4 mr-1" />
											{test.defaultTimePerQuestion}s pro Frage
										</div>
										<div className="flex items-center text-sm text-muted-foreground">
											<Tag className="h-4 w-4 mr-1" />
											{test.defaultCreditPoints} Punkte
										</div>
										<div className="flex items-center text-sm text-muted-foreground">
											<Book className="h-4 w-4 mr-1" />
											{test.targetLanguage}
										</div>
										<div className="flex items-center text-sm text-muted-foreground">
											<Calendar className="h-4 w-4 mr-1" />
											{formatDate(test.createdAt)}
										</div>
									</div>
								</div>

								{/* Actions */}
								<div className="md:col-span-2 bg-muted/30 flex flex-row md:flex-col justify-between items-center p-6">
									<div className="flex md:flex-col gap-2 w-full">
										<Button
											variant="outline"
											className="w-full justify-between"
											onClick={() => handleEditTest(test.id!)}
										>
											<span className="flex items-center">
												<Pencil className="mr-2 h-4 w-4" />
												Bearbeiten
											</span>
											<ChevronRight className="h-4 w-4" />
										</Button>

										<Button
											variant="outline"
											className="w-full justify-between"
											onClick={() => handleShareTest(test.id!)}
										>
											<span className="flex items-center">
												<Share2 className="mr-2 h-4 w-4" />
												Teilen
											</span>
											<ChevronRight className="h-4 w-4" />
										</Button>

										<Button
											variant="outline"
											className="w-full justify-between"
											onClick={() => handleViewLeaderboard(test.id!)}
										>
											<span className="flex items-center">
												<Trophy className="mr-2 h-4 w-4" />
												Rangliste
											</span>
											<ChevronRight className="h-4 w-4" />
										</Button>

										<Button
											variant="outline"
											className="w-full justify-between"
											onClick={() => confirmDelete(test.id!)}
										>
											<span className="flex items-center">
												<Trash2 className="mr-2 h-4 w-4 text-destructive" />
												Löschen
											</span>
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</div>
						</Card>
					))}
				</div>
			)}

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Test löschen?</AlertDialogTitle>
						<AlertDialogDescription>
							Diese Aktion kann nicht rückgängig gemacht werden. Der Test wird
							dauerhaft gelöscht.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Abbrechen</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={handleDeleteTest}
						>
							Löschen
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default TestsManagement;
