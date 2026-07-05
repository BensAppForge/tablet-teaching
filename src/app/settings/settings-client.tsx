"use client";

import SettingsManagement from "@/components/SettingsManagement";
import AuthRequired from "@/components/AuthRequired";

export default function SettingsClient() {
	return (
		<AuthRequired>
			<SettingsManagement />
		</AuthRequired>
	);
}
