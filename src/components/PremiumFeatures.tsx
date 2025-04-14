"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import {
	BadgeCheck,
	Calendar,
	LockKeyhole,
	CheckCircle2,
	XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface PremiumFeatureProps {
	title: string;
	description: string;
	restriction: string;
}

const PremiumFeature: React.FC<PremiumFeatureProps> = ({
	title,
	description,
	restriction,
}) => {
	const { isPremiumActive } = useAuth();

	return (
		<div className="flex items-start space-x-3 p-3 rounded-md border">
			<div className="mt-0.5">
				<CheckCircle2 className="h-5 w-5 text-green-500" />
			</div>
			<div className="space-y-1 w-full">
				<h3 className="text-base font-medium flex items-center">
					{title}
					{restriction && (
						<BadgeCheck className="h-4 w-4 ml-1.5 text-yellow-500" />
					)}
				</h3>
				<p className="text-sm text-muted-foreground">{description}</p>

				{restriction && (
					<div className="mt-2 flex justify-between items-center">
						<span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
							<LockKeyhole className="h-3 w-3" />
							{!isPremiumActive ? restriction : "Unbegrenzt mit Premium"}
						</span>
						{!isPremiumActive && (
							<span className="text-xs bg-yellow-100 dark:bg-yellow-900/40 px-2 py-0.5 rounded text-yellow-700 dark:text-yellow-300">
								Premium-Upgrade
							</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

const PremiumFeatures: React.FC = () => {
	const { teacherData, isPremiumActive } = useAuth();

	// Format expiration date if it exists
	const formattedExpirationDate = teacherData?.premiumExpiresOn
		? format(teacherData.premiumExpiresOn.toDate(), "dd. MMMM yyyy", {
				locale: de,
		  })
		: undefined;

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle className="flex items-center">
					Premium-Funktionen
					<BadgeCheck className="h-5 w-5 ml-2 text-yellow-500" />
				</CardTitle>
				<CardDescription>
					Erweiterte Funktionen für Ihre Unterrichtsgestaltung
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Premium status */}
				<div className="bg-muted/50 p-3 rounded-md">
					<div className="flex items-center justify-between">
						<div className="flex items-center">
							<strong className="text-sm mr-2">Status:</strong>
							{isPremiumActive ? (
								<span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
									<CheckCircle2 className="h-4 w-4" />
									Aktiv
								</span>
							) : (
								<span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
									<XCircle className="h-4 w-4" />
									Basis
								</span>
							)}
						</div>

						{teacherData?.isBetaTester && (
							<div className="bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded text-xs">
								Beta-Tester
							</div>
						)}
					</div>

					{isPremiumActive && teacherData?.premiumExpiresOn && (
						<div className="flex items-center text-xs text-muted-foreground mt-2">
							<Calendar className="h-3 w-3 mr-1" />
							<span>Läuft ab am {formattedExpirationDate}</span>
						</div>
					)}
				</div>

				<Separator />

				{/* Feature list */}
				<div className="space-y-3">
					<PremiumFeature
						title="Tests erstellen"
						description="Erstellen Sie Tests für Ihre Klassen"
						restriction="Maximal 3 Tests"
					/>

					<PremiumFeature
						title="KI-Testgenerierung"
						description="Lassen Sie Tests automatisch von der KI erstellen"
						restriction="1 KI-Test pro Monat"
					/>

					<PremiumFeature
						title="Export als PDF"
						description="Exportieren Sie Tests als PDF-Dateien"
						restriction="Wasserzeichen bei Basis-Nutzern"
					/>

					<PremiumFeature
						title="Statistiken"
						description="Auswertungen der Testergebnisse"
						restriction="Erweiterte Statistiken nur mit Premium"
					/>
				</div>
			</CardContent>
			<CardFooter>
				{!isPremiumActive && (
					<Button className="w-full">Premium aktivieren</Button>
				)}
				{isPremiumActive && !teacherData?.isBetaTester && (
					<Button variant="outline" className="w-full">
						Premium verlängern
					</Button>
				)}
			</CardFooter>
		</Card>
	);
};

export default PremiumFeatures;
