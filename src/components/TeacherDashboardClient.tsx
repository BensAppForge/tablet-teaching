"use client";

import React from "react";
import TeacherDashboard from "@/components/TeacherDashboard";
import AuthRequired from "@/components/AuthRequired";

const TeacherDashboardClient: React.FC = () => {
	return (
		<AuthRequired>
			<TeacherDashboard />
		</AuthRequired>
	);
};

export default TeacherDashboardClient;
