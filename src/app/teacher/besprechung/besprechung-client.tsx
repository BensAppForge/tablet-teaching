"use client";

import React from "react";
import AuthRequired from "@/components/AuthRequired";
import BesprechungView from "@/components/BesprechungView";

const BesprechungClient: React.FC = () => {
	return (
		<AuthRequired>
			<BesprechungView />
		</AuthRequired>
	);
};

export default BesprechungClient;
