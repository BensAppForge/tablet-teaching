"use client";

import React from "react";
import AuthRequired from "@/components/AuthRequired";
import ClassesManagement from "@/components/ClassesManagement";

const ClassesClient: React.FC = () => {
	return (
		<AuthRequired>
			<ClassesManagement />
		</AuthRequired>
	);
};

export default ClassesClient;
