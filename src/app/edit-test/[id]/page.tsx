import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Test bearbeiten - Tablet Teaching",
};

import EditTestClient from "@/components/EditTestClient";

const EditTestPage = ({ params }: { params: { id: string } }) => {
	return <EditTestClient testId={params.id} />;
};

export default EditTestPage;
