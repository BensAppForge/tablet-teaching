"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface AuthRequiredProps {
	children: React.ReactNode;
	redirectTo?: string;
}

export const AuthRequired: React.FC<AuthRequiredProps> = ({
	children,
	redirectTo = "/auth/teacher-login",
}) => {
	const { currentUser, role, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (loading) return;
		if (!currentUser) {
			router.push(redirectTo);
			return;
		}
		// A signed-in student should never see teacher pages — bounce
		// them to the appropriate student page.
		if (role === "student") {
			router.push("/student/dashboard");
		}
		if (role === "anonymous") {
			router.push("/student");
		}
	}, [currentUser, role, loading, redirectTo, router]);

	if (loading) {
		return (
			<div className="flex justify-center items-center h-screen">Laden...</div>
		);
	}
	if (!currentUser || role === "student" || role === "anonymous") {
		return null;
	}
	return <>{children}</>;
};

export default AuthRequired;
