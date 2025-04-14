// Optional: Add metadata for the page title
import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Lehrer Dashboard - Tablet Teaching", // German Title
};

import TeacherDashboardClient from "../../../components/TeacherDashboardClient";

const TeacherDashboardPage = () => {
	// This page simply renders the TeacherDashboard component wrapped in AuthRequired
	return <TeacherDashboardClient />;
};

export default TeacherDashboardPage;
