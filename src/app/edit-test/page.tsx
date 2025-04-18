import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Test bearbeiten - Tablet Teaching",
};

import EditTestStaticClient from "@/components/EditTestStaticClient";

/**
 * Static page for editing tests
 * Uses query parameters (?id=xyz) instead of dynamic routes (/edit-test/xyz)
 */
export default function EditTestPage() {
	return <EditTestStaticClient />;
}
