#!/usr/bin/env node
// Generates public/version.json and public/sw.js from the version field
// in package.json. Runs as a prebuild/predev hook so the public/ output
// always carries the current version string.
//
// Why both files:
//   - public/version.json is fetched at runtime by VersionGuard to detect
//     deploys (polling every few minutes).
//   - public/sw.js has __APP_VERSION__ substituted so its byte content
//     changes every deploy. Browsers compare SW bytes, install the new
//     one, and we surface that via "Neue Version verfügbar".

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const pkgPath = resolve(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const version = pkg.version;

if (!version || typeof version !== "string") {
	console.error(
		"sync-version: package.json has no 'version' field — aborting"
	);
	process.exit(1);
}

const buildTime = new Date().toISOString();

// version.json — runtime polling target.
const versionJson = {
	version,
	buildTime,
};
writeFileSync(
	resolve(root, "public/version.json"),
	JSON.stringify(versionJson, null, 2) + "\n"
);

// sw.js — derived from sw.template.js with __APP_VERSION__ replaced.
const templatePath = resolve(__dirname, "sw.template.js");
const template = readFileSync(templatePath, "utf8");
const sw = template.replace(/__APP_VERSION__/g, version);
writeFileSync(resolve(root, "public/sw.js"), sw);

console.log(`sync-version: wrote v${version} to public/version.json + sw.js`);
