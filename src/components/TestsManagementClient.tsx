"use client";

import React from "react";
import TestsManagement from "@/components/TestsManagement";
import AuthRequired from "@/components/AuthRequired";

const TestsManagementClient: React.FC = () => {
	return (
		<AuthRequired>
			<TestsManagement />
		</AuthRequired>
	);
};

export default TestsManagementClient;
