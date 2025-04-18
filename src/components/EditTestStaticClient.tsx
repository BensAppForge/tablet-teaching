"use client";

import React, { useState, useEffect } from "react";
import AuthRequired from "@/components/AuthRequired";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import {
	ArrowLeft,
	Save,
	Trash2,
	Plus,
	X,
	ChevronUp,
	ChevronDown,
	GripVertical,
} from "lucide-react";
import {
	getTest,
	updateTest,
	updateQuestion,
	deleteQuestion,
	addQuestionToTest,
	Test,
	Question,
	QuestionType,
	MultipleChoiceQuestion,
	TrueFalseQuestion,
	GapFillQuestion,
	MatchingQuestion,
	ReorderingQuestion,
} from "@/lib/firebase/tests";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import Xarrow, { Xwrapper } from "react-xarrows";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Use colors from create-test page
const CONNECTION_COLORS = [
	"rgb(var(--primary))",
	"rgb(239, 68, 68)",
	"rgb(59, 130, 246)",
	"rgb(16, 185, 129)",
	"rgb(245, 158, 11)",
	"rgb(168, 85, 247)",
];

// Function to fix correctOrder array if it doesn't match items array
const fixReorderingCorrectOrder = (
	question: ReorderingQuestion
): ReorderingQuestion => {
	// Force all values in correctOrder to be numbers
	let correctOrder =
		question.correctOrder?.map((val: number | string) => Number(val)) || [];

	// If the correctOrder array is missing or empty, initialize it
	if (!correctOrder || correctOrder.length === 0) {
		return {
			...question,
			correctOrder: Array.from({ length: question.items.length }, (_, i) => i),
		};
	}

	// If the correctOrder array doesn't contain entries for all items,
	// add the missing indices to the end
	if (correctOrder.length < question.items.length) {
		const existingIndices = new Set(correctOrder);
		const missingIndices = [];

		// Find indices that are missing
		for (let i = 0; i < question.items.length; i++) {
			if (!existingIndices.has(i)) {
				missingIndices.push(i);
			}
		}

		// Add missing indices to the end of correctOrder
		return {
			...question,
			correctOrder: [...correctOrder, ...missingIndices],
		};
	}

	// If the correctOrder array has more entries than items,
	// truncate it to match items length
	if (correctOrder.length > question.items.length) {
		const validIndices = correctOrder.filter(
			(index) => index >= 0 && index < question.items.length
		);

		// If we lost indices after filtering, add any missing ones
		if (validIndices.length < question.items.length) {
			const existingIndices = new Set(validIndices);
			const missingIndices = [];

			for (let i = 0; i < question.items.length; i++) {
				if (!existingIndices.has(i)) {
					missingIndices.push(i);
				}
			}

			return {
				...question,
				correctOrder: [...validIndices, ...missingIndices],
			};
		}

		return {
			...question,
			correctOrder: validIndices,
		};
	}

	// Check if all indices in correctOrder are valid (within range of items array)
	const hasInvalidIndices = correctOrder.some(
		(index) => index < 0 || index >= question.items.length
	);

	if (hasInvalidIndices) {
		// Replace invalid indices with valid ones
		let newCorrectOrder = [...correctOrder];
		const usedIndices = new Set();

		// First pass: keep valid indices
		for (let i = 0; i < newCorrectOrder.length; i++) {
			if (
				newCorrectOrder[i] >= 0 &&
				newCorrectOrder[i] < question.items.length
			) {
				usedIndices.add(newCorrectOrder[i]);
			} else {
				newCorrectOrder[i] = -1; // Mark for replacement
			}
		}

		// Second pass: replace invalid indices
		for (let i = 0; i < newCorrectOrder.length; i++) {
			if (newCorrectOrder[i] === -1) {
				// Find an unused valid index
				for (let j = 0; j < question.items.length; j++) {
					if (!usedIndices.has(j)) {
						newCorrectOrder[i] = j;
						usedIndices.add(j);
						break;
					}
				}
			}
		}

		return {
			...question,
			correctOrder: newCorrectOrder,
		};
	}

	// Return with the correctOrder values explicitly converted to numbers
	return {
		...question,
		correctOrder: correctOrder,
	};
};

