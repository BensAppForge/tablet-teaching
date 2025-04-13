"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { auth } from "@/lib/firebase/config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";

// Password validation requirements
const passwordRequirements = [
	{
		id: "length",
		label: "Mindestens 6 Zeichen",
		validator: (password: string) => password.length >= 6,
	},
	{
		id: "number",
		label: "Mindestens eine Zahl",
		validator: (password: string) => /\d/.test(password),
	},
	{
		id: "special",
		label: "Mindestens ein Sonderzeichen",
		validator: (password: string) =>
			/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password),
	},
];

const TeacherSignupPage: React.FC = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [passwordConfirm, setPasswordConfirm] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [validations, setValidations] = useState<{ [key: string]: boolean }>({
		length: false,
		number: false,
		special: false,
	});
	const [passwordMatch, setPasswordMatch] = useState(true);
	const router = useRouter();

	// Check password requirements when password changes
	useEffect(() => {
		const newValidations = { ...validations };
		passwordRequirements.forEach((requirement) => {
			newValidations[requirement.id] = requirement.validator(password);
		});
		setValidations(newValidations);
	}, [password]);

	// Check password matching
	useEffect(() => {
		if (passwordConfirm) {
			setPasswordMatch(password === passwordConfirm);
		} else {
			setPasswordMatch(true); // Don't show error when confirm field is empty
		}
	}, [password, passwordConfirm]);

	const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);

		// Check if all password requirements are met
		const isPasswordValid = Object.values(validations).every((valid) => valid);
		if (!isPasswordValid) {
			setError("Das Passwort erfüllt nicht alle Anforderungen.");
			return;
		}

		// Check if passwords match
		if (password !== passwordConfirm) {
			setError("Die Passwörter stimmen nicht überein.");
			return;
		}

		setIsLoading(true);

		try {
			// Create a new user with email and password
			await createUserWithEmailAndPassword(auth, email, password);

			// Success - redirect to dashboard or login
			router.push("/teacher/dashboard");
		} catch (err: any) {
			console.error("Firebase Signup Error:", err);

			// Handle specific Firebase auth errors
			let errorMessage =
				"Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.";
			if (err.code === "auth/email-already-in-use") {
				errorMessage = "Diese E-Mail-Adresse wird bereits verwendet.";
			} else if (err.code === "auth/invalid-email") {
				errorMessage = "Ungültige E-Mail-Adresse.";
			} else if (err.code === "auth/weak-password") {
				errorMessage = "Das Passwort ist zu schwach.";
			}

			setError(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Lehrer Registrierung</CardTitle>
					<CardDescription>
						Erstellen Sie ein neues Lehrer-Konto.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSignup} className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="email">Email</Label>
							<div className="relative">
								<Mail className="absolute left-2.5 top-2.5 h-5 w-5 text-muted-foreground" />
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
								<Lock className="absolute left-2.5 top-2.5 h-5 w-5 text-muted-foreground" />
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
									onClick={() => setShowPassword(!showPassword)}
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

							{/* Password requirements list */}
							<div className="mt-2 space-y-1">
								{passwordRequirements.map((req) => (
									<div key={req.id} className="flex items-center text-sm">
										{validations[req.id] ? (
											<CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
										) : (
											<XCircle className="h-4 w-4 mr-2 text-red-500" />
										)}
										<span
											className={
												validations[req.id]
													? "text-muted-foreground"
													: "text-muted-foreground"
											}
										>
											{req.label}
										</span>
									</div>
								))}
							</div>
						</div>

						<div className="grid gap-2">
							<Label
								htmlFor="passwordConfirm"
								className={
									!passwordMatch && passwordConfirm ? "text-destructive" : ""
								}
							>
								Passwort bestätigen
							</Label>
							<div className="relative">
								<Lock className="absolute left-2.5 top-2.5 h-5 w-5 text-muted-foreground" />
								<Input
									type={showPasswordConfirm ? "text" : "password"}
									id="passwordConfirm"
									placeholder="Passwort bestätigen"
									className={`pl-10 pr-10 ${
										!passwordMatch && passwordConfirm
											? "border-destructive"
											: ""
									}`}
									value={passwordConfirm}
									onChange={(e) => setPasswordConfirm(e.target.value)}
									required
									disabled={isLoading}
								/>
								<button
									type="button"
									className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-primary focus:outline-none"
									onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
									tabIndex={-1}
									aria-label={
										showPasswordConfirm
											? "Passwort verbergen"
											: "Passwort anzeigen"
									}
								>
									{showPasswordConfirm ? (
										<EyeOff className="h-5 w-5" />
									) : (
										<Eye className="h-5 w-5" />
									)}
								</button>
							</div>
							{!passwordMatch && passwordConfirm && (
								<p className="text-xs text-destructive mt-1">
									Die Passwörter stimmen nicht überein
								</p>
							)}
						</div>

						{error && (
							<p className="text-sm font-medium text-destructive">{error}</p>
						)}

						<Button type="submit" disabled={isLoading} className="w-full">
							{isLoading ? "Registrieren..." : "Registrieren"}
						</Button>

						<div className="text-center text-sm text-muted-foreground">
							Bereits ein Konto?{" "}
							<Link
								href="/auth/teacher-login"
								className="text-primary hover:underline"
							>
								Anmelden
							</Link>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
};

export default TeacherSignupPage;
