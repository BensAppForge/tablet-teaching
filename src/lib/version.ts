// Build-time version string, baked in via next.config.ts (reads
// package.json). Used to display the current version in the UI and
// to compare against /version.json for the update-available check.
//
// Falls back to "dev" if the env var is missing (e.g. running tooling
// outside the Next.js bundle).
export const APP_VERSION =
	process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
