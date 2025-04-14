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
	const { currentUser, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && !currentUser) {
			router.push(redirectTo);
		}
	}, [currentUser, loading, redirectTo, router]);

	// If still loading, show nothing or a spinner
	if (loading) {
		return (
			<div className="flex justify-center items-center h-screen">Laden...</div>
		);
	}

	// If not authenticated after loading completes, don't render children
	if (!currentUser) {
		return null;
	}

	// If authenticated, render children
	return <>{children}</>;
};

export default AuthRequired;
