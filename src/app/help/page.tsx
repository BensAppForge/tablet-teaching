import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Hilfe & Anleitungen - Tablet Teaching",
};

import HelpClient from "@/components/HelpClient";

export default function HelpPage() {
	return <HelpClient />;
}
