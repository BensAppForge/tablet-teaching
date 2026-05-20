import type { Metadata } from "next";
import { Suspense } from "react";
export const metadata: Metadata = {
	title: "Schnellzugang - Tablet Teaching",
};

import StudentQuickLoginClient from "@/components/StudentQuickLoginClient";

export default function StudentQuickLoginPage() {
	return (
		<Suspense fallback={<div className="p-8 text-center">Laden…</div>}>
			<StudentQuickLoginClient />
		</Suspense>
	);
}
