import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Read the version straight from package.json so we have a single
// source of truth. NEXT_PUBLIC_APP_VERSION is baked into the client
// bundle at build time and consumed by src/lib/version.ts.
const pkg = JSON.parse(
	readFileSync(resolve(process.cwd(), "package.json"), "utf8")
);

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
	env: {
		NEXT_PUBLIC_APP_VERSION: pkg.version,
	},
};

export default nextConfig;
