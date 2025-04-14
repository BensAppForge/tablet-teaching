"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface AuthRedirectProps {
	children: React.ReactNode;
	redirectTo?: string;
}

export const AuthRedirect: React.FC<AuthRedirectProps> = ({
	children,
	redirectTo = "/teacher/dashboard",
}) => {
	const { currentUser, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && currentUser) {
			router.push(redirectTo);
		}
	}, [currentUser, loading, redirectTo, router]);

	// If still loading, show nothing or a spinner
	if (loading) {
		return (
			<div className="flex justify-center items-center h-screen">Laden...</div>
		);
	}

	// If authenticated after loading completes, don't render children (will be redirected)
	if (currentUser) {
		return null;
	}

	// If not authenticated, render children
	return <>{children}</>;
};

export default AuthRedirect;
