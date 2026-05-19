"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInAnonymously, signOut } from "firebase/auth";
import { KeyRound, User as UserIcon } from "lucide-react";

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
	const { currentUser, role, anonAttempt, loading } = useAuth();
	const [displayName, setDisplayName] = useState("");
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	// If already a signed-in real student or teacher, route them away —
	// quick-access is for kids without managed accounts.
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
		if (role === "anonymous" && anonAttempt?.testId) {
			router.push(`/student/worksheet?id=${anonAttempt.testId}`);
		}
	}, [currentUser, role, anonAttempt, loading, router]);

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
		let signedIn = false;
		try {
			// Need to be authenticated to read quickCodes (rules require it),
			// so sign in as anonymous first and check the code afterwards.
			const cred = await signInAnonymously(auth);
			signedIn = true;
			const lookup = await lookupQuickCode(codeInput);
			if (!lookup) {
				// Throw away the just-created anon user so we don't accumulate
				// orphaned anonymous identities on every typo.
				await signOut(auth);
				setError("Code nicht gefunden. Bitte beim Lehrer:in nachfragen.");
				return;
			}
			await createQuickAttempt(cred.user.uid, {
				code: codeInput,
				testId: lookup.testId,
				teacherId: lookup.teacherId,
				displayName: name,
			});
			router.push(`/student/worksheet?id=${lookup.testId}`);
		} catch (err: any) {
			console.error("Quick login error:", err);
			if (signedIn) {
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
		<div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Schnellzugang</CardTitle>
					<CardDescription>
						Mit Namen und Code anmelden. Dein Zugang läuft nach 24 Stunden ab.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="quick-name">Name</Label>
							<div className="relative">
								<UserIcon className="absolute left-2.5 top-2.5 h-5 w-5 text-muted-foreground" />
								<Input
									id="quick-name"
									type="text"
									autoComplete="off"
									placeholder="z. B. Anna"
									className="pl-10"
									value={displayName}
									onChange={(e) => setDisplayName(e.target.value)}
									maxLength={40}
									required
									disabled={isLoading}
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="quick-code">Code</Label>
							<div className="relative">
								<KeyRound className="absolute left-2.5 top-2.5 h-5 w-5 text-muted-foreground" />
								<Input
									id="quick-code"
									type="text"
									inputMode="text"
									autoComplete="off"
									autoCapitalize="none"
									spellCheck={false}
									placeholder="z. B. k7m2px"
									className="pl-10 font-mono tracking-widest"
									value={code}
									onChange={(e) => setCode(e.target.value)}
									maxLength={6}
									required
									disabled={isLoading}
								/>
							</div>
						</div>
						{error && (
							<p className="text-sm font-medium text-destructive">{error}</p>
						)}
						<Button type="submit" disabled={isLoading} className="w-full">
							{isLoading ? "Anmelden…" : "Loslegen"}
						</Button>
						<div className="text-center text-sm text-muted-foreground border-t pt-3">
							Du hast eigene Zugangsdaten?{" "}
							<Link
								href="/student/login"
								className="text-primary hover:underline"
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
