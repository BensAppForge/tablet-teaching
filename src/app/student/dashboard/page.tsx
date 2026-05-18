import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Mein Bereich - Tablet Teaching",
};

import StudentDashboardClient from "@/components/StudentDashboardClient";

export default function StudentDashboardPage() {
	return <StudentDashboardClient />;
}
