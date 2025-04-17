import {
	doc,
	collection,
	addDoc,
	updateDoc,
	deleteDoc,
	getDoc,
	getDocs,
	query,
	where,
	orderBy,
	Timestamp,
	serverTimestamp,
	writeBatch,
} from "firebase/firestore";
import { firestore } from "./config";
import { canCreateTest } from "./teachers";

// Test types from the specification
export type QuestionType =
	| "multiple-choice"
	| "true-false"
	| "gap-fill"
	| "matching"
	| "reordering-horizontal"
	| "reordering-vertical";

export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

// Base interface for all question types
export interface BaseQuestion {
	id?: string;
	type: QuestionType;
	text: string;
	explanation?: string;
	timeLimit?: number; // in seconds
	points?: number;
	multiplier?: number;
	order?: number; // Explicit ordering for questions
	createdAt?: Timestamp;
}

// Multiple choice question
export interface MultipleChoiceQuestion extends BaseQuestion {
	type: "multiple-choice";
	options: string[];
	correctOption: number;
}

// True/False question
export interface TrueFalseQuestion extends BaseQuestion {
	type: "true-false";
	isTrue: boolean;
}

// Gap fill question
export interface GapFillQuestion extends BaseQuestion {
	type: "gap-fill";
	text: string; // Text with gaps marked as __gap__
	gaps: string[]; // Correct answers
	distractors?: string[]; // Optional wrong answers
}

// Matching question
export interface MatchingQuestion extends BaseQuestion {
	type: "matching";
	leftItems: string[];
	rightItems: string[];
	correctMatches: number[]; // Indices of rightItems matching each leftItem
	distractors?: string[]; // Optional additional incorrect options for right side
}

// Reordering question (horizontal or vertical)
export interface ReorderingQuestion extends BaseQuestion {
	type: "reordering-horizontal" | "reordering-vertical";
	items: string[];
	correctOrder: number[];
	gaps?: number[]; // Optional indices of items that need to be typed by players
	isGap?: boolean[]; // Whether each item is a gap that needs to be filled
}

// Union type for all question types
export type Question =
	| MultipleChoiceQuestion
	| TrueFalseQuestion
	| GapFillQuestion
	| MatchingQuestion
	| ReorderingQuestion;

// Test interface
export interface Test {
	id?: string;
	teacherId: string;
	title: string;
	description?: string;
	targetLanguage: string;
	cefrLevel: CEFRLevel;
	defaultTimePerQuestion: number; // in seconds
	defaultCreditPoints: number;
	defaultMultiplier: number;
	isAIGenerated: boolean;
	createdAt?: Timestamp;
	updatedAt?: Timestamp;
}

/**
 * Creates a new test in Firestore
 * @param test - The test data
 * @param questions - Array of questions for the test
 * @returns Promise with the test ID
 */
export const createTest = async (
	test: Test,
	questions: Question[]
): Promise<string> => {
	try {
		// Check if the user can create a test
		const canCreate = await canCreateTest(test.teacherId);
		if (!canCreate) {
			throw new Error("Test creation limit reached for basic users");
		}

		// Add timestamps
		const testWithTimestamps = {
			...test,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};

		// Add the test document
		const testsRef = collection(firestore, "tests");
		const testDocRef = await addDoc(testsRef, testWithTimestamps);
		const testId = testDocRef.id;

		// Add each question as a document in the questions subcollection
		const questionsRef = collection(firestore, `tests/${testId}/questions`);

		for (let i = 0; i < questions.length; i++) {
			await addDoc(questionsRef, {
				...questions[i],
				order: i, // Set explicit order based on array index
				createdAt: serverTimestamp(),
			});
		}

		return testId;
	} catch (error) {
		console.error("Error creating test:", error);
		throw error;
	}
};

/**
 * Retrieves a test and its questions
 * @param testId - The ID of the test to retrieve
 * @returns Promise with the test and questions
 */
export const getTest = async (
	testId: string
): Promise<{ test: Test; questions: Question[] }> => {
	try {
		// Get the test document
		const testRef = doc(firestore, "tests", testId);
		const testDoc = await getDoc(testRef);

		if (!testDoc.exists()) {
			throw new Error("Test not found");
		}

		const test = { id: testDoc.id, ...testDoc.data() } as Test;

		// Get the questions
		const questionsRef = collection(firestore, `tests/${testId}/questions`);
		// First try to order by explicit order field, fall back to createdAt if needed
		const querySnapshot = await getDocs(
			query(questionsRef, orderBy("order"), orderBy("createdAt"))
		);

		const questions = querySnapshot.docs.map((doc) => {
			return { id: doc.id, ...doc.data() } as Question;
		});

		return { test, questions };
	} catch (error) {
		console.error("Error getting test:", error);
		throw error;
	}
};

/**
 * Gets all tests for a teacher
 * @param teacherId - The teacher's ID
 * @returns Promise with array of tests
 */
