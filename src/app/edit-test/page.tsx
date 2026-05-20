import type { Metadata } from "next";
import { Suspense } from "react";
export const metadata: Metadata = {
	title: "Test bearbeiten - Tablet Teaching",
};

import EditTestClient from "./edit-test-client";

/**
 * Static page for editing tests
 * Uses query parameters (?id=xyz) instead of dynamic routes (/edit-test/xyz)
 */
export default function EditTestPage() {
	return (
		<Suspense fallback={<div className="p-8 text-center">Laden…</div>}>
			<EditTestClient />
		</Suspense>
	);
}
