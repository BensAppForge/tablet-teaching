"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToTeacherTests, Test, deleteTest } from "@/lib/firebase/tests";
import {
	subscribeToTeacherCollections,
	createCollection,
	updateCollection,
	deleteCollection,
	setTestCollection,
	TestCollection,
	COLLECTION_NAME_MAX,
} from "@/lib/firebase/collections";
import {
	COLLECTION_COLORS,
	collectionColor,
	DEFAULT_COLLECTION_COLOR,
	type CollectionColor,
} from "@/lib/collectionColors";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Pencil,
	Trash2,
	Users,
	KeyRound,
	Tag,
	Book,
	Calendar,
	ArrowLeft,
	Settings,
	Sparkles,
	BarChart3,
	Folder,
	FolderOpen,
	FolderPlus,
	MoreVertical,
	FolderInput,
	Presentation,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import ErrorState from "@/components/ErrorState";
import TestResultsDialog from "@/components/TestResultsDialog";
import CollectionPicker from "@/components/CollectionPicker";
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useUserPreferences } from "@/hooks/use-user-preferences";

// Sentinel for the "no collection" folder. Real ids are Firestore
// auto-ids, so this can never collide.
const NONE = "__none__";

const TestsManagement: React.FC = () => {
	const { currentUser } = useAuth();
	const router = useRouter();
	const { preferences, updatePreference, resetCategory } = useUserPreferences();
	const [tests, setTests] = useState<Test[]>([]);
	const [collections, setCollections] = useState<TestCollection[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);
	const [reloadKey, setReloadKey] = useState(0);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [testToDelete, setTestToDelete] = useState<string | null>(null);
	const [dontShowAgain, setDontShowAgain] = useState(false);
	const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
	const [resultsTest, setResultsTest] = useState<Test | null>(null);

	// Folder navigation: null = folder grid (root); NONE = "Ohne Sammlung";
	// a collection id = that collection's tests.
	const [openFolder, setOpenFolder] = useState<string | null>(null);

	// Collection management dialogs.
	const [moveTest, setMoveTest] = useState<Test | null>(null);
	const [nameDialog, setNameDialog] = useState<
		{
			mode: "create" | "rename";
			id?: string;
			value: string;
			color: CollectionColor;
		} | null
	>(null);
	const [savingName, setSavingName] = useState(false);
	const [collectionToDelete, setCollectionToDelete] =
		useState<TestCollection | null>(null);

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
		setLoadError(false);
		const unsubTests = subscribeToTeacherTests(
			currentUser.uid,
			(list) => {
				setTests(list);
				setLoading(false);
			},
			(error) => {
				console.error("Error loading tests:", error);
				setLoadError(true);
				setLoading(false);
			}
		);
		const unsubCollections = subscribeToTeacherCollections(
			currentUser.uid,
			setCollections,
			(error) => console.error("Error loading collections:", error)
		);
		return () => {
			unsubTests();
			unsubCollections();
		};
	}, [currentUser, reloadKey]);

	// Resolve a test to its folder id, mapping unknown/missing collectionId
	// (e.g. a deleted collection) to the "Ohne Sammlung" bucket.
	const knownIds = useMemo(
		() => new Set(collections.map((c) => c.id)),
		[collections]
	);
	const folderIdOf = (test: Test): string =>
		test.collectionId && knownIds.has(test.collectionId)
			? test.collectionId
			: NONE;

	const countByFolder = useMemo(() => {
		const counts = new Map<string, number>();
		for (const t of tests) {
			const id = folderIdOf(t);
			counts.set(id, (counts.get(id) ?? 0) + 1);
		}
		return counts;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tests, knownIds]);

	const openCollection = useMemo(
		() => collections.find((c) => c.id === openFolder) ?? null,
		[collections, openFolder]
	);
	const folderTests = useMemo(
		() => (openFolder ? tests.filter((t) => folderIdOf(t) === openFolder) : []),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[tests, openFolder, knownIds]
	);
	const openFolderName =
		openFolder === NONE
			? "Ohne Sammlung"
			: openCollection?.name ?? "Sammlung";

	const handleEditTest = (testId: string) => {
		router.push(`/edit-test?id=${testId}`);
	};

	const handleCreateTest = () => {
		// Pre-assign the open collection when creating from inside one.
		const suffix =
			openFolder && openFolder !== NONE ? `?collection=${openFolder}` : "";
		router.push(`/create-test${suffix}`);
	};

	// Takes the id as a parameter: confirmDelete may call this in the same
	// tick as setTestToDelete, before the state commit, so reading
	// testToDelete here would see the previous value (null on first use).
	const handleDeleteTest = async (testId: string | null) => {
		if (!testId) return;
		try {
			await deleteTest(testId);
			toast.success("Test wurde erfolgreich gelöscht");
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
		if (preferences.confirmations.deleteTest) {
			setDeleteDialogOpen(true);
		} else {
			handleDeleteTest(testId);
		}
	};

	const handleAssignClass = (testId: string) => {
		router.push(`/share-test?id=${testId}`);
	};

	const handleQuickAccess = (testId: string) => {
		router.push(`/quick-access?id=${testId}`);
	};

	const handleBesprechung = (testId: string) => {
		router.push(`/teacher/besprechung?id=${testId}`);
	};

	const handleSaveName = async () => {
		if (!nameDialog || !currentUser) return;
		const name = nameDialog.value.trim();
		if (!name) return;
		setSavingName(true);
		try {
			if (nameDialog.mode === "create") {
				await createCollection(currentUser.uid, name, nameDialog.color);
				toast.success("Sammlung erstellt");
			} else if (nameDialog.id) {
				await updateCollection(nameDialog.id, {
					name,
					color: nameDialog.color,
				});
				toast.success("Sammlung gespeichert");
			}
			setNameDialog(null);
		} catch (err) {
			console.error(err);
			toast.error("Aktion fehlgeschlagen");
		} finally {
			setSavingName(false);
		}
	};

	const handleDeleteCollection = async () => {
		if (!collectionToDelete?.id || !currentUser) return;
		try {
			await deleteCollection(collectionToDelete.id, currentUser.uid);
			toast.success("Sammlung gelöscht");
			// If we were inside it, drop back to the folder grid.
			if (openFolder === collectionToDelete.id) setOpenFolder(null);
		} catch (err) {
			console.error(err);
			toast.error("Sammlung konnte nicht gelöscht werden");
		} finally {
			setCollectionToDelete(null);
		}
	};

	const handleMove = async (collectionId: string | null) => {
		if (!moveTest?.id) return;
		try {
			await setTestCollection(moveTest.id, collectionId);
			toast.success("Test verschoben");
		} catch (err) {
			console.error(err);
			toast.error("Verschieben fehlgeschlagen");
		} finally {
			setMoveTest(null);
		}
	};

	const formatDate = (timestamp: any) => {
		if (!timestamp) return "Unbekannt";
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return formatDistanceToNow(date, { addSuffix: true, locale: de });
	};

	const renderTestCard = (test: Test) => (
		<Card key={test.id} className="overflow-hidden">
			<div className="grid grid-cols-1 md:grid-cols-6 gap-4">
				{/* Test info */}
				<div className="md:col-span-4 p-6">
					<div className="flex items-start justify-between">
						<div>
							<div className="flex items-center gap-2">
								<h2 className="text-xl font-semibold">{test.title}</h2>
								{test.isAIGenerated && (
									<Badge variant="outline" className="gap-1 text-xs">
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
						<Badge className={cefrColors[test.cefrLevel] || "bg-muted text-muted-foreground"}>
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
						onClick={() => handleBesprechung(test.id!)}
					>
						<Presentation className="mr-2 h-4 w-4" />
						Besprechen
					</Button>

					<Button
						variant="outline"
						className="w-full justify-start"
						onClick={() => handleAssignClass(test.id!)}
					>
						<Users className="mr-2 h-4 w-4" />
						Klasse zuweisen
					</Button>

					<Button
						variant="outline"
						className="w-full justify-start"
						onClick={() => handleQuickAccess(test.id!)}
					>
						<KeyRound className="mr-2 h-4 w-4" />
						Schnellzugang
					</Button>

					<Button
						variant="outline"
						className="w-full justify-start"
						onClick={() => setMoveTest(test)}
					>
						<FolderInput className="mr-2 h-4 w-4" />
						Verschieben
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
	);

	return (
		<PageShell
			title="Tests verwalten"
			backHref="/teacher/dashboard"
			backLabel="Dashboard"
			actions={
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setSettingsDialogOpen(true)}
					aria-label="Einstellungen"
				>
					<Settings className="h-4 w-4" />
				</Button>
			}
		>
			{loading ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
					{[0, 1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-32 w-full rounded-lg" />
					))}
				</div>
			) : loadError ? (
				<ErrorState
					message="Die Tests konnten nicht geladen werden. Bitte die Internetverbindung prüfen und erneut versuchen."
					onRetry={() => setReloadKey((k) => k + 1)}
				/>
			) : openFolder === null ? (
				/* ---------- FOLDER GRID (root) ---------- */
				<>
					<div className="flex flex-wrap justify-end items-center gap-2 mb-8">
						<Button
							variant="outline"
							className="gap-2"
							onClick={() =>
								setNameDialog({
									mode: "create",
									value: "",
									color: DEFAULT_COLLECTION_COLOR,
								})
							}
						>
							<FolderPlus className="h-4 w-4" />
							Neue Sammlung
						</Button>
						<Button
							variant="default"
							className="gap-2"
							onClick={handleCreateTest}
							aria-label="Neuen Test erstellen"
						>
							<Pencil className="h-4 w-4" />
							Test erstellen
						</Button>
					</div>

					{tests.length === 0 && collections.length === 0 ? (
						<Card>
							<CardContent className="flex flex-col items-center justify-center py-12">
								<div className="text-center mb-4">
									<p className="text-muted-foreground">
										Keine Tests gefunden
									</p>
									<p className="text-sm text-muted-foreground mt-1">
										Erstellen Sie Ihren ersten Test, um loszulegen
									</p>
								</div>
								<Button onClick={handleCreateTest}>Test erstellen</Button>
							</CardContent>
						</Card>
					) : (
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
							{collections.map((c) => {
								const color = collectionColor(c.color);
								return (
								<div key={c.id} className="relative">
									<button
										type="button"
										onClick={() => setOpenFolder(c.id!)}
										className="w-full h-32 rounded-lg border bg-card hover:bg-muted/40 transition-colors flex flex-col items-center justify-center gap-2 p-4 text-center"
									>
										<Folder className={cn("h-9 w-9", color.icon)} />
										<span className="text-sm font-medium line-clamp-2">
											{c.name}
										</span>
										<span className="text-xs text-muted-foreground">
											{countByFolder.get(c.id!) ?? 0} Tests
										</span>
									</button>
									<div className="absolute top-1.5 right-1.5">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="h-7 w-7"
													aria-label="Sammlung verwalten"
												>
													<MoreVertical className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													onClick={() =>
														setNameDialog({
															mode: "rename",
															id: c.id,
															value: c.name,
															color: c.color ?? DEFAULT_COLLECTION_COLOR,
														})
													}
												>
													<Pencil className="h-4 w-4 mr-2" />
													Bearbeiten
												</DropdownMenuItem>
												<DropdownMenuItem
													className="text-destructive focus:text-destructive"
													onClick={() => setCollectionToDelete(c)}
												>
													<Trash2 className="h-4 w-4 mr-2" />
													Löschen
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</div>
								);
							})}

							{/* Ohne Sammlung — always present so uncategorised tests
							    have a home; shows even at zero so it's discoverable. */}
							<button
								type="button"
								onClick={() => setOpenFolder(NONE)}
								className="h-32 rounded-lg border border-dashed bg-card hover:bg-muted/40 transition-colors flex flex-col items-center justify-center gap-2 p-4 text-center"
							>
								<Folder className="h-9 w-9 text-muted-foreground" />
								<span className="text-sm font-medium">Ohne Sammlung</span>
								<span className="text-xs text-muted-foreground">
									{countByFolder.get(NONE) ?? 0} Tests
								</span>
							</button>
						</div>
					)}
				</>
			) : (
				/* ---------- FOLDER OPEN ---------- */
				<>
					<div className="flex flex-wrap items-center justify-between gap-3 mb-6">
						<div className="flex items-center gap-2 min-w-0">
							<Button
								variant="outline"
								size="sm"
								className="gap-1 text-muted-foreground"
								onClick={() => setOpenFolder(null)}
							>
								<ArrowLeft className="h-4 w-4" />
								<span>Sammlungen</span>
							</Button>
							<div className="flex items-center gap-2 min-w-0">
								<FolderOpen
									className={cn(
										"h-5 w-5 shrink-0",
										openCollection
											? collectionColor(openCollection.color).icon
											: "text-muted-foreground"
									)}
								/>
								<h2 className="text-lg font-semibold truncate">
									{openFolderName}
								</h2>
								<span className="text-sm text-muted-foreground shrink-0">
									({folderTests.length})
								</span>
							</div>
						</div>
						<div className="flex items-center gap-2">
							{openCollection && (
								<>
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											setNameDialog({
												mode: "rename",
												id: openCollection.id,
												value: openCollection.name,
												color:
													openCollection.color ?? DEFAULT_COLLECTION_COLOR,
											})
										}
									>
										<Pencil className="h-4 w-4 mr-2" />
										Bearbeiten
									</Button>
									<Button
										variant="ghost"
										size="sm"
										className="text-destructive hover:text-destructive"
										onClick={() => setCollectionToDelete(openCollection)}
									>
										<Trash2 className="h-4 w-4 mr-2" />
										Löschen
									</Button>
								</>
							)}
							<Button
								variant="default"
								className="gap-2"
								onClick={handleCreateTest}
							>
								<Pencil className="h-4 w-4" />
								Test erstellen
							</Button>
						</div>
					</div>

					{folderTests.length === 0 ? (
						<Card>
							<CardContent className="flex flex-col items-center justify-center py-12 text-center">
								<p className="text-muted-foreground">
									Diese Sammlung ist leer.
								</p>
								<p className="text-sm text-muted-foreground mt-1">
									Erstellen Sie hier einen Test oder verschieben Sie einen
									bestehenden hierher.
								</p>
							</CardContent>
						</Card>
					) : (
						<div className="space-y-4">{folderTests.map(renderTestCard)}</div>
					)}
				</>
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
							onClick={() => handleDeleteTest(testToDelete)}
						>
							Löschen
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Move-to-collection Dialog */}
			<Dialog
				open={!!moveTest}
				onOpenChange={(o) => {
					if (!o) setMoveTest(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Test verschieben</DialogTitle>
						<DialogDescription>
							In welche Sammlung soll „{moveTest?.title}" verschoben werden?
						</DialogDescription>
					</DialogHeader>
					<div className="py-2">
						<CollectionPicker
							collections={collections}
							value={
								moveTest && moveTest.collectionId &&
								knownIds.has(moveTest.collectionId)
									? moveTest.collectionId
									: null
							}
							onChange={handleMove}
						/>
					</div>
				</DialogContent>
			</Dialog>

			{/* Create / Rename collection Dialog */}
			<Dialog
				open={!!nameDialog}
				onOpenChange={(o) => {
					if (!o) setNameDialog(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{nameDialog?.mode === "rename"
								? "Sammlung bearbeiten"
								: "Neue Sammlung"}
						</DialogTitle>
					</DialogHeader>
					<div className="py-2 space-y-4">
						<div className="space-y-2">
							<Label htmlFor="collection-name">Name</Label>
							<Input
								id="collection-name"
								autoFocus
								value={nameDialog?.value ?? ""}
								maxLength={COLLECTION_NAME_MAX}
								placeholder="z. B. Englisch – Headway B1"
								disabled={savingName}
								onChange={(e) =>
									setNameDialog((prev) =>
										prev ? { ...prev, value: e.target.value } : prev
									)
								}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleSaveName();
									}
								}}
							/>
						</div>
						<div className="space-y-2">
							<Label>Farbe</Label>
							<div className="flex flex-wrap gap-2">
								{COLLECTION_COLORS.map((c) => {
									const selected = nameDialog?.color === c.key;
									return (
										<button
											key={c.key}
											type="button"
											aria-label={c.label}
											aria-pressed={selected}
											title={c.label}
											disabled={savingName}
											onClick={() =>
												setNameDialog((prev) =>
													prev ? { ...prev, color: c.key } : prev
												)
											}
											className={cn(
												"h-9 w-9 rounded-full transition-transform",
												c.dot,
												selected
													? "ring-2 ring-offset-2 ring-ring ring-offset-background scale-105"
													: "opacity-70 hover:opacity-100"
											)}
										/>
									);
								})}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setNameDialog(null)}>
							Abbrechen
						</Button>
						<Button
							onClick={handleSaveName}
							disabled={savingName || !nameDialog?.value.trim()}
						>
							{nameDialog?.mode === "rename" ? "Speichern" : "Erstellen"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete collection confirmation */}
			<AlertDialog
				open={!!collectionToDelete}
				onOpenChange={(o) => {
					if (!o) setCollectionToDelete(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Sammlung löschen?</AlertDialogTitle>
						<AlertDialogDescription>
							„{collectionToDelete?.name}" wird gelöscht. Die enthaltenen
							Tests bleiben erhalten und erscheinen danach unter „Ohne
							Sammlung".
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Abbrechen</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={handleDeleteCollection}
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
		</PageShell>
	);
};

export default TestsManagement;
