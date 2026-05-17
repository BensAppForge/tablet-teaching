import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Klasse - Tablet Teaching",
};

import ClassDetailClient from "@/components/ClassDetailClient";

export default function ClassDetailPage() {
	return <ClassDetailClient />;
}
