"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const StudentRoot: React.FC = () => {
	const { currentUser, role, anonAttempt, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (loading) return;
		if (!currentUser) {
			router.push("/student/quick");
			return;
		}
		if (role === "teacher") {
			router.push("/teacher/dashboard");
			return;
		}
		if (role === "anonymous") {
			router.push(
				anonAttempt?.testId
					? `/student/worksheet?id=${anonAttempt.testId}`
					: "/student/quick"
			);
			return;
		}
		router.push("/student/dashboard");
	}, [currentUser, role, anonAttempt, loading, router]);

	return (
		<div className="flex justify-center items-center h-screen">
			<p>Laden…</p>
		</div>
	);
};

export default StudentRoot;
