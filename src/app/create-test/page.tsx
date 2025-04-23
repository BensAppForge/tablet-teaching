import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Test erstellen - Tablet Teaching",
};

import CreateTestClient from "./create-test-client";

export default function CreateTestPage() {
	return <CreateTestClient />;
}
