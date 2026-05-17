"use client";

import React from "react";
import AuthRequired from "@/components/AuthRequired";
import ClassDetailManagement from "@/components/ClassDetailManagement";

const ClassDetailClient: React.FC = () => {
	return (
		<AuthRequired>
			<ClassDetailManagement />
		</AuthRequired>
	);
};

export default ClassDetailClient;
