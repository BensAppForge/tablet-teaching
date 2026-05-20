import type { Metadata } from "next";
import { Suspense } from "react";
export const metadata: Metadata = {
	title: "Arbeitsblatt - Tablet Teaching",
};

import StudentWorksheetClient from "@/components/StudentWorksheetClient";

export default function StudentWorksheetPage() {
	return (
		<Suspense fallback={<div className="p-8 text-center">Laden…</div>}>
			<StudentWorksheetClient />
		</Suspense>
	);
}
