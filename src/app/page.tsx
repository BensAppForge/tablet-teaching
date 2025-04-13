"use client";

import Link from "next/link";
import React from "react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

const LandingPage: React.FC = () => {
	return (
		<div className="w-full flex flex-col items-center">
			<h1 className="text-4xl font-bold tracking-tight text-center mb-8 max-w-3xl">
				Quizzes und Tests für den Fremdsprachenunterricht.
			</h1>
			<div className="flex flex-col md:flex-row gap-6">
				<Link
					href="/auth/teacher-login"
					className="transition-transform hover:scale-105"
				>
					<Card className="w-80 h-48 flex flex-col items-center justify-center p-4 hover:shadow-lg transition-shadow">
						<CardHeader className="pb-2">
							<CardTitle className="text-center">Ich bin Lehrkraft</CardTitle>
						</CardHeader>
						<CardContent>
							<CardDescription className="text-center">
								Als Lehrkraft Tests erstellen und verteilen.
							</CardDescription>
						</CardContent>
					</Card>
				</Link>
				<Link
					href="/student/code-entry"
					className="transition-transform hover:scale-105"
				>
					<Card className="w-80 h-48 flex flex-col items-center justify-center p-4 hover:shadow-lg transition-shadow">
						<CardHeader className="pb-2">
							<CardTitle className="text-center">Ich bin Schüler*in</CardTitle>
						</CardHeader>
						<CardContent>
							<CardDescription className="text-center">
								Als Schüler*in an Tests teilnehmen.
							</CardDescription>
						</CardContent>
					</Card>
				</Link>
			</div>
		</div>
	);
};

export default LandingPage;
