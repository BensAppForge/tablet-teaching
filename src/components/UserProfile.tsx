"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { User, BadgeCheck } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export const UserProfile: React.FC = () => {
	const { currentUser, teacherData, isPremiumActive } = useAuth();

	if (!currentUser) {
		return null;
	}

	// Get display name using teacherData if available
	const displayName = teacherData
		? `${teacherData.firstName} ${teacherData.lastName}`
		: currentUser.displayName ||
		  currentUser.email?.split("@")[0] ||
		  "Unbekannter Benutzer";

	return (
		<div className="flex items-center text-sm">
			<div className="flex items-center gap-1">
				<User className="h-4 w-4 mr-1" />
				<span>{displayName}</span>

				{isPremiumActive && (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<BadgeCheck className="h-4 w-4 ml-1 text-yellow-500" />
							</TooltipTrigger>
							<TooltipContent>
								<p>Premium-Nutzer</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}
			</div>
		</div>
	);
};

export default UserProfile;
