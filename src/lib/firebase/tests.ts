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

		// Add each question as a document in the questions subcollection.
		// Strip undefined fields — Firestore rejects them, and several
		// editors emit `undefined` for cleared per-question overrides
		// (timeLimit, points, multiplier) or empty optional collections
		// (distractors on matching).
		const questionsRef = collection(firestore, `tests/${testId}/questions`);

		for (let i = 0; i < questions.length; i++) {
			const clean: Record<string, any> = { ...questions[i] };
			Object.keys(clean).forEach((key) => {
				if (clean[key] === undefined) delete clean[key];
			});
			await addDoc(questionsRef, {
				...clean,
				order: i,
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
		console.log("getTest() - Fetching test with ID:", testId);

		// Validate test ID format
		if (!testId) {
			console.error("getTest() - Test ID is empty or null");
			throw new Error("Invalid test ID");
		}

		// Check if test ID has unexpected characters that might indicate encoding issues
		if (testId.includes("%") || testId.includes(" ")) {
			console.warn(
				"getTest() - Test ID contains URL encoding characters:",
				testId
			);
			// Decode if it appears to be URL encoded
			const decodedId = decodeURIComponent(testId);
			console.log("getTest() - Decoded test ID:", decodedId);
			if (decodedId !== testId) {
				console.warn("getTest() - Using decoded test ID instead");
				testId = decodedId;
			}
		}

		// Get the test document
		const testRef = doc(firestore, "tests", testId);
		const testDoc = await getDoc(testRef);

		if (!testDoc.exists()) {
			console.error("getTest() - Test document does not exist");
			throw new Error("Test not found");
		}

		const test = { id: testDoc.id, ...testDoc.data() } as Test;
		console.log(
			"getTest() - Test document retrieved successfully:",
			test.title
		);

		// Get the questions
		console.log("getTest() - Fetching questions for test:", testId);
		const questionsPath = `tests/${testId}/questions`;
		console.log("getTest() - Questions collection path:", questionsPath);
		const questionsRef = collection(firestore, questionsPath);

		// Log all available collection references
		console.log("getTest() - Collection reference created:", questionsRef.path);

		// Fetch questions ordered by their explicit `order` field. Every
		// write path (createTest, updateTest, addQuestionToTest,
		// reorderQuestions, deleteQuestion) sets this field, so a single
		// orderBy is sufficient — no fallback chain needed.
		const querySnapshot = await getDocs(
			query(questionsRef, orderBy("order", "asc"))
		);

		console.log(
			"getTest() - Raw questions query result size:",
			querySnapshot.size
		);
		console.log("getTest() - Raw questions query empty:", querySnapshot.empty);

		// Log each document
		querySnapshot.docs.forEach((doc, index) => {
			console.log(`getTest() - Ordered document ${index + 1}:`, doc.id);
			console.log(`getTest() - Document ${index + 1} data:`, doc.data());
		});

		// Try a simple document-to-question conversion first
		const simpleQuestions = querySnapshot.docs.map((doc) => {
			return {
				id: doc.id,
				...doc.data(),
			};
		});
		console.log(
			"getTest() - Simple questions conversion count:",
			simpleQuestions.length
		);
		if (simpleQuestions.length > 0) {
			console.log(
				"getTest() - First simple question structure:",
				JSON.stringify(simpleQuestions[0])
			);
		}

		// Map the documents to questions with more validation
		const questions: Question[] = [];
		for (const doc of querySnapshot.docs) {
			try {
				const data = doc.data();
				console.log(`getTest() - Processing question ${doc.id}:`, data);

				// Check for required fields
				if (!data.type) {
					console.warn(
						`getTest() - Document ${doc.id} missing 'type' field:`,
						data
					);
					continue; // Skip this document as we can't determine question type
				}

				// Log fields present
				console.log(`getTest() - Question ${doc.id} field checks:`, {
					type: data.type,
					hasText: data.text !== undefined,
					hasOrder: data.order !== undefined,
					hasCreatedAt: data.createdAt !== undefined,
					otherFields: Object.keys(data),
				});

				// Create question based on type
				let question: Question;
				switch (data.type) {
					case "multiple-choice":
						question = {
							id: doc.id,
							type: "multiple-choice",
							text: data.text || "Missing question text",
							options: Array.isArray(data.options)
								? data.options
								: ["Option 1", "Option 2"],
							correctOption:
								typeof data.correctOption === "number" ? data.correctOption : 0,
							order: data.order !== undefined ? data.order : 999,
							createdAt: data.createdAt || new Date(),
							explanation: data.explanation || "",
						} as MultipleChoiceQuestion;
						break;

					case "true-false":
						question = {
							id: doc.id,
							type: "true-false",
							text: data.text || "Missing question text",
							isTrue: !!data.isTrue,
							order: data.order !== undefined ? data.order : 999,
							createdAt: data.createdAt || new Date(),
							explanation: data.explanation || "",
						} as TrueFalseQuestion;
						break;

					case "gap-fill":
						question = {
							id: doc.id,
							type: "gap-fill",
							text: data.text || "Missing question text",
							gaps: Array.isArray(data.gaps) ? data.gaps : ["gap"],
							distractors: Array.isArray(data.distractors)
								? data.distractors
								: [],
							order: data.order !== undefined ? data.order : 999,
							createdAt: data.createdAt || new Date(),
							explanation: data.explanation || "",
						} as GapFillQuestion;
						break;

					case "matching":
						question = {
							id: doc.id,
							type: "matching",
							text: data.text || "Missing question text",
							leftItems: Array.isArray(data.leftItems)
								? data.leftItems
								: ["Item 1", "Item 2"],
							rightItems: Array.isArray(data.rightItems)
								? data.rightItems
								: ["Item 1", "Item 2"],
							correctMatches: Array.isArray(data.correctMatches)
								? data.correctMatches
								: [0, 1],
							distractors: Array.isArray(data.distractors)
								? data.distractors
								: [],
							order: data.order !== undefined ? data.order : 999,
							createdAt: data.createdAt || new Date(),
							explanation: data.explanation || "",
						} as MatchingQuestion;
						break;

					case "reordering-horizontal":
					case "reordering-vertical":
						question = {
							id: doc.id,
							type: data.type,
							text: data.text || "Missing question text",
							items: Array.isArray(data.items)
								? data.items
								: ["Item 1", "Item 2"],
							correctOrder: Array.isArray(data.correctOrder)
								? data.correctOrder
								: [0, 1],
							isGap: Array.isArray(data.isGap) ? data.isGap : [false, false],
							order: data.order !== undefined ? data.order : 999,
							createdAt: data.createdAt || new Date(),
							explanation: data.explanation || "",
						} as ReorderingQuestion;
						break;

					default:
						console.warn(
							`getTest() - Unknown question type for document ${doc.id}:`,
							data.type
						);
						continue; // Skip this document as the type is not recognized
				}

				questions.push(question);
				console.log(`getTest() - Successfully processed question ${doc.id}`);
			} catch (err) {
				console.error(`getTest() - Error processing question ${doc.id}:`, err);
			}
		}

		console.log(
			"getTest() - Final processed questions count:",
			questions.length
		);
		if (questions.length > 0) {
			console.log("getTest() - First processed question:", questions[0]);
		} else {
			console.warn("getTest() - No questions were successfully processed!");
		}

		// Return the test data with questions
		return {
			test: test,
			questions,
		};
	} catch (error) {
		console.error("getTest() - Error getting test:", error);
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
 * Updates an existing test and its questions
 * @param testId - The ID of the test to update
 * @param test - The updated test data
 * @param questions - Array of questions for the test (optional)
 * @returns Promise that resolves when the update is complete
 */
export const updateTest = async (
	testId: string,
	test: Partial<Test>,
	questions?: Question[]
): Promise<void> => {
	try {
		console.log("updateTest() - Updating test with ID:", testId);
		console.log("updateTest() - Questions provided:", questions?.length || 0);

		// Update the test document
		const testRef = doc(firestore, "tests", testId);
		await updateDoc(testRef, {
			...test,
			updatedAt: serverTimestamp(),
		});

		// If questions are provided, update them
		if (questions && questions.length > 0) {
			console.log("updateTest() - Updating questions for test");

			// Get existing questions to compare
			const questionsRef = collection(firestore, `tests/${testId}/questions`);
			const querySnapshot = await getDocs(questionsRef);
			const existingQuestions = querySnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));

			console.log("updateTest() - Existing questions:", existingQuestions.length);
			console.log("updateTest() - New questions:", questions.length);

			// Create a batch for efficient updates
			const batch = writeBatch(firestore);

			// Process each question
			for (let i = 0; i < questions.length; i++) {
				const question = questions[i];
				
				// Clean the question object to remove undefined values
				const cleanQuestion: Record<string, any> = { ...question };
				
				// Remove undefined values to prevent Firestore errors
				Object.keys(cleanQuestion).forEach(key => {
					if (cleanQuestion[key] === undefined) {
						delete cleanQuestion[key];
					}
				});
				
				// If the question has an ID, update it
				if (cleanQuestion.id) {
					const questionRef = doc(questionsRef, cleanQuestion.id);
					batch.update(questionRef, {
						...cleanQuestion,
						order: i,
						updatedAt: serverTimestamp()
					});
				} else {
					// If it's a new question, add it
					const newQuestionRef = doc(questionsRef);
					batch.set(newQuestionRef, {
						...cleanQuestion,
						order: i,
						createdAt: serverTimestamp()
					});
				}
			}

			// Find questions that need to be deleted (in existing but not in new questions)
			const existingIds = new Set(existingQuestions.map(q => q.id));
			const newIds = new Set(questions.filter(q => q.id).map(q => q.id));

			// Delete questions that are in existing but not in new
			existingIds.forEach(id => {
				if (id && !newIds.has(id)) {
					const questionRef = doc(questionsRef, id);
					batch.delete(questionRef);
					console.log("updateTest() - Deleting question:", id);
				}
			});

			// Commit all the changes
			await batch.commit();
			console.log("updateTest() - Batch committed successfully");
		}
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
		console.log("addQuestionToTest() - Adding question to test:", testId);
		console.log("addQuestionToTest() - Question type:", question.type);

		// Get the current count of questions to determine the order
		const questionsPath = `tests/${testId}/questions`;
		console.log(
			"addQuestionToTest() - Questions collection path:",
			questionsPath
		);

		const questionsRef = collection(firestore, questionsPath);
		const querySnapshot = await getDocs(questionsRef);
		const currentCount = querySnapshot.size;
		console.log("addQuestionToTest() - Current question count:", currentCount);

		// Prepare question data with order and timestamp
		const questionData = {
			...question,
			order: currentCount,
			createdAt: serverTimestamp(),
		};
		console.log(
			"addQuestionToTest() - Prepared question data:",
			JSON.stringify(questionData, null, 2)
		);

		// Add the new question with the next order value
		const docRef = await addDoc(questionsRef, questionData);
		console.log("addQuestionToTest() - Question added with ID:", docRef.id);

		// Update the test's updatedAt timestamp
		await updateDoc(doc(firestore, "tests", testId), {
			updatedAt: serverTimestamp(),
		});
		console.log("addQuestionToTest() - Test updatedAt timestamp updated");

		return docRef.id;
	} catch (error) {
		console.error(
			"addQuestionToTest() - Error adding question to test:",
			error
		);
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
