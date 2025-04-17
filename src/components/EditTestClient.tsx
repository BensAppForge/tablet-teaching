"use client";

import React from "react";
import AuthRequired from "@/components/AuthRequired";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface EditTestClientProps {
	testId: string;
}

const EditTestClient: React.FC<EditTestClientProps> = ({ testId }) => {
	const router = useRouter();

	return (
		<AuthRequired>
			<div className="container mx-auto px-4 py-6">
				<div className="border-b mb-6">
					<h1 className="text-2xl font-semibold py-2 text-gray-700 dark:text-gray-200">
						Test bearbeiten
					</h1>
				</div>

				<div className="bg-muted rounded-md p-8 text-center">
					<p className="text-lg mb-4">
						Diese Funktion wird in Kürze implementiert.
					</p>
					<p className="text-muted-foreground mb-8">Test ID: {testId}</p>
					<Button
						variant="outline"
						onClick={() => router.push("/tests")}
						className="flex items-center gap-2"
					>
						<ArrowLeft className="h-4 w-4" />
						Zurück zur Testübersicht
					</Button>
				</div>
			</div>
		</AuthRequired>
	);
};

export default EditTestClient;
