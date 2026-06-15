"use client";

import React from "react";
import AuthRequired from "@/components/AuthRequired";
import QuickAccessManagement from "@/components/QuickAccessManagement";

const QuickAccessClient: React.FC = () => {
	return (
		<AuthRequired>
			<QuickAccessManagement />
		</AuthRequired>
	);
};

export default QuickAccessClient;
