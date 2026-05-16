import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Klassen verwalten - Tablet Teaching",
};

import ClassesClient from "@/components/ClassesClient";

export default function ClassesPage() {
	return <ClassesClient />;
}
