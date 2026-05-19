"use client";

import React from "react";
import AuthRequired from "@/components/AuthRequired";
import ShareTestManagement from "@/components/ShareTestManagement";

const ShareTestClient: React.FC = () => {
	return (
		<AuthRequired>
			<ShareTestManagement />
		</AuthRequired>
	);
};

export default ShareTestClient;
