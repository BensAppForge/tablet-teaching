import {
	doc,
	updateDoc,
	getDoc,
	Timestamp,
	collection,
	query,
	where,
	getDocs,
	orderBy,
	limit,
} from "firebase/firestore";
import { firestore } from "./config";

// Constants for feature restrictions
export const FEATURE_LIMITS = {
	MAX_TESTS_BASIC: 3,
	MAX_AI_TESTS_PER_MONTH_BASIC: 1,
	HAS_WATERMARK_BASIC: true,
	BASIC_STATISTICS_ONLY: true,
};

/**
 * Checks if a teacher can create a new test
 * @param teacherId - The teacher's auth ID
 * @returns Promise resolving to boolean
 */
export const canCreateTest = async (teacherId: string): Promise<boolean> => {
	try {
		// First check if teacher has premium
		const teacherRef = doc(firestore, "teachers", teacherId);
		const teacherDoc = await getDoc(teacherRef);

		if (!teacherDoc.exists()) {
			console.error("Teacher document not found");
			return false;
		}

		const teacherData = teacherDoc.data();

		// If teacher is premium or beta tester, they can always create tests
		if (teacherData.isPremium || teacherData.isBetaTester) {
			return true;
		}

		// Otherwise, check how many tests they've already created
		const testsRef = collection(firestore, "tests");
		const q = query(testsRef, where("teacherId", "==", teacherId));

		const querySnapshot = await getDocs(q);
		const testCount = querySnapshot.size;

		// Can create if under the limit
		return testCount < FEATURE_LIMITS.MAX_TESTS_BASIC;
	} catch (error) {
		console.error("Error checking if teacher can create test:", error);
		return false;
	}
};

/**
 * Checks if a teacher can create a new AI-generated test this month
 * @param teacherId - The teacher's auth ID
 * @returns Promise resolving to boolean
 */
export const canCreateAITest = async (teacherId: string): Promise<boolean> => {
	try {
		// First check if teacher has premium
		const teacherRef = doc(firestore, "teachers", teacherId);
		const teacherDoc = await getDoc(teacherRef);

		if (!teacherDoc.exists()) {
			console.error("Teacher document not found");
			return false;
		}

		const teacherData = teacherDoc.data();

		// If teacher is premium or beta tester, they can always create AI tests
		if (teacherData.isPremium || teacherData.isBetaTester) {
			return true;
		}

		// Otherwise, check how many AI tests they've created this month
		const now = new Date();
		const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

		const testsRef = collection(firestore, "tests");
		const q = query(
			testsRef,
			where("teacherId", "==", teacherId),
			where("isAIGenerated", "==", true),
			where("createdAt", ">=", firstDayOfMonth),
			where("createdAt", "<=", lastDayOfMonth)
		);

		const querySnapshot = await getDocs(q);
		const aiTestCount = querySnapshot.size;

		// Can create if under the monthly limit
		return aiTestCount < FEATURE_LIMITS.MAX_AI_TESTS_PER_MONTH_BASIC;
	} catch (error) {
		console.error("Error checking if teacher can create AI test:", error);
		return false;
	}
};

/**
 * Checks if PDF exports should have a watermark
 * @param teacherId - The teacher's auth ID
 * @returns Promise resolving to boolean
 */
export const shouldHaveWatermark = async (
	teacherId: string
): Promise<boolean> => {
	try {
		// First check if teacher has premium
		const teacherRef = doc(firestore, "teachers", teacherId);
		const teacherDoc = await getDoc(teacherRef);

		if (!teacherDoc.exists()) {
			console.error("Teacher document not found");
			return true; // Default to having watermark if error
		}

		const teacherData = teacherDoc.data();

		// If teacher is premium or beta tester, no watermark
		return !(teacherData.isPremium || teacherData.isBetaTester);
	} catch (error) {
		console.error("Error checking watermark status:", error);
		return true; // Default to having watermark if error
	}
};

/**
 * Updates a teacher's premium status
 * @param teacherId - The teacher's auth ID
 * @param isPremium - Whether the teacher should have premium status
 * @param expirationDate - Optional date when premium expires (undefined means no expiration)
 * @returns Promise resolving to success boolean
 */
export const updateTeacherPremiumStatus = async (
	teacherId: string,
	isPremium: boolean,
	expirationDate?: Date
): Promise<boolean> => {
	try {
		const teacherRef = doc(firestore, "teachers", teacherId);

		// First check if the teacher exists
		const teacherDoc = await getDoc(teacherRef);
		if (!teacherDoc.exists()) {
			console.error("Teacher document not found");
			return false;
		}

		// Prepare update data
		const updateData: any = {
			isPremium,
		};

		// Add or remove expiration date
		if (isPremium && expirationDate) {
			updateData.premiumExpiresOn = Timestamp.fromDate(expirationDate);
		} else if (!isPremium) {
			// If setting to non-premium, remove expiration
			updateData.premiumExpiresOn = null;
		}

		// Update the document
		await updateDoc(teacherRef, updateData);
		return true;
	} catch (error) {
		console.error("Error updating premium status:", error);
		return false;
	}
};

/**
 * Sets a teacher's beta tester status
 * @param teacherId - The teacher's auth ID
 * @param isBetaTester - Whether the teacher should be a beta tester
 * @returns Promise resolving to success boolean
 */
export const updateTeacherBetaStatus = async (
	teacherId: string,
	isBetaTester: boolean
): Promise<boolean> => {
	try {
		const teacherRef = doc(firestore, "teachers", teacherId);

		// First check if the teacher exists
		const teacherDoc = await getDoc(teacherRef);
		if (!teacherDoc.exists()) {
			console.error("Teacher document not found");
			return false;
		}

		// Update beta tester status
		await updateDoc(teacherRef, {
			isBetaTester,
		});

		return true;
	} catch (error) {
		console.error("Error updating beta tester status:", error);
		return false;
	}
};
