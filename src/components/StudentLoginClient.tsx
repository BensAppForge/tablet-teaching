"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

import Link from "next/link";

import { auth } from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";
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

const StudentLoginClient: React.FC = () => {
	const router = useRouter();
	const { currentUser, role, loading } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	// If already signed in, route to the right dashboard.
	useEffect(() => {
		if (loading || !currentUser) return;
		router.push(role === "teacher" ? "/teacher/dashboard" : "/student/dashboard");
	}, [currentUser, role, loading, router]);

	const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);
		setIsLoading(true);
		try {
			await signInWithEmailAndPassword(auth, email.trim(), password);
			// AuthContext will update via onAuthStateChanged; the effect
			// above then handles the redirect.
		} catch (err: any) {
			console.error("Student login error:", err);
			let msg = "Anmeldung fehlgeschlagen. Bitte erneut versuchen.";
			if (
				err.code === "auth/invalid-credential" ||
				err.code === "auth/user-not-found" ||
				err.code === "auth/wrong-password"
			) {
				msg = "E-Mail oder Passwort ist falsch.";
			} else if (err.code === "auth/invalid-email") {
				msg = "Ungültige E-Mail-Adresse.";
			} else if (err.code === "auth/user-disabled") {
				msg = "Dieser Zugang wurde deaktiviert.";
			}
			setError(msg);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Schüler:innen-Anmeldung</CardTitle>
					<CardDescription>
						Melde dich mit der E-Mail und dem Passwort an, die du von deiner
						Lehrkraft bekommen hast.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleLogin} className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="student-email">E-Mail</Label>
							<div className="relative">
								<Mail className="absolute left-2.5 top-3.5 h-5 w-5 text-muted-foreground" />
								<Input
									id="student-email"
									type="email"
									inputMode="email"
									autoComplete="username"
									placeholder="z. B. anna-b@tablet-teaching.app"
									className="h-12 pl-10 text-base"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									disabled={isLoading}
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="student-password">Passwort</Label>
							<div className="relative">
								<Lock className="absolute left-2.5 top-3.5 h-5 w-5 text-muted-foreground" />
								<Input
									id="student-password"
									type={showPassword ? "text" : "password"}
									autoComplete="current-password"
									placeholder="z. B. katzeblau47"
									className="h-12 pl-10 pr-10 text-base"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									disabled={isLoading}
								/>
								<button
									type="button"
									className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground hover:text-accent focus:outline-none"
									onClick={() => setShowPassword((v) => !v)}
									tabIndex={-1}
									aria-label={
										showPassword ? "Passwort verbergen" : "Passwort anzeigen"
									}
								>
									{showPassword ? (
										<EyeOff className="h-5 w-5" />
									) : (
										<Eye className="h-5 w-5" />
									)}
								</button>
							</div>
						</div>
						{error && (
							<p className="text-sm font-medium text-destructive">{error}</p>
						)}
						<Button type="submit" disabled={isLoading} className="h-12 w-full text-base">
							{isLoading ? "Anmelden…" : "Anmelden"}
						</Button>
						<div className="text-center text-sm text-muted-foreground">
							Kein Zugang? Mit{" "}
							<Link
								href="/student/quick"
								className="text-accent hover:underline"
							>
								Schnellzugang
							</Link>{" "}
							anmelden.
						</div>
						<div className="text-center text-sm text-muted-foreground border-t pt-3">
							Sie sind Lehrkraft?{" "}
							<Link
								href="/auth/teacher-login"
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

export default StudentLoginClient;
