"use client";

import React, { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Maximize2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface ShareQrProps {
	// The URL (or text) the QR encodes.
	value: string;
	// Test title; shown under the zoomed code and baked into the PNG export.
	caption?: string;
	// Base name for the downloaded file (".png" is appended).
	downloadFileName?: string;
	// Inline display size in px.
	size?: number;
	// Hide the download button (e.g. when the caller renders its own).
	showDownload?: boolean;
	className?: string;
}

// High-resolution offscreen render used only for the PNG export, so the
// downloaded/printed code stays crisp regardless of the inline size.
const EXPORT_QR_SIZE = 1024;

function slug(s: string): string {
	return (
		s
			.normalize("NFKD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/[^a-zA-Z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.toLowerCase() || "qr-code"
	);
}

/**
 * Reusable QR display: tap to zoom (500 ms, blurred + darkened backdrop)
 * and a one-tap PNG download with the caption baked into the bitmap.
 * Used wherever a shareable code/QR appears.
 */
const ShareQr: React.FC<ShareQrProps> = ({
	value,
	caption,
	downloadFileName,
	size = 160,
	showDownload = true,
	className,
}) => {
	const exportRef = useRef<HTMLCanvasElement>(null);
	const [zoomed, setZoomed] = useState(false);

	const handleDownload = () => {
		const src = exportRef.current;
		if (!src) {
			toast.error("QR-Code konnte nicht erstellt werden");
			return;
		}
		try {
			const qrSize = src.width;
			const pad = Math.round(qrSize * 0.06);
			const fontSize = Math.round(qrSize * 0.05);
			const lineHeight = Math.round(fontSize * 1.3);

			// Word-wrap the caption to at most two lines against the QR width.
			const ctxMeasure = document.createElement("canvas").getContext("2d");
			const lines: string[] = [];
			if (caption && ctxMeasure) {
				ctxMeasure.font = `600 ${fontSize}px sans-serif`;
				const words = caption.trim().split(/\s+/);
				let line = "";
				for (const word of words) {
					const test = line ? `${line} ${word}` : word;
					if (ctxMeasure.measureText(test).width > qrSize && line) {
						lines.push(line);
						line = word;
						if (lines.length === 2) break;
					} else {
						line = test;
					}
				}
				if (lines.length < 2 && line) lines.push(line);
				// Ellipsize a too-long final line.
				if (lines.length === 2) {
					let last = lines[1];
					while (
						ctxMeasure.measureText(`${last}…`).width > qrSize &&
						last.length > 1
					) {
						last = last.slice(0, -1);
					}
					if (last !== lines[1]) lines[1] = `${last}…`;
				}
			}

			const captionBlock =
				lines.length > 0 ? lines.length * lineHeight + pad : 0;
			const out = document.createElement("canvas");
			out.width = qrSize + pad * 2;
			out.height = qrSize + pad * 2 + captionBlock;
			const ctx = out.getContext("2d");
			if (!ctx) throw new Error("no 2d context");

			ctx.fillStyle = "#ffffff";
			ctx.fillRect(0, 0, out.width, out.height);
			ctx.drawImage(src, pad, pad);

			if (lines.length > 0) {
				ctx.fillStyle = "#0f172a";
				ctx.font = `600 ${fontSize}px sans-serif`;
				ctx.textAlign = "center";
				ctx.textBaseline = "top";
				let y = qrSize + pad * 2 - pad / 2;
				for (const l of lines) {
					ctx.fillText(l, out.width / 2, y);
					y += lineHeight;
				}
			}

			const url = out.toDataURL("image/png");
			const a = document.createElement("a");
			a.href = url;
			a.download = `${slug(downloadFileName || caption || "qr-code")}-qr.png`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		} catch (err) {
			console.error(err);
			toast.error("Download fehlgeschlagen");
		}
	};

	return (
		<div className={className}>
			<div className="flex flex-col items-center gap-2">
				<button
					type="button"
					onClick={() => setZoomed(true)}
					className="group relative rounded-md border bg-white p-3 transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
					aria-label="QR-Code vergrößern"
				>
					<QRCodeCanvas value={value} size={size} marginSize={2} />
					<span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
						<Maximize2 className="h-3.5 w-3.5" />
					</span>
				</button>
				{showDownload && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleDownload}
					>
						<Download className="h-4 w-4 mr-2" />
						QR-Code herunterladen
					</Button>
				)}
			</div>

			{/* Hidden high-res canvas used only for the PNG export. */}
			<div aria-hidden className="sr-only pointer-events-none">
				<QRCodeCanvas
					value={value}
					size={EXPORT_QR_SIZE}
					marginSize={4}
					level="M"
					ref={exportRef}
				/>
			</div>

			<AnimatePresence>
				{zoomed && (
					<motion.div
						className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/70 p-6 backdrop-blur-md"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
						onClick={() => setZoomed(false)}
						role="dialog"
						aria-modal="true"
					>
						<motion.div
							className="rounded-2xl bg-white p-6 shadow-2xl"
							initial={{ scale: 0.6, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.6, opacity: 0 }}
							transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
							onClick={(e) => e.stopPropagation()}
						>
							<QRCodeCanvas
								value={value}
								size={512}
								marginSize={2}
								style={{
									width: "min(78vw, 78vh)",
									height: "min(78vw, 78vh)",
								}}
							/>
							{caption && (
								<p className="mt-4 max-w-[78vw] text-center text-lg font-semibold text-slate-900">
									{caption}
								</p>
							)}
						</motion.div>
						<p className="text-sm text-white/80">
							Zum Schließen tippen
						</p>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default ShareQr;
