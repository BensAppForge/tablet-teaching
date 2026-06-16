"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Shared scaffold for every screen reached from the teacher dashboard (and
// the standalone legal pages). It fixes the three things that used to drift
// per page: the back control (always top-left, same style), the page title
// row (border-b separator, optional icon + right-aligned actions) and the
// content container width. New screens should render their body inside this
// instead of re-rolling the header markup.
//
// Back behaviour:
//   - `backHref` given  → navigate there (e.g. "/teacher/dashboard", "/tests").
//   - `backHref` absent → pop history, falling back to "/" (legal pages
//     opened directly from a shared link have no history to pop).

const WIDTHS = {
	full: "",
	"3xl": "max-w-3xl",
	"2xl": "max-w-2xl",
} as const;

export interface PageShellProps {
	title: React.ReactNode;
	/** Optional icon rendered just before the title. */
	icon?: React.ReactNode;
	/** Right-aligned controls in the title row (buttons, menus…). */
	actions?: React.ReactNode;
	/** Explicit back destination; omit for history-back with "/" fallback. */
	backHref?: string;
	/** Back-button label. Defaults to "Zurück". */
	backLabel?: string;
	/** Content max-width. Defaults to the container's responsive width. */
	maxWidth?: keyof typeof WIDTHS;
	className?: string;
	children: React.ReactNode;
}

const PageShell: React.FC<PageShellProps> = ({
	title,
	icon,
	actions,
	backHref,
	backLabel = "Zurück",
	maxWidth = "full",
	className,
	children,
}) => {
	const router = useRouter();

	const handleBack = () => {
		if (backHref) {
			router.push(backHref);
		} else if (typeof window !== "undefined" && window.history.length > 1) {
			router.back();
		} else {
			router.push("/");
		}
	};

	return (
		<div
			className={cn(
				"container mx-auto px-4 py-6",
				WIDTHS[maxWidth],
				className
			)}
		>
			<div className="mb-4 flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					className="gap-1 text-muted-foreground"
					onClick={handleBack}
				>
					<ArrowLeft className="h-4 w-4" />
					<span>{backLabel}</span>
				</Button>
			</div>

			<div className="mb-6 flex items-center justify-between gap-3 border-b">
				<div className="flex min-w-0 items-center gap-2 py-2">
					{icon}
					<h1 className="truncate text-2xl font-semibold text-gray-700 dark:text-gray-200">
						{title}
					</h1>
				</div>
				{actions && (
					<div className="flex shrink-0 items-center gap-2">{actions}</div>
				)}
			</div>

			{children}
		</div>
	);
};

export default PageShell;
