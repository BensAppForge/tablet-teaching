"use client";

import React from "react";
import StudentRequired from "@/components/StudentRequired";
import StudentWorksheet from "@/components/StudentWorksheet";

const StudentWorksheetClient: React.FC = () => {
	return (
		<StudentRequired allowAnonymous>
			<StudentWorksheet />
		</StudentRequired>
	);
};

export default StudentWorksheetClient;
