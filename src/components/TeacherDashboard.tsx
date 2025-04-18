"use client";

import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
	Eye,
	Wand2,
	Settings,
	HelpCircle,
	Share2,
	Plus,
	ClipboardList,
	ShieldCheck,
	BadgeCheck,
} from "lucide-react";
import {
	Tooltip,
	TooltipTrigger,
	TooltipContent,
	TooltipProvider,
} from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useFooterInfo } from "@/context/FooterInfoContext";

// Define a color palette for the dashboard tiles
const tileColors = [
	"bg-orange-100 dark:bg-orange-900/40 border-orange-200 dark:border-orange-800",
	"bg-green-100 dark:bg-green-900/40 border-green-200 dark:border-green-800",
	"bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800",
	"bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800",
	"bg-purple-100 dark:bg-purple-900/40 border-purple-200 dark:border-purple-800",
	"bg-yellow-100 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-800",
];

// Icon background colors based on the same palette but more subtle
const iconBgColors = [
	"bg-orange-200 dark:bg-orange-800",
	"bg-green-200 dark:bg-green-800",
	"bg-blue-200 dark:bg-blue-800",
	"bg-red-200 dark:bg-red-800",
	"bg-purple-200 dark:bg-purple-800",
	"bg-yellow-200 dark:bg-yellow-800",
];

// Interface for the DashboardTile component props
interface DashboardTileProps {
	title: string;
	description: string;
	icon: React.ReactNode;
	href: string;
	colorIndex: number; // Index to select a color from the tileColors array
}

// DashboardTile component with colorIndex prop
const DashboardTile: React.FC<DashboardTileProps> = ({
	title,
	description,
	icon,
	href,
	colorIndex,
}) => {
	const tileColor = tileColors[colorIndex % tileColors.length]; // Cycle through colors
	const iconBgColor = iconBgColors[colorIndex % iconBgColors.length]; // Matching icon background
	const { updateFooterInfo } = useFooterInfo();

	return (
		<Link
			href={href}
			className="block transition-transform hover:scale-105"
			onMouseEnter={() => updateFooterInfo(description)}
			onMouseLeave={() => updateFooterInfo(null)}
			onFocus={() => updateFooterInfo(description)}
			onBlur={() => updateFooterInfo(null)}
		>
			<Card
				className={cn(
					"aspect-square flex flex-col items-center p-4 hover:shadow-lg transition-all duration-200 rounded-xl border",
					tileColor
				)}
			>
				<CardContent className="flex-1 flex flex-col items-center justify-center gap-4 w-full p-0 pt-4">
					{/* Icon with a subtle background circle */}
					<div
						className={cn(
							"p-4 rounded-full flex items-center justify-center",
							iconBgColor
						)}
					>
						{React.cloneElement(icon as React.ReactElement, {
							className: "h-16 w-16 text-foreground/80",
						})}
					</div>

					{/* Title - now displayed with softer color */}
					<h3 className="text-xl font-medium text-center text-gray-700 dark:text-gray-200">
						{title}
					</h3>
				</CardContent>

				{/* Description - only displayed on mobile */}
				<CardFooter className="text-center p-1 pb-2 w-full md:hidden">
					<p className="text-sm text-gray-500 dark:text-gray-400 w-full">
						{description}
					</p>
				</CardFooter>
			</Card>
		</Link>
	);
};

const TeacherDashboard: React.FC = () => {
	const router = useRouter();

	return (
		<div className="w-full">
			{/* Title at the top of the page with no extra spacing */}
			<div className="border-b">
				<div className="container mx-auto px-4">
					<h1 className="text-2xl font-semibold py-2 text-gray-700 dark:text-gray-200">
						Dashboard
					</h1>
				</div>
			</div>

			{/* Card grid with correct spacing */}
			<div className="container mx-auto px-4 py-4">
				<TooltipProvider>
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
						{/* Meine Tests */}
						<DashboardTile
  title="Tests"
  description="Vorhandene Tests anzeigen, bearbeiten oder neuen Test anlegen"
  icon={<ClipboardList />}
  href="/tests"
  colorIndex={0}
/>


						{/* Neuen Test */}
						

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
				</TooltipProvider>
			</div>
		</div>
	);
};

export default TeacherDashboard;
