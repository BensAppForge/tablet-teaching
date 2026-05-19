import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Test teilen - Tablet Teaching",
};

import ShareTestClient from "@/components/ShareTestClient";

export default function ShareTestPage() {
	return <ShareTestClient />;
}
