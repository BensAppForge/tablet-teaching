import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Tablet Teaching",
		short_name: "Teaching",
		description:
			"Digitale Arbeitsblätter und Tests für den Sprachunterricht.",
		start_url: "/",
		scope: "/",
		display: "standalone",
		background_color: "#ffffff",
		theme_color: "#e97822",
		// Left unconstrained on purpose: iPads are used both portrait and
		// landscape in class, so we don't lock the installed app's orientation.
		orientation: "any",
		categories: ["education", "productivity"],
		lang: "de",
		icons: [
			// Scalable source for any context.
			{
				src: "/app-icon.svg",
				sizes: "any",
				type: "image/svg+xml",
				purpose: "any",
			},
			// Raster fallbacks for installers/splash that don't accept SVG.
			{
				src: "/icon-192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/icon-512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "any",
			},
			// Padded safe-zone variant for Android adaptive (circle/squircle) masks.
			{
				src: "/icon-maskable-512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
	};
}
