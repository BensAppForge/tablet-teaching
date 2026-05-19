import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Schnellzugang - Tablet Teaching",
};

import StudentQuickLoginClient from "@/components/StudentQuickLoginClient";

export default function StudentQuickLoginPage() {
	return <StudentQuickLoginClient />;
}
