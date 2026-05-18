import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Schüler:innen-Anmeldung - Tablet Teaching",
};

import StudentLoginClient from "@/components/StudentLoginClient";

export default function StudentLoginPage() {
	return <StudentLoginClient />;
}
