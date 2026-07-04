"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signInAnonymously, signOut } from "firebase/auth";
import { ArrowRight, KeyRound, User as UserIcon } from "lucide-react";

import { auth } from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";
import {
	createQuickAttempt,
	isValidQuickCode,
	lookupQuickCode,
	normaliseQuickCode,
} from "@/lib/firebase/quickAccess";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const StudentQuickLoginClient: React.FC = () => {
	const router = useRouter();
	const params = useSearchParams();
	const { currentUser, role, anonAttempt, refreshAnonAttempt, loading } =
		useAuth();
	// Prefill the code from the URL (?code=...) so a kid arriving via the
	// teacher-shared QR / link only has to type their name.
	const initialCode = (params.get("code") ?? "").trim().toLowerCase();
	const [displayName, setDisplayName] = useState("");
	const [code, setCode] = useState(initialCode);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	// If already a signed-in real student or teacher, route them away —
	// quick-access is for kids without managed accounts.
	//
	// Anonymous users are deliberately NOT redirected here, even when they
	// already have an attempt: this form is the only place to enter a code,
	// so bouncing them to their current test would trap them on the old one
	// when a teacher hands out a second code mid-lesson (they'd have to log
	// out to escape). Resume-on-reopen still works via the /student root.
	useEffect(() => {
		if (loading || !currentUser) return;
		if (role === "teacher") {
			router.push("/teacher/dashboard");
			return;
		}
		if (role === "student") {
			router.push("/student/dashboard");
			return;
		}
	}, [currentUser, role, loading, router]);

	// Returning kid with an existing attempt: prefill their saved name once
	// so switching to a new code is just "type code → Loslegen".
	const namePrefilled = React.useRef(false);
	useEffect(() => {
		if (!namePrefilled.current && anonAttempt?.displayName) {
			setDisplayName((cur) => cur || anonAttempt.displayName);
			namePrefilled.current = true;
		}
	}, [anonAttempt]);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);

		const name = displayName.trim();
		const codeInput = normaliseQuickCode(code);

		if (!name) {
			setError("Bitte gib deinen Namen ein.");
			return;
		}
		if (!isValidQuickCode(codeInput)) {
			setError("Der Code besteht aus 6 Zeichen (Buchstaben und Zahlen).");
			return;
		}

		setIsLoading(true);
		// If a kid is already in an anonymous session (mid-test), signInAnonymously
		// returns that SAME user — so we must never sign it out on a failed lookup
		// or error, which would silently destroy their in-progress test over one
		// mistyped code. Only a freshly-minted throwaway user may be discarded.
		const hadAnonSession = !!auth.currentUser?.isAnonymous;
		let createdThrowawayAnon = false;
		try {
			// Need to be authenticated to read quickCodes (rules require it),
			// so sign in as anonymous first and check the code afterwards.
			const cred = await signInAnonymously(auth);
			createdThrowawayAnon = !hadAnonSession;
			const lookup = await lookupQuickCode(codeInput);
			if (!lookup) {
				// Discard only a just-created throwaway user; keep an existing
				// in-progress session intact.
				if (createdThrowawayAnon) await signOut(auth);
				setError("Code nicht gefunden. Bitte bei der Lehrkraft nachfragen.");
				return;
			}
			await createQuickAttempt(cred.user.uid, {
				code: codeInput,
				testId: lookup.testId,
				teacherId: lookup.teacherId,
				displayName: name,
			});
			// The auth listener already fetched quickAttempts/{uid} when
			// signInAnonymously fired — BEFORE the doc existed — so the
			// context is holding anonAttempt = null and the worksheet would
			// wait forever. Refresh it now that the attempt is written.
			await refreshAnonAttempt();
			router.push(`/student/worksheet?id=${lookup.testId}`);
		} catch (err: any) {
			console.error("Quick login error:", err);
			if (createdThrowawayAnon) {
				try {
					await signOut(auth);
				} catch {
					// ignore
				}
			}
			setError("Anmeldung fehlgeschlagen. Bitte erneut versuchen.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
			<div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-2xl items-center justify-center px-4 py-8 ipad-safe-x">
				<Card className="w-full border-primary/20 shadow-sm">
					<CardHeader className="space-y-2 text-center">
						<CardTitle className="text-3xl">Schnellzugang</CardTitle>
						<CardDescription className="mx-auto max-w-md text-base">
							Gib deinen Namen und den Code der Lehrkraft ein.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{role === "anonymous" && anonAttempt?.testId && (
							<div className="mb-5 rounded-md border border-primary/30 bg-primary/5 px-3 py-3 text-sm">
								<p className="text-muted-foreground">
									Du arbeitest gerade an einem Test. Gib einen neuen
									Code ein, um zu einem anderen Test zu wechseln.
								</p>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="mt-2 w-full sm:w-auto"
									onClick={() =>
										router.push(
											`/student/worksheet?id=${anonAttempt.testId}`
										)
									}
									disabled={isLoading}
								>
									Weiter mit dem aktuellen Test
								</Button>
							</div>
						)}
						<form onSubmit={handleSubmit} className="grid gap-5">
							<div className="grid gap-2">
								<Label htmlFor="quick-name" className="text-base">
									Name
								</Label>
								<div className="relative">
									<UserIcon className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
									<Input
										id="quick-name"
										type="text"
										autoComplete="off"
										placeholder="z. B. Anna"
										className="h-12 pl-11 text-lg md:text-lg"
										value={displayName}
										onChange={(e) => setDisplayName(e.target.value)}
										maxLength={40}
									required
									disabled={isLoading}
								/>
							</div>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="quick-code" className="text-base">
									Code
								</Label>
								<div className="relative">
									<KeyRound className="absolute left-3 top-4 h-5 w-5 text-muted-foreground" />
									<Input
										id="quick-code"
										type="text"
										inputMode="text"
										autoComplete="off"
										autoCapitalize="characters"
										spellCheck={false}
										placeholder="z. B. K7M2PX"
										className="h-14 pl-11 font-mono text-2xl uppercase tracking-[0.25em] md:text-2xl"
										value={code}
										onChange={(e) => setCode(e.target.value.toUpperCase())}
										maxLength={6}
										required
										disabled={isLoading}
								/>
							</div>
						</div>
							{error && (
								<p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
									{error}
								</p>
							)}
							<p className="text-xs text-muted-foreground">
								Hinweis: Deine Lehrkraft kann deine Ergebnisse kurzzeitig
								(höchstens 24 Stunden) speichern. Mehr dazu in der{" "}
								<Link
									href="/datenschutz"
									className="text-accent hover:underline"
								>
									Datenschutzerklärung
								</Link>
								.
							</p>
							<Button type="submit" disabled={isLoading} className="h-12 w-full text-base">
								{isLoading ? "Anmelden…" : "Loslegen"}
								{!isLoading && <ArrowRight className="h-5 w-5" />}
							</Button>
						<div className="text-center text-sm text-muted-foreground border-t pt-3">
							Du hast eigene Zugangsdaten?{" "}
							<Link
								href="/student/login"
								className="text-accent hover:underline"
							>
								Hier anmelden
							</Link>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
};

export default StudentQuickLoginClient;
