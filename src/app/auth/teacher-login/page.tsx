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
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { auth } from "@/lib/firebase/config";
import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import AuthRedirect from "@/components/AuthRedirect";

const TeacherLoginForm: React.FC = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const router = useRouter();

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
									className={`absolute left-2.5 top-2.5 h-5 w-5 text-muted-foreground peer-focus:text-primary`}
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
									className={`absolute left-2.5 top-2.5 h-5 w-5 text-muted-foreground peer-focus:text-primary`}
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
									className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-primary focus:outline-none"
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
						<div className="text-center text-sm text-muted-foreground">
							Noch kein Konto?{" "}
							<Link
								href="/auth/teacher-signup"
								className="text-primary hover:underline"
							>
								Registrieren
							</Link>
						</div>
					</form>
				</CardContent>
			</Card>
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
