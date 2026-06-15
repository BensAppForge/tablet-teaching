"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Copy, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { getTest, updateTest, Test } from "@/lib/firebase/tests";
import {
	createQuickCode,
	deleteQuickCode,
	findUniqueQuickCode,
} from "@/lib/firebase/quickAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ShareQr from "@/components/ShareQr";

const QuickAccessManagement: React.FC = () => {
	const router = useRouter();
	const params = useSearchParams();
	const testId = params.get("id") ?? "";
	const { currentUser } = useAuth();

	const [test, setTest] = useState<Test | null>(null);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (!testId || !currentUser) return;
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const { test } = await getTest(testId);
				if (cancelled) return;
				if (test.teacherId !== currentUser.uid) {
					toast.error("Keine Berechtigung für diesen Test");
					router.push("/tests");
					return;
				}
				setTest(test);
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

	const quickCode = test?.quickCode ?? null;

	// URL the QR encodes. Prefer NEXT_PUBLIC_APP_URL so a production deploy
	// never emits a localhost QR from a dev machine.
	const quickUrl = useMemo(() => {
		if (!quickCode) return null;
		const envOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
		const origin =
			envOrigin ||
			(typeof window !== "undefined" ? window.location.origin : null);
		if (!origin) return null;
		return `${origin}/student/quick?code=${quickCode}`;
	}, [quickCode]);

	const enableQuickAccess = async () => {
		if (!test || !currentUser) return;
		setBusy(true);
		try {
			const code = await findUniqueQuickCode();
			await createQuickCode(code, test.id!, currentUser.uid);
			await updateTest(test.id!, { quickCode: code });
			setTest({ ...test, quickCode: code });
			toast.success("Schnellzugang aktiviert");
		} catch (err) {
			console.error(err);
			toast.error("Schnellzugang konnte nicht aktiviert werden");
		} finally {
			setBusy(false);
		}
	};

	const disableQuickAccess = async () => {
		if (!test || !quickCode) return;
		setBusy(true);
		try {
			// Test doc first, code doc second: if the second step fails the
			// UI still reads "deactivated" and a retry cleans up the code doc.
			await updateTest(test.id!, { quickCode: undefined });
			await deleteQuickCode(quickCode);
			setTest({ ...test, quickCode: undefined });
			toast.success("Schnellzugang deaktiviert");
		} catch (err) {
			console.error(err);
			toast.error("Schnellzugang konnte nicht deaktiviert werden");
		} finally {
			setBusy(false);
		}
	};

	const rotateCode = async () => {
		if (!test || !currentUser || !quickCode) return;
		setBusy(true);
		try {
			const next = await findUniqueQuickCode();
			await createQuickCode(next, test.id!, currentUser.uid);
			await updateTest(test.id!, { quickCode: next });
			await deleteQuickCode(quickCode);
			setTest({ ...test, quickCode: next });
			toast.success("Neuer Code erzeugt");
		} catch (err) {
			console.error(err);
			toast.error("Code konnte nicht neu erzeugt werden");
		} finally {
			setBusy(false);
		}
	};

	const copyCode = () => {
		if (!quickCode || typeof navigator === "undefined" || !navigator.clipboard)
			return;
		navigator.clipboard
			.writeText(quickCode)
			.then(() => toast.success("Code kopiert"))
			.catch(() => toast.error("Kopieren fehlgeschlagen"));
	};

	const copyLink = () => {
		if (!quickUrl || typeof navigator === "undefined" || !navigator.clipboard)
			return;
		navigator.clipboard
			.writeText(quickUrl)
			.then(() => toast.success("Link kopiert"))
			.catch(() => toast.error("Kopieren fehlgeschlagen"));
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!test) {
		return (
			<div className="container mx-auto px-4 py-6">
				<p className="text-muted-foreground">Test nicht gefunden.</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-6 max-w-3xl">
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

			<div className="border-b mb-6">
				<h1 className="text-2xl font-semibold py-2 text-gray-700 dark:text-gray-200">
					Schnellzugang: {test.title}
				</h1>
			</div>

			<Card className="mb-6">
				<CardHeader>
					<CardTitle>Schnellzugang</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Schüler:innen melden sich anonym mit Namen und Code an. Der
						Zugang verfällt nach 24 Stunden automatisch. Ergebnisse aus dem
						Schnellzugang werden nicht gespeichert und erscheinen nicht
						unter „Ergebnisse" — dafür braucht es Schülerzugänge über eine
						Klasse.
					</p>
					<div className="flex items-center gap-3">
						<Switch
							id="quick-toggle"
							checked={!!quickCode}
							disabled={busy}
							onCheckedChange={(checked) =>
								checked ? enableQuickAccess() : disableQuickAccess()
							}
						/>
						<Label
							htmlFor="quick-toggle"
							className="text-sm font-normal cursor-pointer"
						>
							Schnellzugang aktivieren
						</Label>
						{busy && (
							<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
						)}
					</div>

					{quickCode && (
						<div className="flex flex-col md:flex-row gap-6 pt-2">
							<div className="flex-1 space-y-3">
								<div>
									<Label className="text-xs text-muted-foreground">
										Code zum Diktieren
									</Label>
									<div className="flex items-center gap-2 mt-1">
										<div className="relative flex-1">
											<KeyRound className="absolute left-2.5 top-2.5 h-5 w-5 text-muted-foreground" />
											<Input
												readOnly
												value={quickCode}
												className="pl-10 font-mono tracking-widest text-base"
											/>
										</div>
										<Button
											type="button"
											variant="outline"
											size="icon"
											aria-label="Code kopieren"
											onClick={copyCode}
										>
											<Copy className="h-4 w-4" />
										</Button>
									</div>
								</div>
								<div>
									<Label className="text-xs text-muted-foreground">
										Direkter Link
									</Label>
									<div className="flex items-center gap-2 mt-1">
										<Input
											readOnly
											value={quickUrl ?? ""}
											className="text-xs"
										/>
										<Button
											type="button"
											variant="outline"
											size="icon"
											aria-label="Link kopieren"
											onClick={copyLink}
										>
											<Copy className="h-4 w-4" />
										</Button>
									</div>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={rotateCode}
									disabled={busy}
								>
									<RefreshCw className="h-4 w-4 mr-2" />
									Neuen Code erzeugen
								</Button>
							</div>
							{quickUrl && (
								<div className="flex flex-col items-center gap-2 shrink-0">
									<ShareQr
										value={quickUrl}
										caption={test.title}
										downloadFileName={test.title}
									/>
									<p className="text-xs text-muted-foreground text-center max-w-[12rem]">
										Antippen zum Vergrößern – Schüler:innen scannen mit
										der iPad-Kamera.
									</p>
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
};

export default QuickAccessManagement;
