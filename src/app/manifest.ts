import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Tablet Teaching",
		short_name: "Teaching",
		description: "Digitale Arbeitsblatter und Tests fur den Sprachunterricht.",
		start_url: "/",
		scope: "/",
		display: "standalone",
		background_color: "#ffffff",
		theme_color: "#e97822",
		orientation: "any",
		categories: ["education", "productivity"],
		lang: "de",
		icons: [
			{
				src: "/app-icon.svg",
				sizes: "any",
				type: "image/svg+xml",
				purpose: "maskable",
			},
		],
	};
}
