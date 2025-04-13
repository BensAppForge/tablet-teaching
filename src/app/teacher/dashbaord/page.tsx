import React from "react";
import TeacherDashboard from "@/components/TeacherDashboard"; // Adjust the import path if your component is located elsewhere

// Optional: Add metadata for the page title
import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Lehrer Dashboard - Tablet Teaching", // German Title
};

const TeacherDashboardPage: React.FC = () => {
	// This page simply renders the TeacherDashboard component
	return <TeacherDashboard />;
};

export default TeacherDashboardPage;
