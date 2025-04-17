import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Tests verwalten - Tablet Teaching",
};

import TestsManagementClient from "@/components/TestsManagementClient";

const TestsManagementPage = () => {
	return <TestsManagementClient />;
};

export default TestsManagementPage;
