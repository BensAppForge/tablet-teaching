"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Loader2,
	Plus,
	Trash,
	ArrowLeft,
	ChevronUp,
	ChevronDown,
} from "lucide-react";
import {
	createTest,
	getTeacherTests,
	Test,
	MultipleChoiceQuestion,
	TrueFalseQuestion,
	GapFillQuestion,
	MatchingQuestion,
	ReorderingQuestion,
	Question,
	QuestionType,
	CEFRLevel,
} from "@/lib/firebase/tests";
import { FEATURE_LIMITS } from "@/lib/firebase/teachers";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import AuthRequired from "@/components/AuthRequired";
import Xarrow from "react-xarrows";

const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LANGUAGES = [
	"Deutsch",
	"Englisch",
	"Französisch",
	"Spanisch",
	"Italienisch",
];

// Add a palette of colors that work in both light and dark mode
const CONNECTION_COLORS = [
	"rgb(var(--primary))",
	"rgb(239, 68, 68)",
	"rgb(59, 130, 246)",
	"rgb(16, 185, 129)",
	"rgb(245, 158, 11)",
	"rgb(168, 85, 247)",
];

const CreateTestPage: React.FC = () => {
	const router = useRouter();
	const { toast } = useToast();
	const { currentUser, featureRestrictions } = useAuth();
	const [loading, setLoading] = useState(false);
	const [existingTests, setExistingTests] = useState<Test[]>([]);
	const [hasReachedLimit, setHasReachedLimit] = useState(false);

	// Test data state
	const [testData, setTestData] = useState<Partial<Test>>({
		title: "",
		description: "",
		targetLanguage: "Englisch",
		cefrLevel: "B1",
		defaultTimePerQuestion: 10,
		defaultCreditPoints: 1,
		defaultMultiplier: 1,
		isAIGenerated: false,
	});

	// Replace the question state with a general one that can handle all question types
	const [currentQuestionType, setCurrentQuestionType] =
		useState<QuestionType>("multiple-choice");
	const [questions, setQuestions] = useState<Question[]>([]);

	const [currentQuestion, setCurrentQuestion] = useState<Question>({
		type: "multiple-choice",
		text: "",
		options: ["", "", ""],
		correctOption: 0,
		timeLimit: 10,
		points: 1,
		multiplier: 1,
	} as MultipleChoiceQuestion);

	// Additional state for gap-fill interactive editing
	const [gapTextInput, setGapTextInput] = useState("");
	const [selectedText, setSelectedText] = useState("");
	const [gapsCreated, setGapsCreated] = useState<
		{ start: number; end: number; text: string }[]
	>([]);

	// Fetch existing tests when component loads
	useEffect(() => {
		const fetchExistingTests = async () => {
			if (!currentUser) return;

			try {
				const tests = await getTeacherTests(currentUser.uid);
				setExistingTests(tests);
				console.log(`Teacher has ${tests.length} existing tests`);

				// Check if the teacher has reached their test limit
				if (
					tests.length >= featureRestrictions.maxTests &&
					featureRestrictions.maxTests !== Infinity
				) {
					setHasReachedLimit(true);
					toast({
						title: "Test-Limit erreicht",
						description: `Sie haben das Limit von ${featureRestrictions.maxTests} Tests für Ihr Konto erreicht. Upgrade auf Premium für unbegrenzte Tests.`,
						variant: "destructive",
					});
				}
			} catch (error) {
				console.error("Error fetching existing tests:", error);
			}
		};

		fetchExistingTests();
	}, [currentUser, featureRestrictions.maxTests, toast]);

	// Effect to update question defaults when testData defaults change
	useEffect(() => {
		setCurrentQuestion((prev) => ({
			...prev,
			timeLimit: testData.defaultTimePerQuestion,
			points: testData.defaultCreditPoints,
			multiplier: testData.defaultMultiplier,
		}));
	}, [
		testData.defaultTimePerQuestion,
		testData.defaultCreditPoints,
		testData.defaultMultiplier,
	]);

	const handleTestDataChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target;
		setTestData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSelectChange = (name: string, value: string) => {
		setTestData((prev) => ({ ...prev, [name]: value }));
	};

	const handleQuestionTypeChange = (type: QuestionType) => {
		setCurrentQuestionType(type);

		// Create a new question of the selected type with default values
		let newQuestion: Question;

		switch (type) {
			case "multiple-choice":
				newQuestion = {
					type: "multiple-choice",
					text: "",
					options: ["", "", ""],
					correctOption: 0,
					timeLimit: testData.defaultTimePerQuestion,
					points: testData.defaultCreditPoints,
					multiplier: testData.defaultMultiplier,
				} as MultipleChoiceQuestion;
				break;

			case "true-false":
				newQuestion = {
					type: "true-false",
					text: "",
					isTrue: true,
					timeLimit: testData.defaultTimePerQuestion,
					points: testData.defaultCreditPoints,
					multiplier: testData.defaultMultiplier,
				} as TrueFalseQuestion;
				break;

			case "gap-fill":
				newQuestion = {
					type: "gap-fill",
					text: "",
					gaps: [""],
					distractors: [],
					timeLimit: testData.defaultTimePerQuestion,
					points: testData.defaultCreditPoints,
					multiplier: testData.defaultMultiplier,
				} as GapFillQuestion;
				break;

			case "matching":
				newQuestion = {
					type: "matching",
					text: "",
					leftItems: ["", ""],
					rightItems: ["", ""],
					correctMatches: [0, 1],
					distractors: [],
					timeLimit: testData.defaultTimePerQuestion,
					points: testData.defaultCreditPoints,
					multiplier: testData.defaultMultiplier,
				} as MatchingQuestion;
				break;

			case "reordering-horizontal":
			case "reordering-vertical":
				newQuestion = {
					type: type,
					text: "",
					items: ["", ""],
					correctOrder: [0, 1],
					isGap: [false, false],
					timeLimit: testData.defaultTimePerQuestion,
					points: testData.defaultCreditPoints,
					multiplier: testData.defaultMultiplier,
				} as ReorderingQuestion;
				break;

			default:
				newQuestion = {
					type: "multiple-choice",
					text: "",
					options: ["", "", ""],
					correctOption: 0,
					timeLimit: testData.defaultTimePerQuestion,
					points: testData.defaultCreditPoints,
					multiplier: testData.defaultMultiplier,
				} as MultipleChoiceQuestion;
		}

		setCurrentQuestion(newQuestion);
	};

	const handleQuestionTextChange = (
		e: React.ChangeEvent<HTMLTextAreaElement>
	) => {
		setCurrentQuestion((prev) => ({ ...prev, text: e.target.value }));
	};

	const handleOptionChange = (index: number, value: string) => {
		if (currentQuestion.type === "multiple-choice") {
			const mcQuestion = currentQuestion as MultipleChoiceQuestion;
			const newOptions = [...mcQuestion.options];
			newOptions[index] = value;
			setCurrentQuestion(
				(prev) =>
					({
						...prev,
						options: newOptions,
					} as MultipleChoiceQuestion)
			);
		}
	};

	const handleCorrectOptionChange = (value: string) => {
		if (currentQuestion.type === "multiple-choice") {
			setCurrentQuestion(
				(prev) =>
					({
						...prev,
						correctOption: parseInt(value),
					} as MultipleChoiceQuestion)
			);
		}
	};

	const addOption = () => {
		if (currentQuestion.type === "multiple-choice") {
			const mcQuestion = currentQuestion as MultipleChoiceQuestion;
			if (mcQuestion.options.length < 4) {
				setCurrentQuestion(
					(prev) =>
						({
							...prev,
							options: [...(prev as MultipleChoiceQuestion).options, ""],
						} as MultipleChoiceQuestion)
				);
			}
		}
	};

	const removeOption = (index: number) => {
		if (currentQuestion.type === "multiple-choice") {
			const mcQuestion = currentQuestion as MultipleChoiceQuestion;
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

				setCurrentQuestion(
					(prev) =>
						({
							...prev,
							options: newOptions,
							correctOption,
						} as MultipleChoiceQuestion)
				);
			}
		}
	};

	const handleSaveQuestion = () => {
		// Add the current question to the questions array
		setQuestions((prev) => [...prev, currentQuestion]);

		// Reset the current question to a new one of the same type
		handleQuestionTypeChange(currentQuestionType);

		toast({
			title: "Frage hinzugefügt",
			description: "Die Frage wurde zum Test hinzugefügt.",
		});
	};

	const handleBackToDashboard = () => {
		router.push("/teacher");
	};

	const handleSubmit = async () => {
		if (!currentUser) {
			toast({
				title: "Nicht angemeldet",
				description: "Sie müssen angemeldet sein, um einen Test zu erstellen.",
				variant: "destructive",
			});
			return;
		}

		if (hasReachedLimit) {
			toast({
				title: "Test-Limit erreicht",
				description:
					"Sie haben Ihr Test-Limit erreicht. Upgrade auf Premium für mehr Tests.",
				variant: "destructive",
			});
			return;
		}

		// Check if we have at least one question or if there's a current question with content
		if (questions.length === 0) {
			toast({
				title: "Keine Fragen",
				description: "Bitte fügen Sie mindestens eine Frage hinzu.",
				variant: "destructive",
			});
			return;
		}

		// If the current test has a title
		if (!testData.title) {
			toast({
				title: "Kein Titel",
				description: "Bitte geben Sie einen Titel für den Test ein.",
				variant: "destructive",
			});
			return;
		}

		setLoading(true);

		try {
			// Create a full test object from the partial one
			const fullTestData: Test = {
				...(testData as Test),
				teacherId: currentUser.uid,
				isAIGenerated: false,
			};

			// Save test to Firestore
			await createTest(fullTestData, questions);

			toast({
				title: "Test erstellt",
				description: "Ihr Test wurde erfolgreich gespeichert.",
			});

			// Redirect to dashboard
			router.push("/teacher");
		} catch (error) {
			console.error("Error creating test:", error);
			toast({
				title: "Fehler",
				description: "Der Test konnte nicht gespeichert werden.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleTrueFalseChange = (value: string) => {
		if (currentQuestion.type === "true-false") {
			setCurrentQuestion(
				(prev) =>
					({
						...prev,
						isTrue: value === "true",
					} as TrueFalseQuestion)
			);
		}
	};

	const handleGapChange = (index: number, value: string) => {
		if (currentQuestion.type === "gap-fill") {
			const gapQuestion = currentQuestion as GapFillQuestion;
			const newGaps = [...gapQuestion.gaps];
			newGaps[index] = value;
			setCurrentQuestion(
				(prev) =>
					({
						...prev,
						gaps: newGaps,
					} as GapFillQuestion)
			);
		}
	};

	const handleDistractorChange = (index: number, value: string) => {
		if (currentQuestion.type === "gap-fill") {
			const gapQuestion = currentQuestion as GapFillQuestion;
			const newDistractors = [...(gapQuestion.distractors || [])];
			newDistractors[index] = value;
			setCurrentQuestion(
				(prev) =>
					({
						...prev,
						distractors: newDistractors,
					} as GapFillQuestion)
			);
		}
	};

	const addGap = () => {
		if (currentQuestion.type === "gap-fill") {
			const gapQuestion = currentQuestion as GapFillQuestion;
			setCurrentQuestion(
				(prev) =>
					({
						...prev,
						gaps: [...gapQuestion.gaps, ""],
					} as GapFillQuestion)
			);
		}
	};

	const removeGap = (index: number) => {
		if (currentQuestion.type === "gap-fill") {
			const gapQuestion = currentQuestion as GapFillQuestion;
			if (gapQuestion.gaps.length > 1) {
				const newGaps = [...gapQuestion.gaps];
				newGaps.splice(index, 1);
				setCurrentQuestion(
					(prev) =>
						({
							...prev,
							gaps: newGaps,
						} as GapFillQuestion)
				);
			}
		}
	};

	const addDistractor = () => {
		if (currentQuestion.type === "gap-fill") {
			const gapQuestion = currentQuestion as GapFillQuestion;
			setCurrentQuestion(
				(prev) =>
					({
						...prev,
						distractors: [...(gapQuestion.distractors || []), ""],
					} as GapFillQuestion)
			);
		}
	};

	const removeDistractor = (index: number) => {
		if (currentQuestion.type === "gap-fill") {
			const gapQuestion = currentQuestion as GapFillQuestion;
			if (gapQuestion.distractors && gapQuestion.distractors.length > 0) {
				const newDistractors = [...gapQuestion.distractors];
				newDistractors.splice(index, 1);
				setCurrentQuestion(
					(prev) =>
						({
							...prev,
							distractors: newDistractors,
						} as GapFillQuestion)
				);
			}
		}
	};

	const handleLeftItemChange = (index: number, value: string) => {
		if (currentQuestion.type === "matching") {
			const matchingQuestion = currentQuestion as MatchingQuestion;
			const newLeftItems = [...matchingQuestion.leftItems];
			newLeftItems[index] = value;
			setCurrentQuestion(
				(prev) =>
					({
						...prev,
						leftItems: newLeftItems,
					} as MatchingQuestion)
			);
		}
	};

	const handleRightItemChange = (index: number, value: string) => {
		if (currentQuestion.type === "matching") {
			const matchingQuestion = currentQuestion as MatchingQuestion;
			const newRightItems = [...matchingQuestion.rightItems];
			newRightItems[index] = value;
			setCurrentQuestion(
				(prev) =>
					({
						...prev,
						rightItems: newRightItems,
					} as MatchingQuestion)
			);
		}
	};

	const handleMatchChange = (leftIndex: number, rightIndex: number) => {
		if (currentQuestion.type === "matching") {
			const matchingQuestion = currentQuestion as MatchingQuestion;
			const newCorrectMatches = [...matchingQuestion.correctMatches];
			newCorrectMatches[leftIndex] = rightIndex;
			setCurrentQuestion(
				(prev) =>
					({
						...prev,
						correctMatches: newCorrectMatches,
					} as MatchingQuestion)
			);
		}
	};

	const addMatchingPair = () => {
		if (currentQuestion.type === "matching") {
			const matchingQuestion = currentQuestion as MatchingQuestion;
			setCurrentQuestion(
				(prev) =>
					({
						...prev,
						leftItems: [...matchingQuestion.leftItems, ""],
						rightItems: [...matchingQuestion.rightItems, ""],
						correctMatches: [
							...matchingQuestion.correctMatches,
							matchingQuestion.correctMatches.length,
						],
					} as MatchingQuestion)
			);
		}
	};

	const removeMatchingPair = (index: number) => {
		if (currentQuestion.type === "matching") {
			const matchingQuestion = currentQuestion as MatchingQuestion;
			if (matchingQuestion.leftItems.length > 2) {
				const newLeftItems = [...matchingQuestion.leftItems];
				const newRightItems = [...matchingQuestion.rightItems];
				const newCorrectMatches = [...matchingQuestion.correctMatches];

				newLeftItems.splice(index, 1);
				newRightItems.splice(index, 1);
				newCorrectMatches.splice(index, 1);

				// Update correctMatches indices if necessary
				for (let i = 0; i < newCorrectMatches.length; i++) {
					if (newCorrectMatches[i] >= index) {
						newCorrectMatches[i]--;
					}
				}

				setCurrentQuestion(
					(prev) =>
						({
							...prev,
							leftItems: newLeftItems,
							rightItems: newRightItems,
							correctMatches: newCorrectMatches,
						} as MatchingQuestion)
				);
			}
		}
	};

	const handleReorderItemChange = (index: number, value: string) => {
		if (
			currentQuestion.type === "reordering-horizontal" ||
			currentQuestion.type === "reordering-vertical"
		) {
			const reorderQuestion = currentQuestion as ReorderingQuestion;
			const newItems = [...reorderQuestion.items];
			newItems[index] = value;
			setCurrentQuestion(
				(prev) =>
					({
						...prev,
						items: newItems,
					} as ReorderingQuestion)
			);
		}
	};

	const handleReorderChange = (index: number, newPosition: number) => {
		if (
			currentQuestion.type === "reordering-horizontal" ||
			currentQuestion.type === "reordering-vertical"
		) {
			const reorderQuestion = currentQuestion as ReorderingQuestion;
			const newCorrectOrder = [...reorderQuestion.correctOrder];

			// Find the index that currently has the newPosition value
			const swapIndex = newCorrectOrder.findIndex((pos) => pos === newPosition);
			if (swapIndex !== -1) {
				// Swap the values
				const temp = newCorrectOrder[index];
				newCorrectOrder[index] = newPosition;
				newCorrectOrder[swapIndex] = temp;
			}

			setCurrentQuestion(
				(prev) =>
					({
						...prev,
						correctOrder: newCorrectOrder,
					} as ReorderingQuestion)
			);
		}
	};

	const addReorderItem = () => {
		if (
			currentQuestion.type === "reordering-horizontal" ||
			currentQuestion.type === "reordering-vertical"
		) {
			const reorderQuestion = currentQuestion as ReorderingQuestion;
			const newItems = [...reorderQuestion.items, ""];
			const newPosition = reorderQuestion.items.length;
			const newIsGap = [
				...(reorderQuestion.isGap || reorderQuestion.items.map(() => false)),
				false,
			];

			setCurrentQuestion(
				(prev) =>
					({
						...prev,
						items: newItems,
						correctOrder: [...reorderQuestion.correctOrder, newPosition],
						isGap: newIsGap,
					} as ReorderingQuestion)
			);
		}
	};

	const removeReorderItem = (index: number) => {
		if (
			(currentQuestion.type === "reordering-horizontal" ||
				currentQuestion.type === "reordering-vertical") &&
			(currentQuestion as ReorderingQuestion).items.length > 2
		) {
			const reorderQuestion = currentQuestion as ReorderingQuestion;
			const newItems = [...reorderQuestion.items];
			const removedPosition = reorderQuestion.correctOrder[index];
			const newCorrectOrder = [...reorderQuestion.correctOrder];
			const newIsGap = [
				...(reorderQuestion.isGap || reorderQuestion.items.map(() => false)),
			];

			// Remove the item and its position
			newItems.splice(index, 1);
			newCorrectOrder.splice(index, 1);
			newIsGap.splice(index, 1);

			// Update positions greater than the removed one
			for (let i = 0; i < newCorrectOrder.length; i++) {
				if (newCorrectOrder[i] > removedPosition) {
					newCorrectOrder[i]--;
				}
			}

			setCurrentQuestion(
				(prev) =>
					({
						...prev,
						items: newItems,
						correctOrder: newCorrectOrder,
						isGap: newIsGap,
					} as ReorderingQuestion)
			);
		}
	};

	// Function to handle text selection in gap-fill editor
	const handleTextSelection = () => {
		const selection = window.getSelection();
		if (selection && selection.toString().trim() !== "") {
			setSelectedText(selection.toString());
		}
	};

	// Function to convert selected text to gap
	const convertToGap = () => {
		if (selectedText && gapTextInput) {
			const newGapQuestion = currentQuestion as GapFillQuestion;
			const selectionStart = gapTextInput.indexOf(selectedText);

			if (selectionStart !== -1) {
				// Check if this gap overlaps with existing gaps
				const overlaps = gapsCreated.some(
					(gap) =>
						(selectionStart >= gap.start && selectionStart < gap.end) ||
						(selectionStart + selectedText.length > gap.start &&
							selectionStart + selectedText.length <= gap.end) ||
						(gap.start >= selectionStart &&
							gap.start < selectionStart + selectedText.length)
				);

				if (!overlaps) {
					// Add the gap word to gaps array
					const newGaps = [...newGapQuestion.gaps];
					if (newGaps[0] === "") {
						newGaps[0] = selectedText; // Use the first empty gap if it exists
					} else {
						newGaps.push(selectedText); // Otherwise add to the end
					}

					// Add to gapsCreated for tracking
					const newGapsCreated = [
						...gapsCreated,
						{
							start: selectionStart,
							end: selectionStart + selectedText.length,
							text: selectedText,
						},
					];

					// Sort by position in text
					newGapsCreated.sort((a, b) => a.start - b.start);

					// Generate text with placeholders
					let newText = gapTextInput;
					let offset = 0;

					newGapsCreated.forEach((gap, index) => {
						const gapMarker = `[*${index + 1}*]`;
						const actualStart = gap.start + offset;
						newText =
							newText.substring(0, actualStart) +
							gapMarker +
							newText.substring(actualStart + gap.text.length);
						offset += gapMarker.length - gap.text.length;
					});

					setCurrentQuestion(
						(prev) =>
							({
								...prev,
								text: newText,
								gaps: newGaps,
							} as GapFillQuestion)
					);

					setGapsCreated(newGapsCreated);
					setSelectedText("");
				} else {
					// Show an error or warning for overlapping gaps
					toast({
						title: "Überlappende Lücke",
						description: "Lücken dürfen sich nicht überlappen.",
						variant: "destructive",
					});
				}
			}
		}
	};

	// Function to reset gap text to original
	const resetGapText = () => {
		setGapTextInput("");
		setGapsCreated([]);
		setSelectedText("");
		setCurrentQuestion(
			(prev) =>
				({
					...prev,
					text: "",
					gaps: [""],
				} as GapFillQuestion)
		);
	};

	// Function to handle gap text input change
	const handleGapTextInputChange = (
		e: React.ChangeEvent<HTMLTextAreaElement>
	) => {
		setGapTextInput(e.target.value);

		// If we already have gaps, reset them when text changes
		if (gapsCreated.length > 0) {
			resetGapText();
		}
	};

	// Function to remove a gap
	const handleRemoveGapFromText = (gapIndex: number) => {
		if (currentQuestion.type === "gap-fill") {
			const gapQuestion = currentQuestion as GapFillQuestion;

			// Get the gap that's being removed
			const gapToRemove = gapsCreated[gapIndex];

			// Remove from gapsCreated
			const newGapsCreated = [...gapsCreated];
			newGapsCreated.splice(gapIndex, 1);

			// Remove from gaps array
			const newGaps = [...gapQuestion.gaps];
			newGaps.splice(gapIndex, 1);
			// If no gaps left, add an empty one
			if (newGaps.length === 0) {
				newGaps.push("");
			}

			// Regenerate text by restoring the original words
			// First convert current text back to original text with all gaps filled
			let originalText = gapTextInput;

			// Then regenerate the text with only the remaining gaps
			let newText = originalText;
			let offset = 0;

			// If we still have gaps, add them back to the text
			if (newGapsCreated.length > 0) {
				newGapsCreated.forEach((gap, index) => {
					const gapMarker = `[*${index + 1}*]`;
					const actualStart = gap.start + offset;
					newText =
						newText.substring(0, actualStart) +
						gapMarker +
						newText.substring(actualStart + gap.text.length);
					offset += gapMarker.length - gap.text.length;
				});
			}

			setCurrentQuestion(
				(prev) =>
					({
						...prev,
						text: newText,
						gaps: newGaps,
					} as GapFillQuestion)
			);

			setGapsCreated(newGapsCreated);
		}
	};

	// Add these functions for matching distractors

	const handleAddMatchingDistractor = () => {
		if (currentQuestion.type === "matching") {
			const matchingQuestion = currentQuestion as MatchingQuestion;
			setCurrentQuestion(
				(prev) =>
					({
						...prev,
						rightItems: [...matchingQuestion.rightItems],
						distractors: [...(matchingQuestion.distractors || []), ""],
					} as MatchingQuestion)
			);
		}
	};

	const handleMatchingDistractorChange = (index: number, value: string) => {
		if (currentQuestion.type === "matching") {
			const matchingQuestion = currentQuestion as MatchingQuestion;
			const newDistractors = [...(matchingQuestion.distractors || [])];
			newDistractors[index] = value;
			setCurrentQuestion(
				(prev) =>
					({
						...prev,
						distractors: newDistractors,
					} as MatchingQuestion)
			);
		}
	};

	const removeMatchingDistractor = (index: number) => {
		if (currentQuestion.type === "matching") {
			const matchingQuestion = currentQuestion as MatchingQuestion;
			if (
				matchingQuestion.distractors &&
				matchingQuestion.distractors.length > 0
			) {
				const newDistractors = [...matchingQuestion.distractors];
				newDistractors.splice(index, 1);
				setCurrentQuestion(
					(prev) =>
						({
							...prev,
							distractors: newDistractors,
						} as MatchingQuestion)
				);
			}
		}
	};

	// Add a function to toggle gap state for reordering items
	const toggleReorderItemGap = (index: number) => {
		if (
			currentQuestion.type === "reordering-horizontal" ||
			currentQuestion.type === "reordering-vertical"
		) {
			const reorderQuestion = currentQuestion as ReorderingQuestion;
			const newIsGap = [
				...(reorderQuestion.isGap || reorderQuestion.items.map(() => false)),
			];
			newIsGap[index] = !newIsGap[index];

			setCurrentQuestion(
				(prev) =>
					({
						...prev,
						isGap: newIsGap,
					} as ReorderingQuestion)
			);
		}
	};

	return (
		<div className="container max-w-3xl py-6 space-y-6">
			<h1 className="text-3xl font-bold">Test erstellen</h1>

			{hasReachedLimit && (
				<div className="bg-red-100 p-4 rounded-md text-red-800 dark:bg-red-900/20 dark:text-red-300">
					<h3 className="font-bold">Test-Limit erreicht</h3>
					<p>
						Sie haben das Limit von {featureRestrictions.maxTests} Tests für Ihr
						Konto erreicht. Upgrade auf Premium für unbegrenzte Tests.
					</p>
				</div>
			)}

			{/* Test General Settings */}
			<Card>
				<CardHeader>
					<CardTitle>Allgemeine Einstellungen</CardTitle>
					<CardDescription>
						Geben Sie die Grundeinstellungen für Ihren Test ein.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="title">Testtitel*</Label>
						<Input
							id="title"
							name="title"
							value={testData.title}
							onChange={handleTestDataChange}
							placeholder="z.B. Präsens und Präteritum"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Beschreibung</Label>
						<Textarea
							id="description"
							name="description"
							value={testData.description || ""}
							onChange={handleTestDataChange}
							placeholder="Optionale Beschreibung"
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="targetLanguage">Zielsprache</Label>
							<Select
								value={testData.targetLanguage}
								onValueChange={(value) =>
									handleSelectChange("targetLanguage", value)
								}
							>
								<SelectTrigger id="targetLanguage">
									<SelectValue placeholder="Sprache wählen" />
								</SelectTrigger>
								<SelectContent>
									{LANGUAGES.map((lang) => (
										<SelectItem key={lang} value={lang}>
											{lang}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="cefrLevel">CEFR-Level</Label>
							<Select
								value={testData.cefrLevel}
								onValueChange={(value) =>
									handleSelectChange("cefrLevel", value as CEFRLevel)
								}
							>
								<SelectTrigger id="cefrLevel">
									<SelectValue placeholder="Level wählen" />
								</SelectTrigger>
								<SelectContent>
									{CEFR_LEVELS.map((level) => (
										<SelectItem key={level} value={level}>
											{level}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="defaultTimePerQuestion">
							Zeit pro Frage (Sekunden)
						</Label>
						<div className="flex items-center gap-4">
							<Slider
								id="defaultTimePerQuestion"
								min={5}
								max={60}
								step={5}
								value={[testData.defaultTimePerQuestion || 10]}
								onValueChange={(value) => {
									setTestData((prev) => ({
										...prev,
										defaultTimePerQuestion: value[0],
									}));
								}}
								className="flex-1"
							/>
							<span className="w-12 text-center">
								{testData.defaultTimePerQuestion}s
							</span>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="defaultCreditPoints">Punkte pro Frage</Label>
						<div className="flex items-center gap-4">
							<Slider
								id="defaultCreditPoints"
								min={1}
								max={10}
								step={1}
								value={[testData.defaultCreditPoints || 1]}
								onValueChange={(value) => {
									setTestData((prev) => ({
										...prev,
										defaultCreditPoints: value[0],
									}));
								}}
								className="flex-1"
							/>
							<span className="w-12 text-center">
								{testData.defaultCreditPoints}
							</span>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="defaultMultiplier">Multiplikator pro Frage</Label>
						<div className="flex items-center gap-4">
							<Slider
								id="defaultMultiplier"
								min={0.5}
								max={4}
								step={0.5}
								value={[testData.defaultMultiplier || 1]}
								onValueChange={(value) => {
									setTestData((prev) => ({
										...prev,
										defaultMultiplier: value[0],
									}));
								}}
								className="flex-1"
							/>
							<span className="w-12 text-center">
								{testData.defaultMultiplier}x
							</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Question Type Selection */}
			<Card>
				<CardHeader>
					<CardTitle>Fragetyp auswählen</CardTitle>
					<CardDescription>
						Wählen Sie den Typ der Frage aus, die Sie hinzufügen möchten.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 gap-4">
						<Button
							variant={
								currentQuestionType === "multiple-choice"
									? "default"
									: "outline"
							}
							onClick={() => handleQuestionTypeChange("multiple-choice")}
							className="h-auto py-4 justify-start"
						>
							<div className="text-left">
								<div className="font-semibold">Multiple-Choice</div>
								<div className="text-sm text-muted-foreground">
									Frage mit 2-4 Antwortmöglichkeiten
								</div>
							</div>
						</Button>

						<Button
							variant={
								currentQuestionType === "true-false" ? "default" : "outline"
							}
							onClick={() => handleQuestionTypeChange("true-false")}
							className="h-auto py-4 justify-start"
						>
							<div className="text-left">
								<div className="font-semibold">Wahr/Falsch</div>
								<div className="text-sm text-muted-foreground">
									Einfache Wahr-Falsch-Frage
								</div>
							</div>
						</Button>

						<Button
							variant={
								currentQuestionType === "gap-fill" ? "default" : "outline"
							}
							onClick={() => handleQuestionTypeChange("gap-fill")}
							className="h-auto py-4 justify-start"
						>
							<div className="text-left">
								<div className="font-semibold">Lückentext</div>
								<div className="text-sm text-muted-foreground">
									Text mit auszufüllenden Lücken
								</div>
							</div>
						</Button>

						<Button
							variant={
								currentQuestionType === "matching" ? "default" : "outline"
							}
							onClick={() => handleQuestionTypeChange("matching")}
							className="h-auto py-4 justify-start"
						>
							<div className="text-left">
								<div className="font-semibold">Zuordnung</div>
								<div className="text-sm text-muted-foreground">
									Elemente einander zuordnen
								</div>
							</div>
						</Button>

						<Button
							variant={
								currentQuestionType === "reordering-horizontal"
									? "default"
									: "outline"
							}
							onClick={() => handleQuestionTypeChange("reordering-horizontal")}
							className="h-auto py-4 justify-start"
						>
							<div className="text-left">
								<div className="font-semibold">Umordnung (horizontal)</div>
								<div className="text-sm text-muted-foreground">
									Worte in die richtige Reihenfolge bringen
								</div>
							</div>
						</Button>

						<Button
							variant={
								currentQuestionType === "reordering-vertical"
									? "default"
									: "outline"
							}
							onClick={() => handleQuestionTypeChange("reordering-vertical")}
							className="h-auto py-4 justify-start"
						>
							<div className="text-left">
								<div className="font-semibold">Umordnung (vertikal)</div>
								<div className="text-sm text-muted-foreground">
									Z.B. Konjugationsschritte ordnen
								</div>
							</div>
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Question Editor Card */}
			<Card>
				<CardHeader>
					<CardTitle>
						{currentQuestionType === "multiple-choice" &&
							"Multiple-Choice Frage"}
						{currentQuestionType === "true-false" && "Wahr/Falsch Frage"}
						{currentQuestionType === "gap-fill" && "Lückentext Frage"}
						{currentQuestionType === "matching" && "Zuordnungsfrage"}
						{currentQuestionType === "reordering-horizontal" &&
							"Horizontale Umordnungsfrage"}
						{currentQuestionType === "reordering-vertical" &&
							"Vertikale Umordnungsfrage"}
					</CardTitle>
					<CardDescription>
						{currentQuestionType === "multiple-choice" &&
							"Erstellen Sie eine einfache Multiple-Choice Frage."}
						{currentQuestionType === "true-false" &&
							"Erstellen Sie eine einfache Wahr/Falsch Frage."}
						{currentQuestionType === "gap-fill" &&
							"Erstellen Sie einen Text mit auszufüllenden Lücken."}
						{currentQuestionType === "matching" &&
							"Erstellen Sie eine Frage, bei der Elemente einander zugeordnet werden."}
						{currentQuestionType === "reordering-horizontal" &&
							"Erstellen Sie eine Frage, bei der Wörter horizontal umgeordnet werden."}
						{currentQuestionType === "reordering-vertical" &&
							"Erstellen Sie eine Frage, bei der Elemente vertikal umgeordnet werden."}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="question-text">Fragetext</Label>
						<Textarea
							id="question-text"
							value={currentQuestion.text}
							onChange={handleQuestionTextChange}
							placeholder="Geben Sie den Fragetext ein"
						/>
					</div>

					{/* Per-question settings */}
					<div className="grid grid-cols-3 gap-4 border-t border-b py-4 my-4">
						<div className="space-y-2">
							<Label htmlFor="timeLimit">Zeit (Sekunden)</Label>
							<div className="flex items-center gap-2">
								<Input
									id="timeLimit"
									type="number"
									min={5}
									max={60}
									step={5}
									value={currentQuestion.timeLimit}
									onChange={(e) => {
										const value = parseInt(e.target.value);
										if (!isNaN(value) && value >= 5 && value <= 60) {
											setCurrentQuestion((prev) => ({
												...prev,
												timeLimit: value,
											}));
										}
									}}
									className="w-full"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="points">Punkte</Label>
							<div className="flex items-center gap-2">
								<Input
									id="points"
									type="number"
									min={1}
									max={10}
									step={1}
									value={currentQuestion.points}
									onChange={(e) => {
										const value = parseInt(e.target.value);
										if (!isNaN(value) && value >= 1 && value <= 10) {
											setCurrentQuestion((prev) => ({
												...prev,
												points: value,
											}));
										}
									}}
									className="w-full"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="multiplier">Multiplikator</Label>
							<div className="flex items-center gap-2">
								<Select
									value={currentQuestion.multiplier?.toString()}
									onValueChange={(value) => {
										setCurrentQuestion((prev) => ({
											...prev,
											multiplier: parseFloat(value),
										}));
									}}
								>
									<SelectTrigger id="multiplier">
										<SelectValue placeholder="×" />
									</SelectTrigger>
									<SelectContent>
										{[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4].map((value) => (
											<SelectItem key={value} value={value.toString()}>
												{value}×
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					{/* Multiple Choice Question Editor */}
					{currentQuestionType === "multiple-choice" && (
						<div className="space-y-2">
							<Label>Antwortmöglichkeiten</Label>
							<RadioGroup
								value={(
									currentQuestion as MultipleChoiceQuestion
								).correctOption.toString()}
								onValueChange={handleCorrectOptionChange}
							>
								{(currentQuestion as MultipleChoiceQuestion).options.map(
									(option, index) => (
										<div key={index} className="flex items-center gap-2">
											<RadioGroupItem
												value={index.toString()}
												id={`option-${index}`}
											/>
											<div className="flex-1">
												<Input
													value={option}
													onChange={(e) =>
														handleOptionChange(index, e.target.value)
													}
													placeholder={`Option ${index + 1}`}
												/>
											</div>
											{(currentQuestion as MultipleChoiceQuestion).options
												.length > 2 && (
												<Button
													variant="ghost"
													size="icon"
													onClick={() => removeOption(index)}
													disabled={
														index ===
														(currentQuestion as MultipleChoiceQuestion)
															.correctOption
													}
													title={
														index ===
														(currentQuestion as MultipleChoiceQuestion)
															.correctOption
															? "Die korrekte Antwort kann nicht gelöscht werden"
															: "Option entfernen"
													}
												>
													<Trash className="h-4 w-4" />
												</Button>
											)}
										</div>
									)
								)}
							</RadioGroup>

							{(currentQuestion as MultipleChoiceQuestion).options.length <
								4 && (
								<Button variant="outline" size="sm" onClick={addOption}>
									<Plus className="mr-2 h-4 w-4" />
									Option hinzufügen
								</Button>
							)}
						</div>
					)}

					{/* True/False Question Editor */}
					{currentQuestionType === "true-false" && (
						<div className="space-y-2">
							<Label>Richtige Antwort</Label>
							<RadioGroup
								value={
									(currentQuestion as TrueFalseQuestion).isTrue
										? "true"
										: "false"
								}
								onValueChange={handleTrueFalseChange}
							>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="true" id="answer-true" />
									<Label htmlFor="answer-true" className="cursor-pointer">
										Wahr
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="false" id="answer-false" />
									<Label htmlFor="answer-false" className="cursor-pointer">
										Falsch
									</Label>
								</div>
							</RadioGroup>
						</div>
					)}

					{/* Gap Fill Question Editor */}
					{currentQuestionType === "gap-fill" && (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label>Vollständiger Text</Label>
								<p className="text-sm text-muted-foreground">
									Geben Sie den kompletten Text ein und markieren Sie dann
									Wörter, die zu Lücken werden sollen.
								</p>
								<Textarea
									value={gapTextInput}
									onChange={handleGapTextInputChange}
									onMouseUp={handleTextSelection}
									placeholder="Geben Sie den vollständigen Text ein"
									className="min-h-[100px]"
								/>

								{selectedText && (
									<div className="flex items-center justify-between p-2 bg-muted rounded-md mt-2">
										<div>
											<span className="text-sm font-medium">Ausgewählt: </span>
											<span className="text-sm">"{selectedText}"</span>
										</div>
										<Button
											size="sm"
											onClick={convertToGap}
											className="ml-2"
											variant="default"
										>
											Als Lücke markieren
										</Button>
									</div>
								)}

								{gapsCreated.length > 0 && (
									<div className="mt-4">
										<Label>Vorschau mit Lücken</Label>
										<div className="p-3 border rounded-md mt-1 text-sm whitespace-pre-wrap">
											{(() => {
												// Display text with highlighted gaps
												let displayText = gapTextInput;
												let lastPos = 0;
												const elements = [];

												gapsCreated
													.sort((a, b) => a.start - b.start)
													.forEach((gap, index) => {
														// Text before gap
														if (gap.start > lastPos) {
															elements.push(
																<span key={`text-${index}`}>
																	{displayText.substring(lastPos, gap.start)}
																</span>
															);
														}

														// The gap itself
														elements.push(
															<span
																key={`gap-${index}`}
																className="bg-primary/20 px-1 mx-0.5 rounded-sm inline-flex items-center"
															>
																[*{index + 1}*]
																<Button
																	size="sm"
																	variant="ghost"
																	className="h-5 w-5 p-0 ml-1"
																	onClick={() => handleRemoveGapFromText(index)}
																	title="Lücke entfernen"
																>
																	<Trash className="h-3 w-3" />
																</Button>
															</span>
														);

														lastPos = gap.start + gap.text.length;
													});

												// Text after last gap
												if (lastPos < displayText.length) {
													elements.push(
														<span key="text-end">
															{displayText.substring(lastPos)}
														</span>
													);
												}

												return elements;
											})()}
										</div>
									</div>
								)}
							</div>

							<div className="space-y-2">
								<Label>Korrekte Antworten (Lücken)</Label>
								{(currentQuestion as GapFillQuestion).gaps.map((gap, index) => (
									<div key={index} className="flex items-center gap-2">
										<div className="w-[80px] text-sm text-muted-foreground">
											Lücke {index + 1}:
										</div>
										<div className="flex-1">
											<Input
												value={gap}
												onChange={(e) => handleGapChange(index, e.target.value)}
												placeholder={
													gapsCreated[index]?.text || `Lücke ${index + 1}`
												}
											/>
										</div>
										{(index > 0 ||
											(currentQuestion as GapFillQuestion).gaps.length > 1) && (
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleRemoveGapFromText(index)}
												title="Lücke entfernen"
											>
												<Trash className="h-4 w-4" />
											</Button>
										)}
									</div>
								))}
							</div>

							{/* Existing distractors section */}
							<div className="space-y-2">
								<Label>Distraktoren (optional)</Label>
								<p className="text-sm text-muted-foreground">
									Geben Sie falsche Antwortmöglichkeiten ein, die als Ablenkung
									dienen.
								</p>

								{(currentQuestion as GapFillQuestion).distractors?.map(
									(distractor, index) => (
										<div key={index} className="flex items-center gap-2">
											<div className="flex-1">
												<Input
													value={distractor}
													onChange={(e) =>
														handleDistractorChange(index, e.target.value)
													}
													placeholder={`Distraktor ${index + 1}`}
												/>
											</div>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => removeDistractor(index)}
												title="Distraktor entfernen"
											>
												<Trash className="h-4 w-4" />
											</Button>
										</div>
									)
								)}

								<Button
									variant="outline"
									size="sm"
									onClick={addDistractor}
									className="mt-2"
								>
									<Plus className="mr-2 h-4 w-4" />
									Distraktor hinzufügen
								</Button>
							</div>
						</div>
					)}

					{/* Matching Question Editor */}
					{currentQuestionType === "matching" && (
						<div className="space-y-4">
							<p className="text-sm text-muted-foreground">
								Erstellen Sie Paare von Elementen, die einander zugeordnet
								werden sollen.
							</p>

							<div className="grid grid-cols-[1fr_1fr] gap-10 relative py-4">
								<div className="space-y-2">
									<Label className="mb-4 block">Linke Elemente</Label>
									{(currentQuestion as MatchingQuestion).leftItems.map(
										(leftItem, index) => {
											const matchingQuestion =
												currentQuestion as MatchingQuestion;
											return (
												<div
													key={index}
													className="flex items-center gap-2 mb-4"
												>
													<div className="flex-1">
														<Input
															id={`left-item-${index}`}
															value={leftItem}
															onChange={(e) =>
																handleLeftItemChange(index, e.target.value)
															}
															placeholder={`Linkes Element ${index + 1}`}
														/>
													</div>
													{matchingQuestion.leftItems.length > 2 && (
														<Button
															variant="ghost"
															size="icon"
															onClick={() => removeMatchingPair(index)}
															title="Paar entfernen"
														>
															<Trash className="h-4 w-4" />
														</Button>
													)}
												</div>
											);
										}
									)}
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={addMatchingPair}
											className="mt-4"
										>
											<Plus className="mr-2 h-4 w-4" />
											Paar hinzufügen
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={handleAddMatchingDistractor}
											className="mt-4"
										>
											<Plus className="mr-2 h-4 w-4" />
											Distraktor hinzufügen
										</Button>
									</div>
								</div>

								<div className="space-y-2">
									<Label className="mb-4 block">Rechte Elemente</Label>
									{(currentQuestion as MatchingQuestion).rightItems.map(
										(rightItem, index) => {
											return (
												<div
													key={index}
													className="flex items-center gap-2 mb-4"
												>
													<div className="flex-1">
														<Input
															id={`right-item-${index}`}
															value={rightItem}
															onChange={(e) =>
																handleRightItemChange(index, e.target.value)
															}
															placeholder={`Rechtes Element ${index + 1}`}
														/>
													</div>
												</div>
											);
										}
									)}

									{/* Distractors for right side */}
									{(currentQuestion as MatchingQuestion).distractors?.map(
										(distractor, index) => (
											<div
												key={`distractor-${index}`}
												className="flex items-center gap-2 mb-4"
											>
												<div className="flex-1">
													<Input
														id={`distractor-${index}`}
														value={distractor}
														onChange={(e) =>
															handleMatchingDistractorChange(
																index,
																e.target.value
															)
														}
														placeholder={`Distraktor ${index + 1}`}
														className="border-dashed border-muted-foreground"
													/>
												</div>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => removeMatchingDistractor(index)}
													title="Distraktor entfernen"
												>
													<Trash className="h-4 w-4" />
												</Button>
												<div className="text-xs text-muted-foreground whitespace-nowrap">
													(Distraktor)
												</div>
											</div>
										)
									)}
								</div>

								{/* Draw connection lines between items */}
								{(currentQuestion as MatchingQuestion).leftItems.map(
									(_, index) => {
										const matchingQuestion =
											currentQuestion as MatchingQuestion;
										const rightIndex = matchingQuestion.correctMatches[index];
										const color =
											CONNECTION_COLORS[index % CONNECTION_COLORS.length];

										return (
											<Xarrow
												key={index}
												start={`left-item-${index}`}
												end={`right-item-${rightIndex}`}
												color={color}
												strokeWidth={2}
												path="smooth"
												curveness={0.8}
												startAnchor="right"
												endAnchor="left"
												headSize={6}
											/>
										);
									}
								)}
							</div>

							<div className="border-t pt-6 mt-6">
								<Label className="mb-4 block">Verknüpfungen</Label>
								<div className="space-y-2">
									{(currentQuestion as MatchingQuestion).leftItems.map(
										(leftItem, index) => {
											const matchingQuestion =
												currentQuestion as MatchingQuestion;
											const color =
												CONNECTION_COLORS[index % CONNECTION_COLORS.length];

											return (
												<div key={index} className="flex items-center gap-2">
													<div
														className="w-[180px] text-sm font-medium flex items-center"
														style={{ color }}
													>
														<div
															className="w-3 h-3 rounded-full mr-2"
															style={{ backgroundColor: color }}
														></div>
														{leftItem || `Element ${index + 1}`}:
													</div>
													<div className="flex-1">
														<Select
															value={matchingQuestion.correctMatches[
																index
															].toString()}
															onValueChange={(value) =>
																handleMatchChange(index, parseInt(value))
															}
														>
															<SelectTrigger style={{ borderColor: color }}>
																<SelectValue placeholder="Wählen..." />
															</SelectTrigger>
															<SelectContent>
																{matchingQuestion.rightItems.map(
																	(rightItem, rightIndex) => (
																		<SelectItem
																			key={rightIndex}
																			value={rightIndex.toString()}
																		>
																			{rightItem || `Element ${rightIndex + 1}`}
																		</SelectItem>
																	)
																)}
															</SelectContent>
														</Select>
													</div>
												</div>
											);
										}
									)}
								</div>
							</div>
						</div>
					)}

					{/* Reordering Question Editor */}
					{(currentQuestionType === "reordering-horizontal" ||
						currentQuestionType === "reordering-vertical") && (
						<div className="space-y-4">
							<p className="text-sm text-muted-foreground">
								{currentQuestionType === "reordering-horizontal"
									? "Erstellen Sie Elemente, die in die richtige Reihenfolge gebracht werden sollen (z.B. Wörter für einen Satz)."
									: "Erstellen Sie Elemente, die in die richtige Reihenfolge gebracht werden sollen (z.B. Schritte eines Prozesses)."}
							</p>

							<div className="space-y-2">
								{(currentQuestion as ReorderingQuestion).items.map(
									(item, index) => {
										const reorderQuestion =
											currentQuestion as ReorderingQuestion;
										const correctPosition = reorderQuestion.correctOrder[index];
										const isGap = reorderQuestion.isGap?.[index] || false;

										return (
											<div key={index} className="flex items-center gap-2">
												<Select
													value={correctPosition.toString()}
													onValueChange={(value) =>
														handleReorderChange(index, parseInt(value))
													}
												>
													<SelectTrigger className="w-20">
														<SelectValue placeholder="#" />
													</SelectTrigger>
													<SelectContent>
														{reorderQuestion.items.map((_, posIndex) => (
															<SelectItem
																key={posIndex}
																value={posIndex.toString()}
															>
																{posIndex + 1}.
															</SelectItem>
														))}
													</SelectContent>
												</Select>

												<div className="flex-1">
													<div className="flex items-center gap-2">
														<Input
															value={item}
															onChange={(e) =>
																handleReorderItemChange(index, e.target.value)
															}
															placeholder={`Element ${index + 1}`}
															onKeyDown={(e) => {
																// Add new item when Tab is pressed in the last input field
																if (
																	e.key === "Tab" &&
																	!e.shiftKey &&
																	index ===
																		(currentQuestion as ReorderingQuestion)
																			.items.length -
																			1
																) {
																	e.preventDefault();
																	addReorderItem();
																	// Focus the new input after a short delay to allow rendering
																	setTimeout(() => {
																		const newInput = document.getElementById(
																			`reordering-item-${index + 1}`
																		);
																		if (newInput) newInput.focus();
																	}, 10);
																}
															}}
															id={`reordering-item-${index}`}
															className={
																isGap ? "border-primary border-dashed" : ""
															}
														/>
														<Button
															variant={isGap ? "default" : "outline"}
															size="sm"
															onClick={() => toggleReorderItemGap(index)}
															title={
																isGap
																	? "Als normalen Text markieren"
																	: "Als auszufüllende Lücke markieren"
															}
															className="h-8 px-2"
														>
															<span className="text-xs">
																{isGap ? "Lücke" : "Text"}
															</span>
														</Button>
													</div>
												</div>

												{reorderQuestion.items.length > 2 && (
													<Button
														variant="ghost"
														size="icon"
														onClick={() => removeReorderItem(index)}
														title="Element entfernen"
													>
														<Trash className="h-4 w-4" />
													</Button>
												)}
											</div>
										);
									}
								)}

								<Button
									variant="outline"
									size="sm"
									onClick={addReorderItem}
									className="mt-4"
								>
									<Plus className="mr-2 h-4 w-4" />
									Element hinzufügen
								</Button>
							</div>

							<div className="bg-muted p-4 rounded-md">
								<h4 className="font-medium">
									Vorschau der korrekten Reihenfolge:
								</h4>
								<div
									className={
										currentQuestionType === "reordering-horizontal"
											? "flex flex-wrap gap-2 mt-2"
											: "space-y-2 mt-2"
									}
								>
									{(() => {
										const reorderQuestion =
											currentQuestion as ReorderingQuestion;
										const items = [...reorderQuestion.items];
										const correctOrder = [...reorderQuestion.correctOrder];
										const isGap =
											reorderQuestion.isGap || items.map(() => false);

										// Create array of [position, item, isGap] tuples with proper typing
										const tuples: [number, string, boolean][] = items.map(
											(item, index) => [correctOrder[index], item, isGap[index]]
										);

										// Sort by position
										tuples.sort((a, b) => a[0] - b[0]);

										// Return the sorted items
										return tuples.map(([position, item, isGapItem], index) => (
											<div
												key={index}
												className={
													currentQuestionType === "reordering-horizontal"
														? `px-2 py-1 bg-background border rounded-md ${
																isGapItem ? "border-dashed border-primary" : ""
														  }`
														: `p-2 bg-background border rounded-md flex items-center gap-2 ${
																isGapItem ? "border-dashed border-primary" : ""
														  }`
												}
											>
												{currentQuestionType === "reordering-vertical" && (
													<span className="font-bold">{index + 1}.</span>
												)}
												{isGapItem ? (
													<span className="text-muted-foreground italic">
														{item || "(Leere Lücke)"}
													</span>
												) : (
													item || "(Leer)"
												)}
											</div>
										));
									})()}
								</div>
							</div>
						</div>
					)}

					{/* No editor message for types not yet implemented */}
					{![
						"multiple-choice",
						"true-false",
						"gap-fill",
						"matching",
						"reordering-horizontal",
						"reordering-vertical",
					].includes(currentQuestionType) && (
						<div className="p-4 bg-muted rounded-md text-center">
							<p>
								Editor für {currentQuestionType} wird in Kürze implementiert.
							</p>
						</div>
					)}
				</CardContent>
				<CardFooter>
					<Button onClick={handleSaveQuestion}>
						Frage zum Test hinzufügen
					</Button>
				</CardFooter>
			</Card>

			{/* Questions List */}
			{questions.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Hinzugefügte Fragen ({questions.length})</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{questions.map((q, index) => (
								<div key={index} className="p-3 border rounded-md">
									<div className="font-medium">
										Frage {index + 1}: {q.type}
									</div>
									<div className="text-sm mt-1 truncate">{q.text}</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			<div className="flex justify-between">
				<Button variant="outline" onClick={handleBackToDashboard}>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Zurück zum Dashboard
				</Button>

				<Button
					onClick={handleSubmit}
					disabled={loading || questions.length === 0}
				>
					{loading ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Speichern...
						</>
					) : (
						"Test speichern"
					)}
				</Button>
			</div>
		</div>
	);
};

// Create a wrapper component that includes the AuthRequired check
const CreateTestPageWithAuth: React.FC = () => {
	return (
		<AuthRequired>
			<CreateTestPage />
		</AuthRequired>
	);
};

export default CreateTestPageWithAuth;
