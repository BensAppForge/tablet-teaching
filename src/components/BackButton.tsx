"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Small "Zurück" control for standalone pages (e.g. Impressum,
 * Datenschutz) that are reached from a footer link and otherwise have no
 * way back. Falls back to the home route when there's no history to pop
 * (e.g. the page was opened directly from a shared link).
 */
export default function BackButton() {
	const router = useRouter();
	return (
		<Button
			variant="outline"
			size="sm"
			className="gap-1 text-muted-foreground"
			onClick={() => {
				if (typeof window !== "undefined" && window.history.length > 1) {
					router.back();
				} else {
					router.push("/");
				}
			}}
		>
			<ArrowLeft className="h-4 w-4" />
			<span>Zurück</span>
		</Button>
	);
}
