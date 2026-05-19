import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Test mit KI erstellen - Tablet Teaching",
};

import CreateTestAiClient from "@/components/CreateTestAiClient";

export default function CreateTestAiPage() {
	return <CreateTestAiClient />;
}
