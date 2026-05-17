"use client";

import React from "react";
import AuthRequired from "@/components/AuthRequired";
import Help from "@/components/Help";

const HelpClient: React.FC = () => {
	return (
		<AuthRequired>
			<Help />
		</AuthRequired>
	);
};

export default HelpClient;
