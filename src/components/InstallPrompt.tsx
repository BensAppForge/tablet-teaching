"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Remembered dismissal so we don't nag after the user says no / already
// knows how to install.
const DISMISS_KEY = "tt:install-dismissed";

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Guides users to install the PWA. Two paths:
 *  - Chromium (Android/desktop): captures `beforeinstallprompt` and shows
 *    a real "App installieren" button that triggers the native prompt.
 *  - iOS/iPadOS Safari: no install API exists, so we show a short hint
 *    pointing at the Share → "Zum Home-Bildschirm" flow.
 * Hidden entirely when already installed (standalone) or once dismissed.
 */
export default function InstallPrompt() {
	const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
		null
	);
	const [iosHint, setIosHint] = useState(false);
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const standalone =
			window.matchMedia("(display-mode: standalone)").matches ||
			// iOS Safari exposes its own standalone flag.
			(navigator as unknown as { standalone?: boolean }).standalone === true;
		if (standalone) return;
		try {
			if (localStorage.getItem(DISMISS_KEY) === "1") return;
		} catch {
			// localStorage blocked — fall through and just show the hint.
		}

		const ua = navigator.userAgent;
		const isIOSFamily =
			/iphone|ipad|ipod/i.test(ua) ||
			// iPadOS 13+ reports as "Macintosh"; disambiguate via touch.
			(/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
		// Add-to-Home-Screen only works from Safari on iOS, not Chrome/FF/Edge.
		const isIOSSafari = isIOSFamily && !/crios|fxios|edgios/i.test(ua);

		const onBeforeInstallPrompt = (e: Event) => {
			e.preventDefault();
			setDeferred(e as BeforeInstallPromptEvent);
			setVisible(true);
		};
		window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

		if (isIOSSafari) {
			setIosHint(true);
			setVisible(true);
		}

		return () =>
			window.removeEventListener(
				"beforeinstallprompt",
				onBeforeInstallPrompt
			);
	}, []);

	const dismiss = () => {
		setVisible(false);
		try {
			localStorage.setItem(DISMISS_KEY, "1");
		} catch {
			// ignore
		}
	};

	const install = async () => {
		if (!deferred) return;
		await deferred.prompt();
		await deferred.userChoice.catch(() => undefined);
		setDeferred(null);
		dismiss();
	};

	if (!visible || (!deferred && !iosHint)) return null;

	return (
		<div className="container mx-auto px-4 pt-4">
			<div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
				<Download className="h-5 w-5 shrink-0 text-primary" />
				<div className="min-w-0 flex-1 text-sm">
					<p className="font-medium">Tablet Teaching installieren</p>
					{deferred ? (
						<p className="text-muted-foreground">
							Als App auf dem Gerät – schneller Start, Vollbild.
						</p>
					) : (
						<p className="text-muted-foreground">
							Tippe auf{" "}
							<Share className="inline h-4 w-4 align-text-bottom" /> und
							dann „Zum Home-Bildschirm".
						</p>
					)}
				</div>
				{deferred && (
					<Button size="sm" onClick={install} className="shrink-0">
						Installieren
					</Button>
				)}
				<button
					type="button"
					onClick={dismiss}
					aria-label="Hinweis schließen"
					className="shrink-0 text-muted-foreground hover:text-foreground"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}
