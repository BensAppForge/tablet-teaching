"use client";

import React from "react";
import AuthRequired from "@/components/AuthRequired";
import CreateTestAi from "@/components/CreateTestAi";

const CreateTestAiClient: React.FC = () => {
	return (
		<AuthRequired>
			<CreateTestAi />
		</AuthRequired>
	);
};

export default CreateTestAiClient;
