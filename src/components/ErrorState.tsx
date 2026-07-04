"use client";

import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
	/** Headline — defaults to a generic load-failure message. */
	title?: string;
	/** Supporting line explaining what to do. */
	message?: string;
	/** When provided, renders a retry button that calls this. */
	onRetry?: () => void;
	retryLabel?: string;
}

/**
 * Shared "something went wrong loading" state with an optional retry button.
 * Use this instead of falling through to a misleading empty/"not found" card
 * when a fetch fails — a transient toast is gone by the time the user reads
 * the screen, so the durable message must live in the layout.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
	title = "Laden fehlgeschlagen",
	message = "Bitte die Internetverbindung prüfen und erneut versuchen.",
	onRetry,
	retryLabel = "Erneut versuchen",
}) => (
	<div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
		<div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
			<AlertTriangle
				className="h-7 w-7 text-muted-foreground"
				aria-hidden="true"
			/>
		</div>
		<div className="space-y-1">
			<p className="text-base font-medium text-foreground">{title}</p>
			<p className="mx-auto max-w-sm text-sm text-muted-foreground">
				{message}
			</p>
		</div>
		{onRetry && (
			<Button variant="outline" onClick={onRetry}>
				<RotateCcw className="mr-2 h-4 w-4" />
				{retryLabel}
			</Button>
		)}
	</div>
);

export default ErrorState;
