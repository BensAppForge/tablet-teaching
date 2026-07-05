import type { Metadata } from "next";
import SettingsClient from "./settings-client";

export const metadata: Metadata = {
	title: "Einstellungen - Tablet Teaching",
};

export default function SettingsPage() {
	return <SettingsClient />;
}
