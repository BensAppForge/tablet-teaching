"use client";

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth, firestore } from "@/lib/firebase/config"; // Adjust path if your firebase config is elsewhere
import { useRouter } from "next/navigation"; // To redirect after logout
import { doc, getDoc } from "firebase/firestore";
import { FEATURE_LIMITS } from "@/lib/firebase/teachers";

// Define teacher data interface
interface TeacherData {
	firstName: string;
	lastName: string;
	email: string;
	createdAt: any; // using 'any' for timestamp, could be more specific with Firebase types
	isPremium: boolean;
	isBetaTester: boolean;
	premiumExpiresOn?: any; // Optional timestamp
}

// Student data shape (mirrors the students/{uid} Firestore doc written
// by the bulkImportStudents callable).
interface StudentData {
	firstName: string;
	lastInitial: string;
	teacherId: string;
	classId: string;
	synthEmail: string;
	active: boolean;
	createdAt?: any;
}

export type Role = "teacher" | "student";

// Interface for feature restrictions
interface FeatureRestrictions {
	maxTests: number;
	maxAITestsPerMonth: number;
	hasWatermark: boolean;
	hasAdvancedStatistics: boolean;
}

// Define the shape of the context data we want to expose
interface AuthContextType {
	currentUser: User | null; // The Firebase User object or null if not logged in
	role: Role | null; // 'student' if the user's custom claim says so, else 'teacher'
	teacherData: TeacherData | null; // The teacher's Firestore data or null if not available
	studentData: StudentData | null; // The student's Firestore data or null if not available
	loading: boolean; // Flag to indicate if the auth state is still being determined
	logout: () => Promise<void>; // Function to handle user logout
	isPremiumActive: boolean; // Computed property to check if premium is active
	featureRestrictions: FeatureRestrictions; // Current feature restrictions based on premium status
}

// Create the context. Using 'null!' avoids needing complex default values,
// as the Provider will always supply a valid object.
const AuthContext = createContext<AuthContextType>(null!);

// Custom Hook: Simplifies accessing the context data in components
export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		// This error is helpful during development if you forget to wrap with AuthProvider
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};

// Define the props for the AuthProvider component
interface AuthProviderProps {
	children: ReactNode; // Allows this component to wrap other components
}

// AuthProvider Component: Manages and provides the authentication state
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [role, setRole] = useState<Role | null>(null);
	const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
	const [studentData, setStudentData] = useState<StudentData | null>(null);
	const [loading, setLoading] = useState(true); // Start loading until we know the auth state
	const router = useRouter();

	// Computed property to check if premium is active
	const isPremiumActive = React.useMemo(() => {
		if (!teacherData) return false;

		// Beta testers always have access
		if (teacherData.isBetaTester) return true;

		// Check premium status and expiration
		if (teacherData.isPremium) {
			// If there's no expiration date, premium is always active
			if (!teacherData.premiumExpiresOn) return true;

			// Check if premium hasn't expired yet
			const now = new Date();
			const expiresOn = teacherData.premiumExpiresOn?.toDate?.() || null;
			return expiresOn ? now < expiresOn : false;
		}

		return false;
	}, [teacherData]);

	// Computed property for feature restrictions based on premium status
	const featureRestrictions = React.useMemo((): FeatureRestrictions => {
		// If premium is active, no restrictions
		if (isPremiumActive) {
			return {
				maxTests: Infinity,
				maxAITestsPerMonth: Infinity,
				hasWatermark: false,
				hasAdvancedStatistics: true,
			};
		}

		// Otherwise, apply basic account restrictions
		return {
			maxTests: FEATURE_LIMITS.MAX_TESTS_BASIC,
			maxAITestsPerMonth: FEATURE_LIMITS.MAX_AI_TESTS_PER_MONTH_BASIC,
			hasWatermark: FEATURE_LIMITS.HAS_WATERMARK_BASIC,
			hasAdvancedStatistics: !FEATURE_LIMITS.BASIC_STATISTICS_ONLY,
		};
	}, [isPremiumActive]);

	useEffect(() => {
		// onAuthStateChanged fires immediately with the current state and
		// again whenever auth changes. We branch on the `role` custom claim
		// (set by bulkImportStudents for students) to fetch the right doc.
		// Existing teacher accounts have no role claim — default to teacher.
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			setCurrentUser(user);

			if (!user) {
				setRole(null);
				setTeacherData(null);
				setStudentData(null);
				setLoading(false);
				return;
			}

			try {
				const tokenResult = await user.getIdTokenResult();
				const detectedRole: Role =
					tokenResult.claims.role === "student" ? "student" : "teacher";
				setRole(detectedRole);

				if (detectedRole === "student") {
					const snap = await getDoc(doc(firestore, "students", user.uid));
					setStudentData(
						snap.exists() ? (snap.data() as StudentData) : null
					);
					setTeacherData(null);
				} else {
					const snap = await getDoc(doc(firestore, "teachers", user.uid));
					setTeacherData(
						snap.exists() ? (snap.data() as TeacherData) : null
					);
					setStudentData(null);
				}
			} catch (err) {
				console.error("Error resolving auth role / data:", err);
				setRole(null);
				setTeacherData(null);
				setStudentData(null);
			}

			setLoading(false);
		});

		return () => unsubscribe();
	}, []);

	// Logout Function: Signs the user out using Firebase Auth
	const logout = async () => {
		setLoading(true); // Optional: Show loading state during logout process
		try {
			await signOut(auth);
			setCurrentUser(null); // Explicitly set user to null
			setRole(null);
			setTeacherData(null);
			setStudentData(null);
			// Redirect to the home page after successful logout
			router.push("/");
		} catch (error) {
			console.error("Error signing out: ", error);
			// Handle potential logout errors (e.g., network issues)
			// You might want to show an error message to the user here.
			setLoading(false); // Ensure loading is false even if there's an error
		}
		// No finally block needed for setLoading(false) here, as redirect might unmount
		// If redirect doesn't happen or fails, state is handled in try/catch.
	};

	// The value object that will be provided to consuming components
	const value: AuthContextType = {
		currentUser,
		role,
		teacherData,
		studentData,
		loading,
		logout,
		isPremiumActive,
		featureRestrictions,
	};

	// Wrap the children components with the Context Provider.
	// Any component within this provider can now access the 'value' object via the useAuth hook.
	// We render children immediately; components consuming the context should handle the loading state.
	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
