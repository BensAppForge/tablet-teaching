import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Rangliste - Tablet Teaching",
};

import LeaderboardClient from "@/components/LeaderboardClient";

const LeaderboardPage = ({ params }: { params: { id: string } }) => {
	return <LeaderboardClient testId={params.id} />;
};

export default LeaderboardPage;
