import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "Schnellzugang - Tablet Teaching",
};

import QuickAccessClient from "@/components/QuickAccessClient";

export default function QuickAccessPage() {
	return (
		<Suspense fallback={<div className="p-8 text-center">Laden…</div>}>
			<QuickAccessClient />
		</Suspense>
	);
}
