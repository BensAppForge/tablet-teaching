"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface StudentRequiredProps {
	children: React.ReactNode;
	// Set to true to also allow anonymous Schnellzugang students (used
	// by /student/worksheet, which is reachable from both flows).
	allowAnonymous?: boolean;
}

/**
 * Gate for student-only routes. Sends unauthenticated visitors to the
 * appropriate login page, and accidentally-authenticated teachers to the
 * teacher dashboard so they don't see the student UI.
 *
 * When `allowAnonymous` is true, Schnellzugang kids pass through; their
 * anonAttempt is available via useAuth().
 */
export const StudentRequired: React.FC<StudentRequiredProps> = ({
	children,
	allowAnonymous = false,
}) => {
	const { currentUser, role, anonAttempt, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (loading) return;
		if (!currentUser) {
			router.push("/student/login");
			return;
		}
		if (role === "teacher") {
			router.push("/teacher/dashboard");
			return;
		}
		if (role === "anonymous") {
			if (!allowAnonymous) {
				// Anon user hit a student-managed page — send them back to
				// their worksheet (or the quick-login page if no attempt).
				if (anonAttempt?.testId) {
					router.push(`/student/worksheet?id=${anonAttempt.testId}`);
				} else {
					router.push("/student/quick");
				}
			}
			return;
		}
	}, [currentUser, role, anonAttempt, allowAnonymous, loading, router]);

	if (loading) {
		return (
			<div className="flex justify-center items-center h-screen">Laden…</div>
		);
	}
	if (!currentUser) return null;
	if (role === "student") return <>{children}</>;
	if (role === "anonymous" && allowAnonymous) return <>{children}</>;
	return null;
};

export default StudentRequired;
