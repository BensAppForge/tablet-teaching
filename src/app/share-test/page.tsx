import type { Metadata } from "next";
import { Suspense } from "react";
export const metadata: Metadata = {
	title: "Test teilen - Tablet Teaching",
};

import ShareTestClient from "@/components/ShareTestClient";

export default function ShareTestPage() {
	return (
		<Suspense fallback={<div className="p-8 text-center">Laden…</div>}>
			<ShareTestClient />
		</Suspense>
	);
}
