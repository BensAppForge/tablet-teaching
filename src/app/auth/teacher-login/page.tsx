"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase/config";
import {
	signInWithEmailAndPassword,
	sendPasswordResetEmail,
} from "firebase/auth";
import Link from "next/link";
import { toast } from "sonner";
import AuthRedirect from "@/components/AuthRedirect";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

const TeacherLoginForm: React.FC = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [resetOpen, setResetOpen] = useState(false);
	const [resetEmail, setResetEmail] = useState("");
	const [resetBusy, setResetBusy] = useState(false);
	const router = useRouter();

	const openReset = () => {
		setResetEmail(email);
		setResetOpen(true);
	};

	const handleReset = async () => {
		const addr = resetEmail.trim();
		if (!addr) {
			toast.error("Bitte E-Mail-Adresse eingeben.");
			return;
		}
		setResetBusy(true);
		try {
			await sendPasswordResetEmail(auth, addr);
		} catch (err: any) {
			// Don't leak which addresses exist: only a malformed address is
			// surfaced; everything else is reported as success.
			if (err?.code === "auth/invalid-email") {
				toast.error("Ungültige E-Mail-Adresse.");
				setResetBusy(false);
				return;
			}
			console.error("Password reset error:", err);
		}
		setResetBusy(false);
		setResetOpen(false);
		toast.success(
			"Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail zum Zurücksetzen gesendet."
		);
	};

	const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);
		setIsLoading(true);

		try {
			await signInWithEmailAndPassword(auth, email, password);
			router.push("/teacher/dashboard");
		} catch (err: any) {
			console.error("Firebase Login Error:", err);
			let errorMessage =
				"Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben.";
			if (
				err.code === "auth/invalid-credential" ||
				err.code === "auth/user-not-found" ||
				err.code === "auth/wrong-password"
			) {
				errorMessage = "Ungültige E-Mail oder Passwort.";
			} else if (err.code === "auth/invalid-email") {
				errorMessage = "Ungültige E-Mail-Adresse.";
			}
			setError(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	const togglePasswordVisibility = () => {
		setShowPassword(!showPassword);
	};

	return (
		<div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Lehrer Anmeldung</CardTitle>
					<CardDescription>
						Melden Sie sich mit Ihrem Lehrer-Konto an.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleLogin} className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="email">Email</Label>
							<div className="relative">
								<Mail
									className={`absolute left-2.5 top-2.5 h-5 w-5 text-muted-foreground peer-focus:text-accent`}
								/>
								<Input
									type="email"
									id="email"
									placeholder="name@beispiel.com"
									className="pl-10"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									disabled={isLoading}
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="password">Passwort</Label>
							<div className="relative">
								<Lock
									className={`absolute left-2.5 top-2.5 h-5 w-5 text-muted-foreground peer-focus:text-accent`}
								/>
								<Input
									type={showPassword ? "text" : "password"}
									id="password"
									placeholder="Passwort"
									className="pl-10 pr-10"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									disabled={isLoading}
								/>
								<button
									type="button"
									className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-accent focus:outline-none"
									onClick={togglePasswordVisibility}
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
						<Button type="submit" disabled={isLoading} className="w-full">
							{isLoading ? "Anmelden..." : "Anmelden"}
						</Button>
						<div className="text-center">
							<button
								type="button"
								onClick={openReset}
								className="text-sm text-accent hover:underline"
							>
								Passwort vergessen?
							</button>
						</div>
						<div className="text-center text-xs text-muted-foreground">
							Tablet Teaching ist derzeit in geschlossener Beta. Neue Konten
							werden nur auf Einladung angelegt.
						</div>
						<div className="text-center text-sm text-muted-foreground border-t pt-3">
							Du bist Schüler:in?{" "}
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

			<Dialog open={resetOpen} onOpenChange={setResetOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Passwort zurücksetzen</DialogTitle>
						<DialogDescription>
							Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum
							Zurücksetzen deines Passworts.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-2 py-1">
						<Label htmlFor="reset-email">E-Mail</Label>
						<Input
							id="reset-email"
							type="email"
							autoFocus
							placeholder="name@beispiel.com"
							value={resetEmail}
							onChange={(e) => setResetEmail(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !resetBusy) {
									e.preventDefault();
									handleReset();
								}
							}}
							disabled={resetBusy}
						/>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setResetOpen(false)}
							disabled={resetBusy}
						>
							Abbrechen
						</Button>
						<Button onClick={handleReset} disabled={resetBusy}>
							{resetBusy ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Senden…
								</>
							) : (
								"Link senden"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

const TeacherLoginPage: React.FC = () => {
	return (
		<AuthRedirect>
			<TeacherLoginForm />
		</AuthRedirect>
	);
};

export default TeacherLoginPage;
