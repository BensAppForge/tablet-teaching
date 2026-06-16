"use client";

import React from "react";
import Link from "next/link";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

// CLOSED BETA: self-service teacher registration is disabled. The account
// creation flow (createUserWithEmailAndPassword + teachers doc) has been
// removed so no new teacher accounts can be created from the UI; the
// Firestore rules also reject creating a teachers/{uid} doc. New beta
// testers are onboarded manually. To re-open registration, restore the
// previous version of this file from git history and flip the create rule.
const TeacherSignupPage: React.FC = () => {
	return (
		<div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
			<Card className="w-full max-w-md">
				<CardHeader>
					<div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
						<Lock className="h-6 w-6 text-muted-foreground" />
					</div>
					<CardTitle>Registrierung geschlossen</CardTitle>
					<CardDescription>
						Tablet Teaching befindet sich derzeit in einer geschlossenen
						Beta-Phase.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4 text-sm text-muted-foreground">
					<p>
						Neue Lehrer-Konten werden zurzeit nur auf Einladung angelegt. Eine
						offene Registrierung ist noch nicht möglich.
					</p>
					<p>
						Wenn du Interesse hast, die App zu testen, melde dich gern bei uns –
						wir nehmen dich in die Beta auf, sobald wieder Plätze frei sind.
					</p>
				</CardContent>
				<CardFooter className="flex-col gap-3">
					<Button asChild className="w-full">
						<Link href="/auth/teacher-login">Zur Anmeldung</Link>
					</Button>
					<Button asChild variant="ghost" className="w-full">
						<Link href="/">Zur Startseite</Link>
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
};

export default TeacherSignupPage;
