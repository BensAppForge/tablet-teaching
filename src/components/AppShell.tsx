"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BookOpen, GraduationCap, LogOut, Loader2 } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useFooterInfo } from "@/context/FooterInfoContext";
import { Button } from "@/components/ui/button";
import FooterAuthButton from "@/components/FooterAuthButton";
import FooterInfo from "@/components/FooterInfo";
import { ModeToggle } from "@/components/ModeToggle";
import UserProfile from "@/components/UserProfile";
import InstallPrompt from "@/components/InstallPrompt";
import { APP_VERSION } from "@/lib/version";
import { cn } from "@/lib/utils";

interface AppShellProps {
	children: React.ReactNode;
}

function isFocusRoute(pathname: string): boolean {
	return pathname.startsWith("/student/worksheet");
}

function isStudentRoute(pathname: string): boolean {
	return pathname.startsWith("/student");
}

function FocusHeader() {
	const { currentUser, loading, logout, role, studentData, anonAttempt } = useAuth();
	const displayName =
		role === "student" && studentData
			? `${studentData.firstName} ${studentData.lastInitial}`
			: role === "anonymous"
				? anonAttempt?.displayName
				: null;

	return (
		<header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
			<div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 py-2 ipad-safe-x">
				<div className="flex min-w-0 items-center gap-2">
					<BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
					<div className="min-w-0">
						<p className="truncate text-sm font-semibold">Arbeitsblatt</p>
						{displayName && (
							<p className="truncate text-xs text-muted-foreground">
								{displayName}
							</p>
						)}
					</div>
				</div>
				{currentUser && (
					<Button
						variant="ghost"
						size="sm"
						onClick={logout}
						disabled={loading}
						className="shrink-0"
					>
						{loading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<LogOut className="h-4 w-4" />
						)}
						<span className="hidden sm:inline">Abmelden</span>
					</Button>
				)}
			</div>
		</header>
	);
}

function DefaultHeader() {
	return (
		<header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
			<div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4 py-2 ipad-safe-x">
				<Link
					href="/"
					className="flex min-w-0 items-center gap-2 font-semibold tracking-wide transition-opacity hover:opacity-80"
					aria-label="Zur Startseite"
				>
					<GraduationCap className="h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
					<span className="truncate">TABLET TEACHING</span>
				</Link>
				<div className="flex min-w-0 items-center gap-2 sm:gap-3">
					<div className="hidden min-w-0 sm:block">
						<UserProfile />
					</div>
					<ModeToggle />
				</div>
			</div>
		</header>
	);
}

function StudentFooter() {
	const { footerInfo } = useFooterInfo();

	if (!footerInfo) {
		// No info banner — still surface the version subtly so a kid can
		// read it off the screen if asked.
		return (
			<div className="fixed bottom-0 right-0 z-40 px-2 py-1 text-[10px] text-muted-foreground/70 ipad-safe-bottom ipad-safe-x">
				v{APP_VERSION}
			</div>
		);
	}

	return (
		<div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 px-4 py-2 text-center text-sm text-muted-foreground shadow-sm backdrop-blur ipad-safe-bottom ipad-safe-x">
			<span>{footerInfo}</span>
			<span className="ml-2 text-[10px] opacity-70">
				v{APP_VERSION}
			</span>
		</div>
	);
}

function DefaultFooter() {
	return (
		<footer className="sticky bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
			<div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4 py-2 ipad-safe-x ipad-safe-bottom">
				<div className="text-sm text-muted-foreground">
					&copy; {new Date().getFullYear()} Bensappforge
					<span className="ml-2 text-xs opacity-70">
						v{APP_VERSION}
					</span>
					<span className="ml-3 text-xs">
						<Link
							href="/impressum"
							className="hover:text-foreground underline-offset-4 hover:underline"
						>
							Impressum
						</Link>
						<span className="mx-1.5 opacity-50">·</span>
						<Link
							href="/datenschutz"
							className="hover:text-foreground underline-offset-4 hover:underline"
						>
							Datenschutz
						</Link>
						<span className="mx-1.5 opacity-50">·</span>
						<Link
							href="/agb"
							className="hover:text-foreground underline-offset-4 hover:underline"
						>
							AGB
						</Link>
					</span>
				</div>
				<div className="hidden min-w-0 flex-1 justify-center md:flex">
					<FooterInfo />
				</div>
				<FooterAuthButton />
			</div>
		</footer>
	);
}

export default function AppShell({ children }: AppShellProps) {
	const pathname = usePathname() ?? "/";
	const focusRoute = isFocusRoute(pathname);
	const studentRoute = isStudentRoute(pathname);

	return (
		<div
			className={cn(
				"flex min-h-dvh flex-col",
				focusRoute && "bg-muted/20",
				studentRoute && !focusRoute && "bg-background"
			)}
		>
			{focusRoute ? <FocusHeader /> : <DefaultHeader />}
			{/* Install hint only outside the student focus flow (no banner
			    while a kid is taking a test). */}
			{!focusRoute && <InstallPrompt />}
			<main className={cn("flex flex-1 flex-col", focusRoute && "pb-6")}>
				{children}
			</main>
			{focusRoute ? <StudentFooter /> : <DefaultFooter />}
		</div>
	);
}
