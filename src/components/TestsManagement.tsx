"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToTeacherTests, Test, deleteTest } from "@/lib/firebase/tests";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Pencil,
	Trash2,
	Share2,
	Loader2,
	Tag,
	Book,
	Calendar,
	ArrowLeft,
	Settings,
	Sparkles,
	BarChart3,
} from "lucide-react";
import TestResultsDialog from "@/components/TestResultsDialog";
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
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { motion } from "framer-motion";

const TestsManagement: React.FC = () => {
	const { currentUser } = useAuth();
	const router = useRouter();
	const { preferences, updatePreference, resetCategory } = useUserPreferences();
	const [tests, setTests] = useState<Test[]>([]);
	const [loading, setLoading] = useState(true);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [testToDelete, setTestToDelete] = useState<string | null>(null);
	const [dontShowAgain, setDontShowAgain] = useState(false);
	const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
	const [resultsTest, setResultsTest] = useState<Test | null>(null);

	// CEFR badges use a single-hue slate ramp so A1→C2 reads as a scale,
	// not a rainbow, and doesn't fight the brand primary.
	const cefrColors: Record<string, string> = {
		A1: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
		A2: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
		B1: "bg-slate-300 text-slate-900 dark:bg-slate-600 dark:text-slate-50",
		B2: "bg-slate-500 text-white dark:bg-slate-500 dark:text-white",
		C1: "bg-slate-700 text-white dark:bg-slate-400 dark:text-slate-900",
		C2: "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900",
	};

	useEffect(() => {
		if (!currentUser) return;
		setLoading(true);
		const unsubscribe = subscribeToTeacherTests(
			currentUser.uid,
			(list) => {
				setTests(list);
				setLoading(false);
			},
			(error) => {
				console.error("Error loading tests:", error);
				toast.error("Fehler beim Laden der Tests");
				setLoading(false);
			}
		);
		return () => unsubscribe();
	}, [currentUser]);

	const handleEditTest = (testId: string) => {
		router.push(`/edit-test?id=${testId}`);
	};

	const handleDeleteTest = async () => {
		if (!testToDelete) return;

		try {
			await deleteTest(testToDelete);
			setTests(tests.filter((test) => test.id !== testToDelete));
			toast.success("Test wurde erfolgreich gelöscht");
			
			// Save the "don't show again" preference if checked
			if (dontShowAgain) {
				updatePreference("confirmations", "deleteTest", false);
			}
		} catch (error) {
			console.error("Error deleting test:", error);
			toast.error("Fehler beim Löschen des Tests");
		} finally {
			setDeleteDialogOpen(false);
			setTestToDelete(null);
			setDontShowAgain(false);
		}
	};

	const confirmDelete = (testId: string) => {
		setTestToDelete(testId);
		
		// Check if we should show the confirmation dialog
		if (preferences.confirmations.deleteTest) {
			setDeleteDialogOpen(true);
		} else {
			// If confirmation is disabled, delete immediately
			handleDeleteTest();
		}
	};

	const handleShareTest = (testId: string) => {
		router.push(`/share-test?id=${testId}`);
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

			<div className="border-b mb-6 flex items-center justify-between gap-3">
				<h1 className="text-2xl font-semibold py-2 text-gray-700 dark:text-gray-200">
					Tests verwalten
				</h1>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setSettingsDialogOpen(true)}
					aria-label="Einstellungen"
				>
					<Settings className="h-4 w-4" />
				</Button>
			</div>
			<div className="flex justify-end items-center mb-8">
				<Button
					variant="default"
					className="gap-2"
					onClick={() => router.push("/create-test")}
					aria-label="Neuen Test erstellen"
				>
					<Pencil className="h-4 w-4" />
					Test erstellen
				</Button>
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
											<div className="flex items-center gap-2">
												<h2 className="text-xl font-semibold">{test.title}</h2>
												{test.isAIGenerated && (
													<Badge
														variant="outline"
														className="gap-1 text-xs"
													>
														<Sparkles className="h-3 w-3" />
														KI
													</Badge>
												)}
											</div>
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

									<div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
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
								<div className="md:col-span-2 bg-muted/20 flex flex-row flex-wrap md:flex-col justify-center items-stretch gap-2 p-4 md:p-5">
									<Button
										variant="default"
										className="w-full justify-start"
										onClick={() => handleEditTest(test.id!)}
									>
										<Pencil className="mr-2 h-4 w-4" />
										Bearbeiten
									</Button>

									<Button
										variant="outline"
										className="w-full justify-start"
										onClick={() => setResultsTest(test)}
									>
										<BarChart3 className="mr-2 h-4 w-4" />
										Ergebnisse
									</Button>

									<Button
										variant="outline"
										className="w-full justify-start"
										onClick={() => handleShareTest(test.id!)}
									>
										<Share2 className="mr-2 h-4 w-4" />
										Teilen
									</Button>

									<Button
										variant="ghost"
										className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
										onClick={() => confirmDelete(test.id!)}
									>
										<Trash2 className="mr-2 h-4 w-4" />
										Löschen
									</Button>
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
					<div className="flex items-center space-x-2 py-4">
						<Checkbox 
							id="dont-show-again" 
							checked={dontShowAgain}
							onCheckedChange={(checked) => setDontShowAgain(checked === true)}
						/>
						<label
							htmlFor="dont-show-again"
							className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							Nicht mehr nachfragen
						</label>
					</div>
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
			
			{/* Per-test results dialog */}
			<TestResultsDialog
				open={!!resultsTest}
				onOpenChange={(o) => {
					if (!o) setResultsTest(null);
				}}
				test={resultsTest}
			/>

			{/* Settings Dialog for Resetting Preferences */}
			<AlertDialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Einstellungen</AlertDialogTitle>
						<AlertDialogDescription>
							Hier können Sie Ihre Benutzereinstellungen zurücksetzen.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="py-4">
						<Button 
							variant="outline" 
							onClick={() => {
								resetCategory("confirmations");
								toast.success("Bestätigungsdialoge wurden zurückgesetzt");
								setSettingsDialogOpen(false);
							}}
							className="w-full"
						>
							Bestätigungsdialoge zurücksetzen
						</Button>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel>Schließen</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default TestsManagement;
