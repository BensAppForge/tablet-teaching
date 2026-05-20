import type { Metadata } from "next";
import { Suspense } from "react";
export const metadata: Metadata = {
	title: "Klasse - Tablet Teaching",
};

import ClassDetailClient from "@/components/ClassDetailClient";

export default function ClassDetailPage() {
	return (
		<Suspense fallback={<div className="p-8 text-center">Laden…</div>}>
			<ClassDetailClient />
		</Suspense>
	);
}
