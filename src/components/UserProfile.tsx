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
	const { currentUser, role, teacherData, studentData, isPremiumActive } =
		useAuth();

	if (!currentUser) {
		return null;
	}

	let displayName: string;
	if (role === "student" && studentData) {
		displayName = `${studentData.firstName} ${studentData.lastInitial}`;
	} else if (teacherData) {
		displayName = `${teacherData.firstName} ${teacherData.lastName}`;
	} else {
		displayName =
			currentUser.displayName ||
			currentUser.email?.split("@")[0] ||
			"Unbekannter Benutzer";
	}

	const showPremiumBadge = role !== "student" && isPremiumActive;

	return (
		<div className="flex items-center text-sm">
			<div className="flex items-center gap-1">
				<User className="h-4 w-4 mr-1" />
				<span>{displayName}</span>

				{showPremiumBadge && (
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
