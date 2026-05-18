"use client";

import React from "react";
import StudentRequired from "@/components/StudentRequired";
import StudentDashboard from "@/components/StudentDashboard";

const StudentDashboardClient: React.FC = () => {
	return (
		<StudentRequired>
			<StudentDashboard />
		</StudentRequired>
	);
};

export default StudentDashboardClient;
