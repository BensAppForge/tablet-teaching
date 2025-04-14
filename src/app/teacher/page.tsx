"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const TeacherPage: React.FC = () => {
	const { currentUser, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading) {
			if (currentUser) {
				// If user is authenticated, redirect to dashboard
				router.push("/teacher/dashboard");
			} else {
				// If user is not authenticated, redirect to login
				router.push("/auth/teacher-login");
			}
		}
	}, [currentUser, loading, router]);

	// Show loading spinner while checking auth state or redirecting
	return (
		<div className="flex justify-center items-center h-screen">
			<p>Laden...</p>
		</div>
	);
};

export default TeacherPage;