const EditTestStaticClient = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const testId = searchParams.get("id");
	const { currentUser } = useAuth();

	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [test, setTest] = useState<Test | null>(null);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [editingQuestions, setEditingQuestions] = useState<{
		[key: string]: Question;
	}>({}); // State for questions being edited
	const [questionToDelete, setQuestionToDelete] = useState<string | null>(null); // State for confirmation dialog

	// Question creation state
	const [showQuestionEditor, setShowQuestionEditor] = useState(false);
	const [newQuestion, setNewQuestion] = useState<Question>({
		type: "multiple-choice",
		text: "",
		options: ["", "", ""],
		correctOption: 0,
		timeLimit: 10,
		points: 1,
		multiplier: 1,
	} as MultipleChoiceQuestion);

	// Question type selection state
	const [currentQuestionType, setCurrentQuestionType] =
		useState<QuestionType>("multiple-choice");

	// Load test data
	useEffect(() => {
		const loadTest = async () => {
			if (!testId) {
				setError(
					"Keine Test-ID angegeben. Bitte verwende einen gültigen Link."
				);
				setIsLoading(false);
				return;
			}

			try {
				setIsLoading(true);
				const { test, questions } = await getTest(testId);
				setTest(test);

				// Process questions, fixing any reordering questions as needed
				const processedQuestions = questions.map((q) => {
					if (
						q.type === "reordering-horizontal" ||
						q.type === "reordering-vertical"
					) {
						return fixReorderingCorrectOrder(q as ReorderingQuestion);
					}
					return q;
				});

				setQuestions(processedQuestions);

				// Initialize editing state for each question
				const initialEditingState: { [key: string]: Question } = {};
				processedQuestions.forEach((q) => {
					if (q.id) {
						initialEditingState[q.id] = { ...q }; // Create a copy for editing
					}
				});
				setEditingQuestions(initialEditingState);

				// Initialize the new question with test defaults
				setNewQuestion({
					type: "multiple-choice",
					text: "",
					options: ["", "", ""],
					correctOption: 0,
					timeLimit: test.defaultTimePerQuestion,
					points: test.defaultCreditPoints,
					multiplier: test.defaultMultiplier,
				} as MultipleChoiceQuestion);
			} catch (error) {
				console.error("Error loading test:", error);
				setError(
					"Der Test konnte nicht geladen werden. Bitte versuche es später erneut."
				);
			} finally {
				setIsLoading(false);
			}
		};

		loadTest();
	}, [testId]);

	// Verify user is owner of the test
	useEffect(() => {
		if (test && currentUser && test.teacherId !== currentUser.uid) {
			setError("Du hast keine Berechtigung, diesen Test zu bearbeiten.");
			setTimeout(() => {
				router.push("/tests");
			}, 2000);
		}
	}, [test, currentUser, router]);

	// Handle test updates
	const handleTestUpdate = async () => {
		if (!test || !testId) return;

		try {
			setIsSaving(true);
			await updateTest(testId, test);
			toast.success("Testinformationen erfolgreich aktualisiert.");
		} catch (error) {
			console.error("Fehler beim Speichern:", error);
			toast.error(
				"Test konnte nicht gespeichert werden. Bitte versuche es später erneut."
			);
		} finally {
			setIsSaving(false);
		}
	};

	// Handle test field changes
	const handleTestChange = (
		field: keyof Test,
		value: string | number | boolean
	) => {
		if (!test) return;
		setTest({
			...test,
			[field]: value,
		});
	};

	// Handle question updates - uses data from editingQuestions state
	const handleQuestionUpdate = async (questionId: string) => {
		if (!questionId || !testId) return;
		const editedQuestion = editingQuestions[questionId];
		if (!editedQuestion) {
			console.error("Edited question not found in state:", questionId);
			toast.error(
				"Fehler: Frage konnte nicht im Bearbeitungszustand gefunden werden."
			);
			return;
		}

		try {
			setIsSaving(true);

			// Prepare the question for saving - ensure correctOrder contains numbers if it's a reordering question
			// and remove the id field since it's redundant (the document ID serves as the id)
			let questionToSave = { ...editedQuestion };

			// Remove the id field to avoid duplicate data
			if ("id" in questionToSave) {
				const { id, ...questionWithoutId } = questionToSave;
				questionToSave = questionWithoutId;
			}

			if (
				editedQuestion.type === "reordering-horizontal" ||
				editedQuestion.type === "reordering-vertical"
			) {
				const reorderingQuestion = questionToSave as ReorderingQuestion;
				questionToSave = {
					...reorderingQuestion,
					correctOrder: reorderingQuestion.correctOrder.map((val) =>
						Number(val)
					),
				};
			}

			// Convert empty fields to undefined to use test defaults
			// Using type guards to avoid comparison errors
			if (
				questionToSave.timeLimit === null ||
				(typeof questionToSave.timeLimit === "string" &&
					questionToSave.timeLimit === "")
			) {
				questionToSave.timeLimit = undefined;
			}

			if (
				questionToSave.points === null ||
				(typeof questionToSave.points === "string" &&
					questionToSave.points === "")
			) {
				questionToSave.points = undefined;
			}

			if (
				questionToSave.multiplier === null ||
				(typeof questionToSave.multiplier === "string" &&
					questionToSave.multiplier === "")
			) {
				questionToSave.multiplier = undefined;
			}

			// Debug log to check what we're saving
			console.log(
				"Saving question with data:",
				JSON.stringify(questionToSave, null, 2)
			);

			await updateQuestion(testId, questionId, questionToSave);
			toast.success(`Frage erfolgreich aktualisiert.`);

			// For UI state, we keep the id since it's needed for state management
			const questionForUiState = {
				...questionToSave,
				id: questionId,
			};

			// Update the main questions state with the saved version (including id for UI purposes)
			setQuestions(
				questions.map((q) => (q.id === questionId ? questionForUiState : q))
			);
		} catch (error) {
			console.error("Error saving question:", error);
			toast.error(`Frage konnte nicht gespeichert werden.`);
		} finally {
			setIsSaving(false);
		}
	};

	// Handle text, points, timeLimit, multiplier changes for any question type
	const handleQuestionEditChange = (
		questionId: string,
		field: keyof Question,
		value: any
	) => {
		console.log(
			`Updating question ${questionId}, field: ${field}, value:`,
			value
		);
		setEditingQuestions((prev) => {
			if (!prev[questionId]) return prev; // Should not happen if initialized correctly

			// Create a new object with updated field
			const updatedQuestion = {
				...prev[questionId],
				[field]: value,
			};

			// Return a new state object
			return {
				...prev,
				[questionId]: updatedQuestion,
			};
		});
	};

	// Handle question deletion - trigger confirmation dialog
	const handleQuestionDelete = async (questionId: string) => {
		if (!questionId || !testId) return;
		setQuestionToDelete(questionId); // Open the confirmation dialog
	};

	// Actual deletion logic after confirmation
	const confirmDeleteQuestion = async (questionId: string) => {
		if (!questionId || !testId) return;
		setQuestionToDelete(null); // Close the dialog

		try {
			setIsSaving(true);
			await deleteQuestion(testId, questionId);
			setQuestions(questions.filter((q) => q.id !== questionId));
			// Remove from editing state as well
			setEditingQuestions((prev) => {
				const newState = { ...prev };
				delete newState[questionId];
				return newState;
			});
			toast.success("Frage erfolgreich gelöscht.");
		} catch (error) {
			console.error("Error deleting question:", error);
			toast.error(
				"Frage konnte nicht gelöscht werden. Bitte versuche es später erneut."
			);
		} finally {
			setIsSaving(false);
		}
	};

	// Handle adding a new question to the test
	const handleAddQuestion = async () => {
		if (!testId || !test) return;

		try {
			setIsSaving(true);

			// Ensure the new question doesn't have an id field which would be saved to Firestore
			const { id, ...questionWithoutId } = newQuestion;

			// Ensure correctOrder contains number values if it's a reordering question
			let questionToSave = questionWithoutId;
			if (
				newQuestion.type === "reordering-horizontal" ||
				newQuestion.type === "reordering-vertical"
			) {
				const reorderingQuestion = questionWithoutId as ReorderingQuestion;
				questionToSave = {
					...reorderingQuestion,
					correctOrder: reorderingQuestion.correctOrder.map((val) =>
						Number(val)
					),
				};
			}

			const questionId = await addQuestionToTest(testId, questionToSave);

			// Add the id back for UI state management
			const questionWithId = { ...questionToSave, id: questionId };
			setQuestions([...questions, questionWithId]);

			// Add the new question to the editing state as well
			setEditingQuestions((prev) => ({
				...prev,
				[questionId]: { ...questionWithId }, // Add copy to editing state
			}));

			// Reset the editor
			setShowQuestionEditor(false);
			setNewQuestion({
				type: "multiple-choice",
				text: "",
				options: ["", "", ""],
				correctOption: 0,
				timeLimit: test.defaultTimePerQuestion,
				points: test.defaultCreditPoints,
				multiplier: test.defaultMultiplier,
			} as MultipleChoiceQuestion);

			toast.success("Neue Frage erfolgreich hinzugefügt.");
		} catch (error) {
			console.error("Error adding question:", error);
			toast.error(
				"Neue Frage konnte nicht hinzugefügt werden. Bitte versuche es später erneut."
			);
		} finally {
			setIsSaving(false);
		}
	};

	// Handle question type change
	const handleQuestionTypeChange = (type: QuestionType) => {
		setCurrentQuestionType(type);

		// Create new question of the selected type
		let newQuestionObj: Question;

		switch (type) {
			case "multiple-choice":
				newQuestionObj = {
					type: "multiple-choice",
					text: "",
					options: ["", "", ""],
					correctOption: 0,
					timeLimit: test?.defaultTimePerQuestion || 10,
					points: test?.defaultCreditPoints || 1,
					multiplier: test?.defaultMultiplier || 1,
				} as MultipleChoiceQuestion;
				break;

			case "true-false":
				newQuestionObj = {
					type: "true-false",
					text: "",
					isTrue: true,
					timeLimit: test?.defaultTimePerQuestion || 10,
					points: test?.defaultCreditPoints || 1,
					multiplier: test?.defaultMultiplier || 1,
				} as TrueFalseQuestion;
				break;

			case "gap-fill":
				newQuestionObj = {
					type: "gap-fill",
					text: "",
					gaps: [""],
					distractors: [],
					timeLimit: test?.defaultTimePerQuestion || 10,
					points: test?.defaultCreditPoints || 1,
					multiplier: test?.defaultMultiplier || 1,
				} as GapFillQuestion;
				break;

			case "matching":
				newQuestionObj = {
					type: "matching",
					text: "",
					leftItems: ["", ""],
					rightItems: ["", ""],
					correctMatches: [0, 1],
					distractors: [],
					timeLimit: test?.defaultTimePerQuestion || 10,
					points: test?.defaultCreditPoints || 1,
					multiplier: test?.defaultMultiplier || 1,
				} as MatchingQuestion;
				break;

			case "reordering-horizontal":
			case "reordering-vertical":
				newQuestionObj = {
					type: type,
					text: "",
					items: ["", ""],
					correctOrder: [0, 1],
					isGap: [false, false],
					timeLimit: test?.defaultTimePerQuestion || 10,
					points: test?.defaultCreditPoints || 1,
					multiplier: test?.defaultMultiplier || 1,
				} as ReorderingQuestion;
				break;

			default:
				newQuestionObj = {
					type: "multiple-choice",
					text: "",
					options: ["", "", ""],
					correctOption: 0,
					timeLimit: test?.defaultTimePerQuestion || 10,
					points: test?.defaultCreditPoints || 1,
					multiplier: test?.defaultMultiplier || 1,
				} as MultipleChoiceQuestion;
		}

		setNewQuestion(newQuestionObj);
	};

	// Handler for option changes in multiple choice questions (for NEW questions)
	const handleOptionChange = (index: number, value: string) => {
		if (newQuestion.type === "multiple-choice") {
			const mcQuestion = newQuestion as MultipleChoiceQuestion;
			const newOptions = [...mcQuestion.options];
			newOptions[index] = value;

			setNewQuestion({
				...newQuestion,
				options: newOptions,
			} as MultipleChoiceQuestion);
		}
	};

	// Handler for setting the correct option in multiple choice questions (for NEW questions)
	const handleCorrectOptionChange = (value: string) => {
		if (newQuestion.type === "multiple-choice") {
			setNewQuestion({
				...newQuestion,
				correctOption: parseInt(value),
			} as MultipleChoiceQuestion);
		}
	};

	// Handler for adding options to multiple choice questions (for NEW questions)
	const addOption = () => {
		if (newQuestion.type === "multiple-choice") {
			const mcQuestion = newQuestion as MultipleChoiceQuestion;
			if (mcQuestion.options.length < 4) {
				setNewQuestion({
					...newQuestion,
					options: [...mcQuestion.options, ""],
				} as MultipleChoiceQuestion);
			}
		}
	};

	// Handler for removing options from multiple choice questions (for NEW questions)
	const removeOption = (index: number) => {
		if (newQuestion.type === "multiple-choice") {
			const mcQuestion = newQuestion as MultipleChoiceQuestion;
			if (mcQuestion.options.length > 2) {
				const newOptions = [...mcQuestion.options];
				newOptions.splice(index, 1);

				// Update correctOption if necessary
				let correctOption = mcQuestion.correctOption;
				if (index === correctOption) {
					correctOption = 0;
				} else if (index < correctOption) {
					correctOption--;
				}

				setNewQuestion({
					...newQuestion,
					options: newOptions,
					correctOption,
				} as MultipleChoiceQuestion);
			}
		}
	};

	// Handler for true/false value changes (for NEW questions)
	const handleTrueFalseChange = (value: string) => {
		if (newQuestion.type === "true-false") {
			setNewQuestion({
				...newQuestion,
				isTrue: value === "true",
			} as TrueFalseQuestion);
		}
	};

	// --- Handlers specific to editing existing questions ---

	const handleEditOptionChange = (
		questionId: string,
		index: number,
		value: string
	) => {
		setEditingQuestions((prev) => {
			const q = prev[questionId];
			if (!q || q.type !== "multiple-choice") return prev;
			const mcQuestion = q as MultipleChoiceQuestion;
			const newOptions = [...mcQuestion.options];
			newOptions[index] = value;
			return { ...prev, [questionId]: { ...q, options: newOptions } };
		});
	};

	const handleEditCorrectOptionChange = (questionId: string, value: string) => {
		setEditingQuestions((prev) => {
			const q = prev[questionId];
			if (!q || q.type !== "multiple-choice") return prev;
			return {
				...prev,
				[questionId]: { ...q, correctOption: parseInt(value) },
			};
		});
	};

	const addEditOption = (questionId: string) => {
		setEditingQuestions((prev) => {
			const q = prev[questionId];
			if (!q || q.type !== "multiple-choice") return prev;
			const mcQuestion = q as MultipleChoiceQuestion;
			if (mcQuestion.options.length < 4) {
				return {
					...prev,
					[questionId]: { ...q, options: [...mcQuestion.options, ""] },
				};
			}
			return prev;
		});
	};

	const removeEditOption = (questionId: string, index: number) => {
		setEditingQuestions((prev) => {
			const q = prev[questionId];
			if (!q || q.type !== "multiple-choice") return prev;
			const mcQuestion = q as MultipleChoiceQuestion;
			if (mcQuestion.options.length > 2) {
				const newOptions = [...mcQuestion.options];
				newOptions.splice(index, 1);

				let correctOption = mcQuestion.correctOption;
				if (index === correctOption) {
					correctOption = 0;
				} else if (index < correctOption) {
					correctOption--;
				}
				return {
					...prev,
					[questionId]: { ...q, options: newOptions, correctOption },
				};
			}
			return prev;
		});
	};

	const handleEditTrueFalseChange = (questionId: string, value: string) => {
		setEditingQuestions((prev) => {
			const q = prev[questionId];
			if (!q || q.type !== "true-false") return prev;
			return { ...prev, [questionId]: { ...q, isTrue: value === "true" } };
		});
	};

	const handleEditGapChange = (
		questionId: string,
		index: number,
		value: string
	) => {
		setEditingQuestions((prev) => {
			const q = prev[questionId];
			if (!q || q.type !== "gap-fill") return prev;
			const gapQuestion = q as GapFillQuestion;
			const newGaps = [...gapQuestion.gaps];
			newGaps[index] = value;
			return { ...prev, [questionId]: { ...q, gaps: newGaps } };
		});
	};

	const addEditGap = (questionId: string) => {
		setEditingQuestions((prev) => {
			const q = prev[questionId];
			if (!q || q.type !== "gap-fill") return prev;
			const gapQuestion = q as GapFillQuestion;
			return {
				...prev,
				[questionId]: { ...q, gaps: [...gapQuestion.gaps, ""] },
			};
		});
	};

	const removeEditGap = (questionId: string, index: number) => {
		setEditingQuestions((prev) => {
			const q = prev[questionId];
			if (!q || q.type !== "gap-fill") return prev;
			const gapQuestion = q as GapFillQuestion;
			if (gapQuestion.gaps.length > 1) {
				const newGaps = [...gapQuestion.gaps];
				newGaps.splice(index, 1);
				return { ...prev, [questionId]: { ...q, gaps: newGaps } };
			}
			return prev;
		});
	};

	const handleEditDistractorChange = (
		questionId: string,
		index: number,
		value: string
	) => {
		setEditingQuestions((prev) => {
			const q = prev[questionId];
			if (!q || (q.type !== "gap-fill" && q.type !== "matching")) return prev;

			if (q.type === "gap-fill") {
				const gapQuestion = q as GapFillQuestion;
				const newDistractors = [...(gapQuestion.distractors || [])];
				newDistractors[index] = value;
				return { ...prev, [questionId]: { ...q, distractors: newDistractors } };
			} else if (q.type === "matching") {
				const matchQuestion = q as MatchingQuestion;
				const newDistractors = [...(matchQuestion.distractors || [])];
				newDistractors[index] = value;
				return { ...prev, [questionId]: { ...q, distractors: newDistractors } };
			}
			return prev;
		});
	};

	const addEditDistractor = (questionId: string) => {
		setEditingQuestions((prev) => {
			const q = prev[questionId];
			if (!q || (q.type !== "gap-fill" && q.type !== "matching")) return prev;

			if (q.type === "gap-fill") {
				const gapQuestion = q as GapFillQuestion;
				const newDistractors = [...(gapQuestion.distractors || []), ""];
				return { ...prev, [questionId]: { ...q, distractors: newDistractors } };
			} else if (q.type === "matching") {
				const matchQuestion = q as MatchingQuestion;
				const newDistractors = [...(matchQuestion.distractors || []), ""];
				return { ...prev, [questionId]: { ...q, distractors: newDistractors } };
			}
			return prev;
		});
	};

	const removeEditDistractor = (questionId: string, index: number) => {
		setEditingQuestions((prev) => {
			const q = prev[questionId];
			if (!q || (q.type !== "gap-fill" && q.type !== "matching")) return prev;

			if (q.type === "gap-fill") {
				const gapQuestion = q as GapFillQuestion;
				if (gapQuestion.distractors && gapQuestion.distractors.length > 0) {
					const newDistractors = [...gapQuestion.distractors];
					newDistractors.splice(index, 1);
					return {
						...prev,
						[questionId]: { ...q, distractors: newDistractors },
					};
				}
			} else if (q.type === "matching") {
				const matchQuestion = q as MatchingQuestion;
				if (matchQuestion.distractors && matchQuestion.distractors.length > 0) {
					const newDistractors = [...matchQuestion.distractors];
					newDistractors.splice(index, 1);
					return {
						...prev,
						[questionId]: { ...q, distractors: newDistractors },
					};
				}
			}
			return prev;
		});
	};

	const handleEditLeftItemChange = (
		questionId: string,
		index: number,
		value: string
	) => {
		setEditingQuestions((prev) => {
			const q = prev[questionId];
			if (!q || q.type !== "matching") return prev;
			const matchQuestion = q as MatchingQuestion;
			const newLeftItems = [...matchQuestion.leftItems];
			newLeftItems[index] = value;
			return { ...prev, [questionId]: { ...q, leftItems: newLeftItems } };
		});
	};

	const handleEditRightItemChange = (
		questionId: string,
		index: number,
		value: string
	) => {
		setEditingQuestions((prev) => {
			const q = prev[questionId];
			if (!q || q.type !== "matching") return prev;
			const matchQuestion = q as MatchingQuestion;
			const newRightItems = [...matchQuestion.rightItems];
			newRightItems[index] = value;
			return { ...prev, [questionId]: { ...q, rightItems: newRightItems } };
		});
	};

	const handleEditMatchChange = (
		questionId: string,
		leftIndex: number,
		rightIndex: number
	) => {
		setEditingQuestions((prev) => {
			const q = prev[questionId];
			if (!q || q.type !== "matching") return prev;
			const matchQuestion = q as MatchingQuestion;
			const newCorrectMatches = [...matchQuestion.correctMatches];
			newCorrectMatches[leftIndex] = rightIndex;
			return {
				...prev,
				[questionId]: { ...q, correctMatches: newCorrectMatches },
			};
		});
	};

	const addEditMatchingPair = (questionId: string) => {
		setEditingQuestions((prev) => {
			const q = prev[questionId];
			if (!q || q.type !== "matching") return prev;
			const matchQuestion = q as MatchingQuestion;
			const newLength = matchQuestion.leftItems.length;
			// Find the next available index for the right side
			const existingRightIndices = new Set(matchQuestion.correctMatches);
			let nextRightIndex = 0;
			while (
				existingRightIndices.has(nextRightIndex) &&
				nextRightIndex <= newLength
			) {
				nextRightIndex++;
			}
			if (nextRightIndex > newLength) {
				// Should not happen if logic is correct, fallback
				nextRightIndex = newLength;
			}

			return {
				...prev,
				[questionId]: {
					...q,
					leftItems: [...matchQuestion.leftItems, ""],
					rightItems: [...matchQuestion.rightItems, ""],
					correctMatches: [...matchQuestion.correctMatches, nextRightIndex],
				},
			};
		});
	};

	const removeEditMatchingPair = (questionId: string, index: number) => {
		setEditingQuestions((prev) => {
			const q = prev[questionId];
			if (!q || q.type !== "matching") return prev;
			const matchQuestion = q as MatchingQuestion;
			if (matchQuestion.leftItems.length <= 2) return prev; // Keep at least 2 pairs

			const newLeftItems = [...matchQuestion.leftItems];
			const newRightItems = [...matchQuestion.rightItems];
			const newCorrectMatches = [...matchQuestion.correctMatches];

			const removedRightIndex = newCorrectMatches[index]; // The index on the right side that was matched to the removed left item

			// Remove items
			newLeftItems.splice(index, 1);
			newRightItems.splice(removedRightIndex, 1); // Remove the corresponding right item
			newCorrectMatches.splice(index, 1); // Remove the match entry for the left item

			// Adjust indices in correctMatches
			for (let i = 0; i < newCorrectMatches.length; i++) {
				// If the match pointed to an index after the removed right item, decrement it
				if (newCorrectMatches[i] > removedRightIndex) {
					newCorrectMatches[i]--;
				}
			}

			return {
				...prev,
				[questionId]: {
					...q,
					leftItems: newLeftItems,
					rightItems: newRightItems,
					correctMatches: newCorrectMatches,
				},
			};
		});
	};

	const handleEditReorderItemChange = (
		questionId: string,
		index: number,
		value: string
	) => {
		console.log(
			`Edit reorder item: questionId=${questionId}, index=${index}, value=${value}`
		);

		setEditingQuestions((prev) => {
			const q = prev[questionId];
			if (
				!q ||
				(q.type !== "reordering-horizontal" && q.type !== "reordering-vertical")
			)
				return prev;

			const reorderQ = q as ReorderingQuestion;
			const newItems = [...reorderQ.items];
			newItems[index] = value;

			return {
				...prev,
				[questionId]: {
					...q,
					items: newItems,
				},
			};
		});
	};

	const toggleEditReorderItemGap = (questionId: string, itemIndex: number) => {
		console.log(`Toggle gap: questionId=${questionId}, itemIndex=${itemIndex}`);

		// Direct state update using a function form for reliability
		setEditingQuestions((prev) => {
			// Make a deep copy of the entire state object
			const newState = JSON.parse(JSON.stringify(prev));

			// Toggle the gap state
			if (
				newState[questionId] &&
				(newState[questionId].type === "reordering-horizontal" ||
					newState[questionId].type === "reordering-vertical")
			) {
				// Initialize isGap array if it doesn't exist
				if (!newState[questionId].isGap) {
					newState[questionId].isGap = Array(
						newState[questionId].items.length
					).fill(false);
				}

				// Toggle the gap state
				newState[questionId].isGap[itemIndex] =
					!newState[questionId].isGap[itemIndex];
			}

			return newState;
		});
	};

	const removeEditReorderItem = (questionId: string, itemIndex: number) => {
		console.log(
			`Remove item: questionId=${questionId}, itemIndex=${itemIndex}`
		);

		// Direct state update using a function form for reliability
		setEditingQuestions((prev) => {
			// Make a deep copy of the entire state object
			const newState = JSON.parse(JSON.stringify(prev));

			// Remove the item
			if (
				newState[questionId] &&
				(newState[questionId].type === "reordering-horizontal" ||
					newState[questionId].type === "reordering-vertical")
			) {
				const reorderQuestion = newState[questionId];

				// Don't remove if we'd have fewer than 2 items
				if (reorderQuestion.items.length <= 2) {
					return prev;
				}

				// Find the visual index of this item
				const visualIndex = reorderQuestion.correctOrder.findIndex(
					(val) => Number(val) === Number(itemIndex)
				);

				if (visualIndex === -1) {
					console.error(
						"Cannot find visual index for item to remove:",
						itemIndex
					);
					return prev;
				}

				// Remove the item from the arrays
				reorderQuestion.items.splice(itemIndex, 1);
				if (reorderQuestion.isGap) {
					reorderQuestion.isGap.splice(itemIndex, 1);
				}

				// Remove from correctOrder and adjust higher indices
				reorderQuestion.correctOrder.splice(visualIndex, 1);
				for (let i = 0; i < reorderQuestion.correctOrder.length; i++) {
					if (reorderQuestion.correctOrder[i] > itemIndex) {
						reorderQuestion.correctOrder[i] =
							Number(reorderQuestion.correctOrder[i]) - 1;
					}
				}
			}

			return newState;
		});
	};

	const addEditReorderItem = (questionId: string) => {
		console.log(`Add item: questionId=${questionId}`);

		// Direct state update using a function form for reliability
		setEditingQuestions((prev) => {
			// Make a deep copy of the entire state object
			const newState = JSON.parse(JSON.stringify(prev));

			// Add a new item
			if (
				newState[questionId] &&
				(newState[questionId].type === "reordering-horizontal" ||
					newState[questionId].type === "reordering-vertical")
			) {
				const reorderQuestion = newState[questionId];

				// Add the new item
				const newIndex = reorderQuestion.items.length;
				reorderQuestion.items.push("");

				// Add to isGap array if it exists
				if (reorderQuestion.isGap) {
					reorderQuestion.isGap.push(false);
				} else {
					reorderQuestion.isGap = Array(reorderQuestion.items.length).fill(
						false
					);
				}

				// Add to correctOrder at the end
				reorderQuestion.correctOrder.push(newIndex);
			}

			return newState;
		});
	};

	// --- Reordering Drag & Drop Setup ---
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	function handleDragEnd(event: DragEndEvent, questionId: string) {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			setEditingQuestions((prev) => {
				const q = prev[questionId];
				if (
					!q ||
					(q.type !== "reordering-horizontal" &&
						q.type !== "reordering-vertical")
				)
					return prev;

				const reorderQuestion = q as ReorderingQuestion;

				// Get the visual indices from the drag event
				const oldVisualIndex = parseInt(active.id.toString());
				const newVisualIndex = parseInt(over.id.toString());

				if (isNaN(oldVisualIndex) || isNaN(newVisualIndex)) {
					console.error(
						"Invalid visual indices for drag end:",
						active.id,
						over.id
					);
					return prev;
				}

				// Create a new visual order by moving the item
				// Ensure all values are numbers
				const newCorrectOrder = [
					...reorderQuestion.correctOrder.map((val) => Number(val)),
				];
				const movedItem = Number(newCorrectOrder[oldVisualIndex]);
				newCorrectOrder.splice(oldVisualIndex, 1);
				newCorrectOrder.splice(newVisualIndex, 0, movedItem);

				console.log("Drag operation:", {
					oldVisualIndex,
					newVisualIndex,
					movedItemValue: movedItem,
					before: reorderQuestion.correctOrder,
					after: newCorrectOrder,
				});

				return {
					...prev,
					[questionId]: { ...q, correctOrder: newCorrectOrder },
				};
			});
		}
	}

	// Component for Sortable Items
	function SortableReorderItem({
		id,
		children,
	}: {
		id: string | number;
		children: React.ReactNode;
	}) {
		const {
			attributes,
			listeners,
			setNodeRef,
			transform,
			transition,
			isDragging,
		} = useSortable({ id: id.toString() }); // ID must be string

		const style = {
			transform: CSS.Transform.toString(transform),
			transition,
			opacity: isDragging ? 0.5 : 1,
			// Ensure dragged item appears above others
			zIndex: isDragging ? 10 : "auto",
			position: "relative" as "relative", // Needed for zIndex to work reliably
			cursor: isDragging ? "grabbing" : "grab", // Indicate draggable, changes on drag
		};

		return (
			// The SortableItem div itself is the draggable area
			<div ref={setNodeRef} style={style} {...attributes} {...listeners}>
				{children}
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="container mx-auto px-4 py-6">
				<div className="text-center p-8">
					<p>Laden...</p>
				</div>
			</div>
		);
	}

	if (error || !test) {
		return (
			<div className="container mx-auto px-4 py-6">
				<div className="bg-muted rounded-md p-8 text-center">
					<p className="text-lg mb-4">
						{error || "Der Test konnte nicht geladen werden."}
					</p>
					<Button
						variant="outline"
						onClick={() => router.push("/tests")}
						className="flex items-center gap-2"
					>
						<ArrowLeft className="h-4 w-4" />
						Zurück zur Testübersicht
					</Button>
				</div>
			</div>
		);
	}

	return (
		<AuthRequired>
			<div className="container mx-auto px-4 py-6">
				<div className="flex justify-between items-center border-b mb-6">
					<h1 className="text-2xl font-semibold py-2 text-gray-700 dark:text-gray-200">
						Test bearbeiten
					</h1>
					<Button
						variant="outline"
						onClick={() => router.push("/tests")}
						className="flex items-center gap-2"
					>
						<ArrowLeft className="h-4 w-4" />
						Zurück zur Testübersicht
					</Button>
				</div>

				<div className="space-y-8">
					{/* Test Information */}
					<Card>
						<CardHeader>
							<CardTitle>Testinformationen</CardTitle>
							<CardDescription>
								Bearbeite die grundlegenden Informationen deines Tests.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid gap-6">
								<div className="grid gap-3">
									<Label htmlFor="title">Titel</Label>
									<Input
										id="title"
										value={test.title}
										onChange={(e) => handleTestChange("title", e.target.value)}
									/>
								</div>

								<div className="grid gap-3">
									<Label htmlFor="description">Beschreibung</Label>
									<Textarea
										id="description"
										value={test.description || ""}
										onChange={(e) =>
											handleTestChange("description", e.target.value)
										}
									/>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="grid gap-3">
										<Label htmlFor="targetLanguage">Zielsprache</Label>
										<Input
											id="targetLanguage"
											value={test.targetLanguage}
											onChange={(e) =>
												handleTestChange("targetLanguage", e.target.value)
											}
										/>
									</div>

									<div className="grid gap-3">
										<Label htmlFor="cefrLevel">CEFR Sprachniveau</Label>
										<Select
											value={test.cefrLevel}
											onValueChange={(value) =>
												handleTestChange("cefrLevel", value)
											}
										>
											<SelectTrigger id="cefrLevel">
												<SelectValue placeholder="Wähle ein Sprachniveau" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="A1">A1 - Anfänger</SelectItem>
												<SelectItem value="A2">
													A2 - Grundlegende Kenntnisse
												</SelectItem>
												<SelectItem value="B1">
													B1 - Fortgeschrittene Grundkenntnisse
												</SelectItem>
												<SelectItem value="B2">
													B2 - Selbständige Sprachverwendung
												</SelectItem>
												<SelectItem value="C1">
													C1 - Fachkundige Sprachkenntnisse
												</SelectItem>
												<SelectItem value="C2">
													C2 - Annähernd muttersprachliche Kenntnisse
												</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
									<div className="grid gap-3">
										<Label htmlFor="defaultTimePerQuestion">
											Standardzeit pro Frage (Sekunden)
										</Label>
										<Input
											id="defaultTimePerQuestion"
											type="number"
											min="5"
											value={test.defaultTimePerQuestion}
											onChange={(e) =>
												handleTestChange(
													"defaultTimePerQuestion",
													parseInt(e.target.value)
												)
											}
										/>
									</div>

									<div className="grid gap-3">
										<Label htmlFor="defaultCreditPoints">
											Standard Punkte pro Frage
										</Label>
										<Input
											id="defaultCreditPoints"
											type="number"
											min="1"
											value={test.defaultCreditPoints}
											onChange={(e) =>
												handleTestChange(
													"defaultCreditPoints",
													parseInt(e.target.value)
												)
											}
										/>
									</div>

									<div className="grid gap-3">
										<Label htmlFor="defaultMultiplier">
											Standard Multiplikator
										</Label>
										<Input
											id="defaultMultiplier"
											type="number"
											min="1"
											step="0.1"
											value={test.defaultMultiplier}
											onChange={(e) =>
												handleTestChange(
													"defaultMultiplier",
													parseFloat(e.target.value)
												)
											}
										/>
									</div>
								</div>
							</div>
						</CardContent>
						<CardFooter>
							<Button
								className="ml-auto"
								onClick={handleTestUpdate}
								disabled={isSaving}
							>
								{isSaving ? "Speichern..." : "Speichern"}
							</Button>
						</CardFooter>
					</Card>

					{/* Questions */}
					<Card>
						<CardHeader>
							<CardTitle>Fragen ({questions.length})</CardTitle>
							<CardDescription>
								Bearbeite, lösche oder füge neue Fragen zu deinem Test hinzu.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{questions.length === 0 ? (
								<div className="text-center p-8 border border-dashed rounded-md">
									<p>
										Keine Fragen vorhanden. Füge Fragen zu deinem Test hinzu.
									</p>
								</div>
							) : (
								<Accordion type="multiple" className="space-y-4">
									{questions.map((question, index) => {
										const questionId = question.id;
										const editedQuestion = questionId
											? editingQuestions[questionId]
											: null;

										// Fallback if somehow not in editing state (should not happen)
										if (!questionId || !editedQuestion) {
											return (
												<AccordionItem
													key={`q-${index}`}
													value={`q-${index}`}
													className="border rounded-md opacity-50"
												>
													<AccordionTrigger className="px-4">
														Fehler: Frage nicht editierbar (ID:{" "}
														{questionId || "unbekannt"})
													</AccordionTrigger>
												</AccordionItem>
											);
										}

										// Get default values from test if not set on question
										const timeLimit =
											editedQuestion.timeLimit ?? test.defaultTimePerQuestion;
										const points =
											editedQuestion.points ?? test.defaultCreditPoints;
										const multiplier =
											editedQuestion.multiplier ?? test.defaultMultiplier;

										return (
											<AccordionItem
												key={questionId}
												value={questionId}
												className="border rounded-md"
											>
												<div className="flex items-center w-full">
													<AccordionTrigger className="px-4 py-2 hover:bg-accent/50 data-[state=open]:bg-accent/50 flex-1">
														<div className="flex items-center justify-between w-full gap-2">
															<div className="flex items-center truncate flex-1 min-w-0">
																<span className="font-medium mr-2 whitespace-nowrap">
																	Frage {index + 1} ({editedQuestion.type}):
																</span>
																<span className="text-sm text-muted-foreground truncate">
																	{editedQuestion.text || "Leere Frage"}
																</span>
															</div>
														</div>
													</AccordionTrigger>
													{/* Move delete button outside AccordionTrigger but keep it right-aligned */}
													<div className="flex-shrink-0 pr-4">
														<AlertDialog>
															<AlertDialogTrigger asChild>
																<Button
																	variant="destructive"
																	size="icon"
																	className="flex-shrink-0 h-7 w-7"
																	disabled={isSaving}
																>
																	<Trash2 className="h-4 w-4" />
																</Button>
															</AlertDialogTrigger>
															<AlertDialogContent
																onClick={(e) => e.stopPropagation()} // Prevent clicks bubbling up
															>
																<AlertDialogHeader>
																	<AlertDialogTitle>
																		Frage löschen?
																	</AlertDialogTitle>
																	<AlertDialogDescription>
																		Bist du sicher, dass du diese Frage (Frage{" "}
																		{index + 1}) unwiderruflich löschen
																		möchtest?
																	</AlertDialogDescription>
																</AlertDialogHeader>
																<AlertDialogFooter>
																	<AlertDialogCancel>
																		Abbrechen
																	</AlertDialogCancel>
																	<AlertDialogAction
																		onClick={() =>
																			confirmDeleteQuestion(questionId)
																		} // Pass questionId here
																		disabled={isSaving}
																		className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
																	>
																		{isSaving ? "Löschen..." : "Ja, löschen"}
																	</AlertDialogAction>
																</AlertDialogFooter>
															</AlertDialogContent>
														</AlertDialog>
													</div>
												</div>
												<AccordionContent className="px-4 pb-4 space-y-4 border-t pt-4">
													{/* Render matching question editor in Xwrapper */}
													{editedQuestion.type === "matching" && (
														<Xwrapper>
															{/* Generic Fields */}
															<div className="grid gap-2">
																<Label htmlFor={`q-text-${questionId}`}>
																	Fragetext
																</Label>
																<Textarea
																	id={`q-text-${questionId}`}
																	value={editedQuestion.text}
																	onChange={(e) =>
																		handleQuestionEditChange(
																			questionId,
																			"text",
																			e.target.value
																		)
																	}
																	placeholder="Gib hier den Fragetext ein"
																/>
															</div>
															{/* Matching Question Editor */}
															<div className="space-y-4">
																<div className="grid grid-cols-2 gap-6 items-start">
																	{/* Left Column */}
																	<div>
																		<Label className="mb-2 block text-center">
																			Linke Seite
																		</Label>
																		{(
																			editedQuestion as MatchingQuestion
																		).leftItems.map((leftItem, idx) => (
																			<div
																				key={idx}
																				className="flex items-center space-x-2 mb-2"
																			>
																				<div
																					id={`arrow-start-${questionId}-${idx}`}
																					className="w-1 h-1 mr-1"
																				></div>{" "}
																				{/* Arrow Anchor */}
																				<Input
																					id={`q-${questionId}-left-${idx}`}
																					value={leftItem}
																					onChange={(e) =>
																						handleEditLeftItemChange(
																							questionId,
																							idx,
																							e.target.value
																						)
																					}
																					placeholder={`Links ${idx + 1}`}
																				/>
																				<Button
																					variant="ghost"
																					size="icon"
																					onClick={() =>
																						removeEditMatchingPair(
																							questionId,
																							idx
																						)
																					}
																					disabled={
																						(editedQuestion as MatchingQuestion)
																							.leftItems.length <= 2 || isSaving
																					}
																					className="h-8 w-8"
																				>
																					<X className="h-4 w-4" />
																				</Button>
																			</div>
																		))}
																	</div>

																	{/* Right Column (Items + Distractors) */}
																	<div>
																		<Label className="mb-2 block text-center">
																			Rechte Seite
																		</Label>
																		{/* Right Items */}
																		{(
																			editedQuestion as MatchingQuestion
																		).rightItems.map((rightItem, idx) => (
																			<div
																				key={idx}
																				className="flex items-center space-x-2 mb-2"
																			>
																				<Input
																					id={`q-${questionId}-right-${idx}`}
																					value={rightItem}
																					onChange={(e) =>
																						handleEditRightItemChange(
																							questionId,
																							idx,
																							e.target.value
																						)
																					}
																					placeholder={`Rechts ${idx + 1}`}
																				/>
																				<div
																					id={`arrow-end-${questionId}-${idx}`}
																					className="w-1 h-1 ml-1"
																				></div>{" "}
																				{/* Arrow Anchor */}
																			</div>
																		))}
																		{/* Distractors */}
																		{(
																			editedQuestion as MatchingQuestion
																		).distractors?.map((distractor, idx) => (
																			<div
																				key={`dist-${idx}`}
																				className="flex items-center space-x-2 mb-2"
																			>
																				<Input
																					value={distractor}
																					onChange={(e) =>
																						handleEditDistractorChange(
																							questionId,
																							idx,
																							e.target.value
																						)
																					}
																					placeholder={`Ablenker ${idx + 1}`}
																					className="border-dashed border-muted-foreground"
																				/>
																				<Button
																					variant="ghost"
																					size="icon"
																					onClick={() =>
																						removeEditDistractor(
																							questionId,
																							idx
																						)
																					}
																					disabled={isSaving}
																				>
																					<X className="h-4 w-4" />
																				</Button>
																			</div>
																		))}
																	</div>
																</div>

																{/* Add Buttons */}
																<div className="flex justify-between">
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() =>
																			addEditMatchingPair(questionId)
																		}
																		disabled={isSaving}
																	>
																		<Plus className="h-4 w-4 mr-1" /> Paar
																		hinzufügen
																	</Button>
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() =>
																			addEditDistractor(questionId)
																		}
																		disabled={isSaving}
																	>
																		<Plus className="h-4 w-4 mr-1" /> Ablenker
																		hinzufügen
																	</Button>
																</div>

																{/* Connections Section */}
																<div className="border-t pt-4 mt-4">
																	<Label className="mb-2 block">
																		Verknüpfungen
																	</Label>
																	<div className="space-y-2 max-w-md">
																		{(
																			editedQuestion as MatchingQuestion
																		).leftItems.map((leftItem, leftIdx) => {
																			const color =
																				CONNECTION_COLORS[
																					leftIdx % CONNECTION_COLORS.length
																				];
																			return (
																				<div
																					key={leftIdx}
																					className="flex items-center gap-2"
																				>
																					<div
																						className="w-[40%] text-sm font-medium flex items-center truncate"
																						style={{ color }}
																					>
																						<div
																							className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
																							style={{ backgroundColor: color }}
																						></div>
																						<span className="truncate">
																							{leftItem ||
																								`Links ${leftIdx + 1}`}
																						</span>
																						:
																					</div>
																					<div className="flex-1">
																						<Select
																							value={
																								(
																									editedQuestion as MatchingQuestion
																								).correctMatches[
																									leftIdx
																								]?.toString() ?? ""
																							}
																							onValueChange={(value) =>
																								handleEditMatchChange(
																									questionId,
																									leftIdx,
																									parseInt(value)
																								)
																							}
																						>
																							<SelectTrigger
																								style={{ borderColor: color }}
																								className="h-8"
																							>
																								<SelectValue placeholder="Wählen..." />
																							</SelectTrigger>
																							<SelectContent>
																								{(
																									editedQuestion as MatchingQuestion
																								).rightItems.map(
																									(rightItem, rightIdx) => (
																										<SelectItem
																											key={rightIdx}
																											value={rightIdx.toString()}
																										>
																											{rightItem ||
																												`Rechts ${
																													rightIdx + 1
																												}`}
																										</SelectItem>
																									)
																								)}
																							</SelectContent>
																						</Select>
																					</div>
																				</div>
																			);
																		})}
																	</div>
																</div>

																{/* Render arrows */}
																{(
																	editedQuestion as MatchingQuestion
																).leftItems.map((_, leftIdx) => {
																	const rightIdx = (
																		editedQuestion as MatchingQuestion
																	).correctMatches[leftIdx];
																	if (
																		rightIdx !== undefined &&
																		rightIdx <
																			(editedQuestion as MatchingQuestion)
																				.rightItems.length
																	) {
																		const color =
																			CONNECTION_COLORS[
																				leftIdx % CONNECTION_COLORS.length
																			];
																		return (
																			<Xarrow
																				key={`arrow-${questionId}-${leftIdx}`}
																				start={`arrow-start-${questionId}-${leftIdx}`}
																				end={`arrow-end-${questionId}-${rightIdx}`}
																				color={color}
																				strokeWidth={2}
																				path="smooth" // Use smooth bezier curve
																				curveness={0.8}
																				startAnchor="right"
																				endAnchor="left"
																				showHead={true}
																				headSize={4}
																			/>
																		);
																	}
																	return null;
																})}
															</div>
														</Xwrapper>
													)}

													{/* Render non-matching question editors */}
													{editedQuestion.type !== "matching" && (
														<div className="space-y-4">
															{/* Generic Fragetext */}
															<div className="grid gap-2">
																<Label htmlFor={`q-text-${questionId}`}>
																	Fragetext
																</Label>
																<Textarea
																	id={`q-text-${questionId}`}
																	value={editedQuestion.text}
																	onChange={(e) =>
																		handleQuestionEditChange(
																			questionId,
																			"text",
																			e.target.value
																		)
																	}
																	placeholder="Gib hier den Fragetext ein"
																/>
															</div>
															{/* Specific Editors */}
															{editedQuestion.type === "multiple-choice" && (
																<div className="space-y-3">
																	<Label>Antwortoptionen (max. 4)</Label>
																	<RadioGroup
																		value={(
																			editedQuestion as MultipleChoiceQuestion
																		).correctOption.toString()}
																		onValueChange={(value) =>
																			handleEditCorrectOptionChange(
																				questionId,
																				value
																			)
																		}
																	>
																		{(
																			editedQuestion as MultipleChoiceQuestion
																		).options.map((option, idx) => (
																			<div
																				key={idx}
																				className="flex items-center space-x-2"
																			>
																				<RadioGroupItem
																					value={idx.toString()}
																					id={`q-${questionId}-opt-${idx}`}
																				/>
																				<Input
																					value={option}
																					onChange={(e) =>
																						handleEditOptionChange(
																							questionId,
																							idx,
																							e.target.value
																						)
																					}
																					placeholder={`Option ${idx + 1}`}
																				/>
																				<Button
																					variant="ghost"
																					size="icon"
																					onClick={() =>
																						removeEditOption(questionId, idx)
																					}
																					disabled={
																						(
																							editedQuestion as MultipleChoiceQuestion
																						).options.length <= 2 || isSaving
																					}
																				>
																					<X className="h-4 w-4" />
																				</Button>
																			</div>
																		))}
																	</RadioGroup>
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() => addEditOption(questionId)}
																		disabled={
																			(editedQuestion as MultipleChoiceQuestion)
																				.options.length >= 4 || isSaving
																		}
																	>
																		<Plus className="h-4 w-4 mr-1" /> Option
																		hinzufügen
																	</Button>
																</div>
															)}

															{editedQuestion.type === "true-false" && (
																<div className="space-y-3">
																	<Label>Korrekte Antwort</Label>
																	<RadioGroup
																		value={
																			(editedQuestion as TrueFalseQuestion)
																				.isTrue
																				? "true"
																				: "false"
																		}
																		onValueChange={(value) =>
																			handleEditTrueFalseChange(
																				questionId,
																				value
																			)
																		}
																		className="flex space-x-4"
																	>
																		<div className="flex items-center space-x-2">
																			<RadioGroupItem
																				value="true"
																				id={`q-${questionId}-true`}
																			/>
																			<Label htmlFor={`q-${questionId}-true`}>
																				Wahr
																			</Label>
																		</div>
																		<div className="flex items-center space-x-2">
																			<RadioGroupItem
																				value="false"
																				id={`q-${questionId}-false`}
																			/>
																			<Label htmlFor={`q-${questionId}-false`}>
																				Falsch
																			</Label>
																		</div>
																	</RadioGroup>
																</div>
															)}

															{editedQuestion.type === "gap-fill" && (
																<div className="space-y-3">
																	<div>
																		<Label>Lücken (korrekte Antworten)</Label>
																		<p className="text-xs text-muted-foreground mb-2">
																			Gib die Wörter oder Phrasen ein, die in
																			die Lücken im Fragetext passen. Der
																			Fragetext selbst muss die Lücken nicht
																			markieren.
																		</p>
																		{(
																			editedQuestion as GapFillQuestion
																		).gaps.map((gap, idx) => (
																			<div
																				key={idx}
																				className="flex items-center space-x-2 mb-2"
																			>
																				<Input
																					value={gap}
																					onChange={(e) =>
																						handleEditGapChange(
																							questionId,
																							idx,
																							e.target.value
																						)
																					}
																					placeholder={`Lücke ${idx + 1}`}
																				/>
																				<Button
																					variant="ghost"
																					size="icon"
																					onClick={() =>
																						removeEditGap(questionId, idx)
																					}
																					disabled={
																						(editedQuestion as GapFillQuestion)
																							.gaps.length <= 1 || isSaving
																					}
																				>
																					<X className="h-4 w-4" />
																				</Button>
																			</div>
																		))}
																		<Button
																			variant="outline"
																			size="sm"
																			onClick={() => addEditGap(questionId)}
																			disabled={isSaving}
																		>
																			<Plus className="h-4 w-4 mr-1" /> Lücke
																			hinzufügen
																		</Button>
																	</div>
																	<div>
																		<Label>Ablenker (optional)</Label>
																		<p className="text-xs text-muted-foreground mb-2">
																			Falsche Antwortoptionen, die zur Auswahl
																			angezeigt werden.
																		</p>
																		{(
																			(editedQuestion as GapFillQuestion)
																				.distractors || []
																		).map((distractor, idx) => (
																			<div
																				key={idx}
																				className="flex items-center space-x-2 mb-2"
																			>
																				<Input
																					value={distractor}
																					onChange={(e) =>
																						handleEditDistractorChange(
																							questionId,
																							idx,
																							e.target.value
																						)
																					}
																					placeholder={`Ablenker ${idx + 1}`}
																				/>
																				<Button
																					variant="ghost"
																					size="icon"
																					onClick={() =>
																						removeEditDistractor(
																							questionId,
																							idx
																						)
																					}
																					disabled={isSaving}
																				>
																					<X className="h-4 w-4" />
																				</Button>
																			</div>
																		))}
																		<Button
																			variant="outline"
																			size="sm"
																			onClick={() =>
																				addEditDistractor(questionId)
																			}
																			disabled={isSaving}
																		>
																			<Plus className="h-4 w-4 mr-1" /> Ablenker
																			hinzufügen
																		</Button>
																	</div>
																</div>
															)}

															{(editedQuestion.type ===
																"reordering-horizontal" ||
																editedQuestion.type ===
																	"reordering-vertical") && (
																<DndContext
																	sensors={sensors}
																	collisionDetection={closestCenter}
																	onDragEnd={(e) =>
																		handleDragEnd(e, questionId)
																	}
																>
																	{process.env.NODE_ENV === "development" && (
																		<div className="bg-yellow-50 p-2 mb-2 text-xs border border-yellow-200 rounded">
																			<strong>Debug Info:</strong>
																			<div>
																				Items Length:{" "}
																				{
																					(editedQuestion as ReorderingQuestion)
																						.items.length
																				}
																			</div>
																			<div>
																				correctOrder Length:{" "}
																				{
																					(editedQuestion as ReorderingQuestion)
																						.correctOrder.length
																				}
																			</div>
																			<div>
																				correctOrder:{" "}
																				{JSON.stringify(
																					(editedQuestion as ReorderingQuestion)
																						.correctOrder
																				)}
																			</div>
																		</div>
																	)}

																	<SortableContext
																		items={Array.from(
																			{
																				length: (
																					editedQuestion as ReorderingQuestion
																				).correctOrder.length,
																			},
																			(_, i) => i.toString()
																		)} // Use visual indices as IDs
																		strategy={verticalListSortingStrategy}
																	>
																		<div className="space-y-3">
																			<Label>
																				Elemente (Drag & Drop zum Sortieren)
																			</Label>
																			<p className="text-xs text-muted-foreground mb-2">
																				Gib die Elemente ein und ordne sie per
																				Drag & Drop in die richtige Reihenfolge.
																			</p>
																			<div className="bg-primary/10 border-l-4 border-primary p-3 mb-3 rounded">
																				<p className="text-sm font-medium mb-1">
																					<strong>
																						Wichtig zur Reihenfolge:
																					</strong>
																				</p>
																				<ul className="text-sm list-disc pl-4 space-y-1">
																					<li>
																						Die{" "}
																						<strong>
																							aktuelle Reihenfolge
																						</strong>{" "}
																						der Elemente (von oben nach unten)
																						wird als{" "}
																						<strong>korrekte Lösung</strong>{" "}
																						gespeichert.
																					</li>
																					<li>
																						Verschiebe die Elemente durch Drag &
																						Drop in die Reihenfolge, die für
																						Lernende die{" "}
																						<strong>richtige Lösung</strong>{" "}
																						darstellen soll.
																					</li>
																				</ul>
																			</div>

																			{/* Reordering Items */}
																			{(
																				editedQuestion as ReorderingQuestion
																			).correctOrder.map(
																				(orderValue, visualIndex) => {
																					// orderValue is the original index of the item in the .items array
																					const itemIndex = Number(orderValue);

																					// Skip invalid indices
																					if (
																						itemIndex < 0 ||
																						itemIndex >=
																							(
																								editedQuestion as ReorderingQuestion
																							).items.length
																					) {
																						console.error(
																							`Invalid item index ${itemIndex} for visual position ${visualIndex}`
																						);
																						return null;
																					}

																					const item = (
																						editedQuestion as ReorderingQuestion
																					).items[itemIndex];
																					const isGap =
																						(
																							editedQuestion as ReorderingQuestion
																						).isGap?.[itemIndex] ?? false;

																					return (
																						<SortableReorderItem
																							key={`item-${visualIndex}-${orderValue}`}
																							id={visualIndex}
																						>
																							<div className="flex items-center space-x-2 bg-background border rounded p-2">
																								{/* Drag Handle */}
																								<div className="cursor-grab h-8 w-6 flex items-center justify-center">
																									<GripVertical className="h-4 w-4 text-muted-foreground" />
																								</div>

																								{/* Text Input - using plain HTML input */}
																								<div className="flex-1">
																									<input
																										type="text"
																										className={`w-full p-2 border rounded ${
																											isGap
																												? "opacity-50 italic border-dashed border-primary"
																												: ""
																										}`}
																										value={item}
																										placeholder={`Element ${
																											visualIndex + 1
																										}`}
																										onChange={(e) =>
																											handleEditReorderItemChange(
																												questionId,
																												itemIndex,
																												e.target.value
																											)
																										}
																										disabled={isSaving || isGap}
																									/>
																								</div>

																								{/* Gap Toggle */}
																								<Button
																									variant="outline"
																									size="sm"
																									className="whitespace-nowrap"
																									onClick={() =>
																										toggleEditReorderItemGap(
																											questionId,
																											itemIndex
																										)
																									}
																									title={
																										isGap
																											? "Als normales Element markieren"
																											: "Als Lücke markieren"
																									}
																									disabled={isSaving}
																								>
																									{isGap
																										? "Ist Lücke"
																										: "Keine Lücke"}
																								</Button>

																								{/* Remove Button */}
																								<Button
																									variant="ghost"
																									size="icon"
																									onClick={() =>
																										removeEditReorderItem(
																											questionId,
																											itemIndex
																										)
																									}
																									disabled={
																										(
																											editedQuestion as ReorderingQuestion
																										).items.length <= 2 ||
																										isSaving
																									}
																								>
																									<X className="h-4 w-4" />
																								</Button>
																							</div>
																						</SortableReorderItem>
																					);
																				}
																			)}

																			{/* Add Item Button */}
																			<Button
																				variant="outline"
																				size="sm"
																				onClick={() =>
																					addEditReorderItem(questionId)
																				}
																				disabled={isSaving}
																				className="mt-2"
																			>
																				<Plus className="h-4 w-4 mr-1" />{" "}
																				Element hinzufügen
																			</Button>
																		</div>
																	</SortableContext>
																</DndContext>
															)}
														</div>
													)}

													{/* Common Editable Fields: Time, Points, Multiplier (moved outside conditional blocks) */}
													<Separator className="my-4" />
													<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
														<div className="grid gap-2">
															<Label htmlFor={`q-time-${questionId}`}>
																Zeitlimit (Sekunden)
															</Label>
															<input
																id={`q-time-${questionId}`}
																type="number"
																min="5"
																className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
																value={
																	editedQuestion.timeLimit !== undefined
																		? editedQuestion.timeLimit
																		: ""
																}
																placeholder={`Standard: ${test.defaultTimePerQuestion}`}
																onChange={(e) => {
																	const val = e.target.value;
																	console.log(`Updating timeLimit: ${val}`);
																	// Allow empty value (to use test default) or valid number
																	const newValue =
																		val === "" ? undefined : parseInt(val);
																	setEditingQuestions((prev) => ({
																		...prev,
																		[questionId]: {
																			...prev[questionId],
																			timeLimit: newValue,
																		},
																	}));
																}}
															/>
															<p className="text-xs text-muted-foreground">
																Leer lassen für Standardwert (
																{test.defaultTimePerQuestion} Sek.)
															</p>
														</div>
														<div className="grid gap-2">
															<Label htmlFor={`q-points-${questionId}`}>
																Punkte
															</Label>
															<input
																id={`q-points-${questionId}`}
																type="number"
																min="1"
																className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
																value={
																	editedQuestion.points !== undefined
																		? editedQuestion.points
																		: ""
																}
																placeholder={`Standard: ${test.defaultCreditPoints}`}
																onChange={(e) => {
																	const val = e.target.value;
																	console.log(`Updating points: ${val}`);
																	const newValue =
																		val === "" ? undefined : parseInt(val);
																	setEditingQuestions((prev) => ({
																		...prev,
																		[questionId]: {
																			...prev[questionId],
																			points: newValue,
																		},
																	}));
																}}
															/>
															<p className="text-xs text-muted-foreground">
																Leer lassen für Standardwert (
																{test.defaultCreditPoints} Punkte)
															</p>
														</div>
														<div className="grid gap-2">
															<Label htmlFor={`q-multiplier-${questionId}`}>
																Multiplikator
															</Label>
															<input
																id={`q-multiplier-${questionId}`}
																type="number"
																min="1"
																step="0.1"
																className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
																value={
																	editedQuestion.multiplier !== undefined
																		? editedQuestion.multiplier
																		: ""
																}
																placeholder={`Standard: ${test.defaultMultiplier}`}
																onChange={(e) => {
																	const val = e.target.value;
																	console.log(`Updating multiplier: ${val}`);
																	const newValue =
																		val === "" ? undefined : parseFloat(val);
																	setEditingQuestions((prev) => ({
																		...prev,
																		[questionId]: {
																			...prev[questionId],
																			multiplier: newValue,
																		},
																	}));
																}}
															/>
															<p className="text-xs text-muted-foreground">
																Leer lassen für Standardwert (
																{test.defaultMultiplier}x)
															</p>
														</div>
													</div>

													{/* Save Button for this specific question */}
													<div className="flex justify-end space-x-2 pt-4">
														<Button
															size="sm"
															onClick={() => handleQuestionUpdate(questionId)}
															disabled={isSaving}
														>
															<Save className="h-4 w-4 mr-1" />
															Änderungen speichern
														</Button>
													</div>
												</AccordionContent>
											</AccordionItem>
										);
									})}
								</Accordion>
							)}

							{/* New Question Editor */}
							{showQuestionEditor && (
								<div className="mt-6 border rounded-md p-4">
									<div className="flex justify-between items-center mb-4">
										<h3 className="text-lg font-medium">
											Neue Frage erstellen
										</h3>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => setShowQuestionEditor(false)}
										>
											<X className="h-4 w-4" />
										</Button>
									</div>

									<div className="space-y-4">
										{/* Question type selector and basic fields - simplified */}
										<div className="flex justify-end space-x-2 pt-4">
											<Button
												variant="outline"
												onClick={() => setShowQuestionEditor(false)}
												disabled={isSaving}
											>
												Abbrechen
											</Button>
											<Button
												onClick={handleAddQuestion}
												disabled={isSaving || !newQuestion.text}
											>
												{isSaving ? "Speichern..." : "Frage hinzufügen"}
											</Button>
										</div>
									</div>
								</div>
							)}
						</CardContent>
						<CardFooter>
							{!showQuestionEditor && (
								<Button
									className="w-full"
									variant="outline"
									onClick={() => setShowQuestionEditor(true)}
								>
									<Plus className="h-4 w-4 mr-1" />
									Neue Frage hinzufügen
								</Button>
							)}
						</CardFooter>
					</Card>
				</div>
			</div>
		</AuthRequired>
	);
};

export default EditTestStaticClient;
