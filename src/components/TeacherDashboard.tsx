"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
	Eye,
	Settings,
	HelpCircle,
	ClipboardList,
	BadgeCheck,
	Users,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const iconBgColors = [
	"bg-primary/10 text-primary",
	"bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
	"bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
	"bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
	"bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
	"bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
];

// Interface for the DashboardTile component props
interface DashboardTileProps {
	title: string;
	description: string;
	icon: React.ReactNode;
	href: string;
	colorIndex: number;
}

const DashboardTile: React.FC<DashboardTileProps> = ({
	title,
	description,
	icon,
	href,
	colorIndex,
}) => {
	const iconBgColor = iconBgColors[colorIndex % iconBgColors.length];

	return (
		<Link
			href={href}
			className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
		>
			<Card
				className={cn(
					"flex min-h-36 flex-col border bg-card transition-colors group-hover:border-primary/40 group-hover:bg-muted/30"
				)}
			>
				<CardContent className="flex flex-1 flex-col gap-4 p-5">
					<div
						className={cn(
							"flex h-12 w-12 items-center justify-center rounded-md",
							iconBgColor
						)}
					>
						{React.cloneElement(icon as React.ReactElement, {
							className: "h-6 w-6",
						})}
					</div>
					<div className="space-y-1">
						<h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
							{title}
						</h3>
						<p className="text-sm leading-relaxed text-muted-foreground">
							{description}
						</p>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
};

const TeacherDashboard: React.FC = () => {
	return (
		<div className="w-full">
			<div className="border-b">
				<div className="container mx-auto px-4">
					<h1 className="py-3 text-2xl font-semibold text-gray-800 dark:text-gray-100">
						Dashboard
					</h1>
				</div>
			</div>

			<div className="container mx-auto px-4 py-5">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{/* Meine Tests */}
						<DashboardTile
							title="Tests"
							description="Vorhandene Tests anzeigen, bearbeiten oder neuen Test anlegen"
							icon={<ClipboardList />}
							href="/tests"
							colorIndex={0}
						/>

						{/* Klassen */}
						<DashboardTile
							title="Klassen"
							description="Klassen anlegen und Schüler:innen verwalten"
							icon={<Users />}
							href="/classes"
							colorIndex={1}
						/>

						{/* Premium Features */}
						<DashboardTile
							title="Premium-Funktionen"
							description="Premium-Status und erweiterte Funktionen"
							icon={<BadgeCheck />}
							href="/premium-features"
							colorIndex={2}
						/>

						{/* Hilfe */}
						<DashboardTile
							title="Hilfe & Anleitungen"
							description="Tutorials und Hilfestellung"
							icon={<HelpCircle />}
							href="/help"
							colorIndex={3}
						/>

						{/* Einstellungen */}
						<DashboardTile
							title="Einstellungen"
							description="Konto und App-Einstellungen anpassen"
							icon={<Settings />}
							href="/settings"
							colorIndex={4}
						/>

						{/* Impressum */}
						<DashboardTile
							title="Impressum"
							description="Rechtliche Informationen"
							icon={<Eye />}
							href="/impressum"
							colorIndex={5}
						/>

						{/* Datenschutz moved to footer only */}
					</div>
			</div>
		</div>
	);
};

export default TeacherDashboard;
