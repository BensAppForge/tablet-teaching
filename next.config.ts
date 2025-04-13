import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	typescript: {
		ignoreBuildErrors: true,
	},
	eslint: {
		ignoreDuringBuilds: true,
	},
	output: "export",
	images: {
		unoptimized: true,
	},
	// Future experimental features can be added here if needed
};

export default nextConfig;
