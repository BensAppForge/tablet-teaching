import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Arbeitsblatt - Tablet Teaching",
};

import StudentWorksheetClient from "@/components/StudentWorksheetClient";

export default function StudentWorksheetPage() {
	return <StudentWorksheetClient />;
}