export const getTeacherTests = async (teacherId: string): Promise<Test[]> => {
	try {
		const testsRef = collection(firestore, "tests");
		const q = query(
			testsRef,
			where("teacherId", "==", teacherId),
			orderBy("createdAt", "desc")
		);

		const querySnapshot = await getDocs(q);

		return querySnapshot.docs.map((doc) => {
			return { id: doc.id, ...doc.data() } as Test;
		});
	} catch (error) {
		console.error("Error getting teacher tests:", error);
		throw error;
	}
};

/**
 * Updates an existing test
 * @param testId - The ID of the test to update
 * @param test - The updated test data
 * @returns Promise that resolves when the update is complete
 */
export const updateTest = async (
	testId: string,
	test: Partial<Test>
): Promise<void> => {
	try {
		const testRef = doc(firestore, "tests", testId);

		await updateDoc(testRef, {
			...test,
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error updating test:", error);
		throw error;
	}
};

/**
 * Updates a question within a test
 * @param testId - The ID of the test
 * @param questionId - The ID of the question to update
 * @param question - The updated question data
 * @returns Promise that resolves when the update is complete
 */
export const updateQuestion = async (
	testId: string,
	questionId: string,
	question: Partial<Question>
): Promise<void> => {
	try {
		const questionRef = doc(firestore, `tests/${testId}/questions`, questionId);
		await updateDoc(questionRef, question);
	} catch (error) {
		console.error("Error updating question:", error);
		throw error;
	}
};

/**
 * Reorders questions within a test
 * @param testId - The ID of the test
 * @param questionOrder - Array of question IDs in the desired order
 * @returns Promise that resolves when the reordering is complete
 */
export const reorderQuestions = async (
	testId: string,
	questionOrder: string[]
): Promise<void> => {
	try {
		// Get the questions collection reference
		const questionsRef = collection(firestore, `tests/${testId}/questions`);

		// Update each question with its new order
		const batch = writeBatch(firestore);

		questionOrder.forEach((questionId, index) => {
			const questionRef = doc(questionsRef, questionId);
			batch.update(questionRef, { order: index });
		});

		await batch.commit();
	} catch (error) {
		console.error("Error reordering questions:", error);
		throw error;
	}
};

/**
 * Adds a new question to an existing test
 * @param testId - The ID of the test
 * @param question - The question to add
 * @returns Promise with the ID of the added question
 */
export const addQuestionToTest = async (
	testId: string,
	question: Question
): Promise<string> => {
	try {
		// Get the current count of questions to determine the order
		const questionsRef = collection(firestore, `tests/${testId}/questions`);
		const querySnapshot = await getDocs(questionsRef);
		const currentCount = querySnapshot.size;

		// Add the new question with the next order value
		const docRef = await addDoc(questionsRef, {
			...question,
			order: currentCount,
			createdAt: serverTimestamp(),
		});

		// Update the test's updatedAt timestamp
		await updateDoc(doc(firestore, "tests", testId), {
			updatedAt: serverTimestamp(),
		});

		return docRef.id;
	} catch (error) {
		console.error("Error adding question to test:", error);
		throw error;
	}
};

/**
 * Deletes a question from a test
 * @param testId - The ID of the test
 * @param questionId - The ID of the question to delete
 * @returns Promise that resolves when the deletion is complete
 */
export const deleteQuestion = async (
	testId: string,
	questionId: string
): Promise<void> => {
	try {
		// Delete the question document
		const questionRef = doc(firestore, `tests/${testId}/questions`, questionId);
		await deleteDoc(questionRef);

		// Get remaining questions to reorder them
		const questionsRef = collection(firestore, `tests/${testId}/questions`);
		const querySnapshot = await getDocs(query(questionsRef, orderBy("order")));

		// Update order values to be consecutive
		const batch = writeBatch(firestore);
		querySnapshot.docs.forEach((doc, index) => {
			batch.update(doc.ref, { order: index });
		});

		await batch.commit();

		// Update the test's updatedAt timestamp
		await updateDoc(doc(firestore, "tests", testId), {
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error deleting question:", error);
		throw error;
	}
};

/**
 * Deletes a test and all its questions
 * @param testId - The ID of the test to delete
 * @returns Promise that resolves when the deletion is complete
 */
export const deleteTest = async (testId: string): Promise<void> => {
	try {
		// Get all questions in the test
		const questionsRef = collection(firestore, `tests/${testId}/questions`);
		const querySnapshot = await getDocs(questionsRef);

		// Use a batch to delete all questions and the test
		const batch = writeBatch(firestore);

		// Add all question documents to the batch for deletion
		querySnapshot.docs.forEach((doc) => {
			batch.delete(doc.ref);
		});

		// Add the test document to the batch for deletion
		const testRef = doc(firestore, "tests", testId);
		batch.delete(testRef);

		// Commit the batch
		await batch.commit();
	} catch (error) {
		console.error("Error deleting test:", error);
		throw error;
	}
};
