"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext"; // Adjust path if needed
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Loader2 } from "lucide-react"; // Added Loader2 for loading state
import Link from "next/link";

const FooterAuthButton: React.FC = () => {
	// Consume the authentication context
	const { currentUser, loading, logout } = useAuth();

	// While the auth state is being determined, show a loading indicator
	if (loading) {
		return (
			<Button variant="secondary" disabled>
				<Loader2 className="mr-2 h-4 w-4 animate-spin" />
				Laden... {/* Loading... */}
			</Button>
		);
	}

	// If a user is logged in, display the Logout button
	if (currentUser) {
		return (
			<Button variant="secondary" onClick={logout}>
				<LogOut className="mr-2 h-4 w-4" />
				Abmelden {/* Logout */}
			</Button>
		);
	}

	// If no user is logged in, display the Login button
	// Use `asChild` prop to make the Button component render the Link component
	// This preserves button styling while providing link functionality
	return (
		<Button variant="secondary" asChild>
			<Link href="/auth/teacher-login">
				{" "}
				{/* Link to your teacher login page */}
				<LogIn className="mr-2 h-4 w-4" />
				Anmelden {/* Login */}
			</Link>
		</Button>
	);
};

export default FooterAuthButton;
