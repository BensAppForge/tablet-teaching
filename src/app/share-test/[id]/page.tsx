import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Test teilen - Tablet Teaching",
};

import ShareTestClient from "@/components/ShareTestClient";

const ShareTestPage = ({ params }: { params: { id: string } }) => {
	return <ShareTestClient testId={params.id} />;
};

export default ShareTestPage;
