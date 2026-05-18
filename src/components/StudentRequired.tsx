"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface StudentRequiredProps {
	children: React.ReactNode;
}

/**
 * Gate for student-only routes. Sends unauthenticated visitors to the
 * student login, and accidentally-authenticated teachers to the teacher
 * dashboard so they don't see the student UI.
 */
export const StudentRequired: React.FC<StudentRequiredProps> = ({
	children,
}) => {
	const { currentUser, role, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (loading) return;
		if (!currentUser) {
			router.push("/student/login");
			return;
		}
		if (role && role !== "student") {
			router.push("/teacher/dashboard");
		}
	}, [currentUser, role, loading, router]);

	if (loading) {
		return (
			<div className="flex justify-center items-center h-screen">Laden…</div>
		);
	}
	if (!currentUser || role !== "student") return null;
	return <>{children}</>;
};

export default StudentRequired;
