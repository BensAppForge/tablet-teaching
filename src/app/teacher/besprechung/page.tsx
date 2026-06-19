import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "Besprechung - Tablet Teaching",
};

import BesprechungClient from "./besprechung-client";

export default function BesprechungPage() {
	return (
		<Suspense fallback={<div className="p-8 text-center">Laden…</div>}>
			<BesprechungClient />
		</Suspense>
	);
}
