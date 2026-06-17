// Unified file export. On installed iOS PWAs (and iOS Safari generally) the
// classic `<a download>` click silently no-ops, so teachers/students tapping
// "PDF/CSV/QR herunterladen" got nothing. Where the platform supports it we
// hand the file to the native share sheet (Save to Files / Photos / AirDrop /
// share); everywhere else we fall back to the anchor download that desktop
// browsers handle fine.
//
// Usage: const ok = await shareOrDownload(blob, "name.pdf");
// Returns true if a share/download was initiated (or the user opened the
// share sheet and cancelled), false only on an unexpected failure.

function triggerAnchorDownload(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	// Revoke on a later tick so the click has time to start everywhere.
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function shouldPreferShare(file: File): boolean {
	if (typeof navigator === "undefined" || typeof window === "undefined")
		return false;
	const nav = navigator as Navigator & {
		canShare?: (data?: ShareData) => boolean;
		standalone?: boolean;
	};
	if (typeof nav.share !== "function" || typeof nav.canShare !== "function")
		return false;
	if (!nav.canShare({ files: [file] })) return false;
	// Only divert to the share sheet where a plain download is unreliable or
	// unusual: an installed PWA, or a touch device (iPad/phone). On desktop,
	// keep the familiar direct download.
	const standalone =
		window.matchMedia?.("(display-mode: standalone)").matches === true ||
		nav.standalone === true;
	const coarsePointer =
		window.matchMedia?.("(pointer: coarse)").matches === true;
	return standalone || coarsePointer;
}

export async function shareOrDownload(
	blob: Blob,
	filename: string
): Promise<boolean> {
	const file = new File([blob], filename, {
		type: blob.type || "application/octet-stream",
	});

	if (shouldPreferShare(file)) {
		try {
			await navigator.share({ files: [file] });
			return true;
		} catch (err) {
			// User dismissed the share sheet — that's a deliberate cancel, not
			// a failure, so don't also force a download behind their back.
			if ((err as Error)?.name === "AbortError") return true;
			// Any other share error (e.g. activation expired during a slow PDF
			// render) → fall through to the anchor download.
		}
	}

	try {
		triggerAnchorDownload(blob, filename);
		return true;
	} catch (err) {
		console.error("shareOrDownload failed", err);
		return false;
	}
}
