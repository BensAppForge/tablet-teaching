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
	teacherData: TeacherData | null; // The teacher's Firestore data or null if not available
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
	const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
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

	// Fetch teacher data from Firestore
	const fetchTeacherData = async (userId: string) => {
		try {
			const docRef = doc(firestore, "teachers", userId);
			const docSnap = await getDoc(docRef);

			if (docSnap.exists()) {
				setTeacherData(docSnap.data() as TeacherData);
			} else {
				console.log("No teacher document found for this user");
				setTeacherData(null);
			}
		} catch (error) {
			console.error("Error fetching teacher data:", error);
			setTeacherData(null);
		}
	};

	useEffect(() => {
		// onAuthStateChanged returns an unsubscribe function.
		// Firebase handles checking token validity, etc.
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			// This callback fires immediately with the current state,
			// and again whenever the auth state changes (login/logout).
			setCurrentUser(user); // user is null if logged out, or the User object if logged in.

			// If there's a user, fetch their teacher data
			if (user) {
				await fetchTeacherData(user.uid);
			} else {
				setTeacherData(null);
			}

			setLoading(false); // We now know the auth state, so loading is complete.
			console.log(
				"Auth State Changed: ",
				user ? user.email : "No user logged in"
			); // Useful for debugging
		});

		// Cleanup: Unsubscribe from the listener when the component unmounts.
		// This prevents memory leaks.
		return () => unsubscribe();
	}, []); // Empty dependency array ensures this effect runs only once when the provider mounts.

	// Logout Function: Signs the user out using Firebase Auth
	const logout = async () => {
		setLoading(true); // Optional: Show loading state during logout process
		try {
			await signOut(auth);
			setCurrentUser(null); // Explicitly set user to null
			setTeacherData(null); // Clear teacher data
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
		teacherData,
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
