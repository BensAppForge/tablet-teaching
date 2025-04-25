"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash, Plus, AlertCircle, Check } from "lucide-react";
import { MatchingQuestion } from "@/lib/firebase/tests";
import { motion, AnimatePresence } from "framer-motion";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardFooter,
} from "@/components/ui/card";
import Xarrow from "react-xarrows";

interface MatchingEditorProps {
	question: MatchingQuestion;
	onChange: (question: MatchingQuestion) => void;
	onDelete?: () => void;
	showDelete?: boolean;
}

// Array of 8 distinct colors for the connections
type Connection = { leftIndex: number; rightIndex: number };
const CONNECTION_COLORS = [
	"#3b82f6", // Blue
	"#ef4444", // Red
	"#10b981", // Green
	"#f59e0b", // Amber
	"#8b5cf6", // Purple
	"#ec4899", // Pink
	"#06b6d4", // Cyan
	"#f97316", // Orange
];

// Maximum number of pairs allowed
const MAX_PAIRS = 6;

// Shared props for left/right items
interface ItemProps {
	index: number;
	value: string;
	placeholder: string;
	isSelected: boolean;
	isConnected: boolean;
	connectionColor: string;
	onChange: (value: string) => void;
	onClick: () => void;
	onRemove?: () => void;
	connectionRef: (el: HTMLDivElement | null) => void;
}

const LeftItem = React.memo(
	({
		index,
		value,
		placeholder,
		isSelected,
		isConnected,
		connectionColor,
		onChange,
		onClick,
		onRemove,
		connectionRef,
	}: ItemProps) => (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			transition={{ type: "spring", stiffness: 400, damping: 25 }}
			className="flex items-center gap-2 mb-3"
		>
			<div className="relative flex-1">
				<Input
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className="w-full pr-8"
					autoComplete="off"
				/>
				<div
					ref={connectionRef}
					id={`left-connection-${index}`}
					className="absolute right-[-12px] top-1/2 transform -translate-y-1/2 h-6 w-6 rounded-full border-2 cursor-pointer transition-all"
					onClick={onClick}
					style={{
						zIndex: 10,
						borderColor:
							isSelected || isConnected ? connectionColor : "#d1d5db",
						backgroundColor:
							isSelected || isConnected ? connectionColor : "white",
					}}
				/>
			</div>
			{onRemove && (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={onRemove}
					aria-label="Paar entfernen"
				>
					<Trash className="h-4 w-4 text-destructive" />
				</Button>
			)}
		</motion.div>
	)
);

const RightItem = React.memo(
	({
		index,
		value,
		placeholder,
		isSelected,
		isConnected,
		connectionColor,
		onChange,
		onClick,
		onRemove,
		connectionRef,
	}: ItemProps) => (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			transition={{ type: "spring", stiffness: 400, damping: 25 }}
			className="flex items-center gap-2 mb-3"
		>
			<div className="relative flex-1">
				<Input
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className="w-full pl-8"
					autoComplete="off"
				/>
				<div
					ref={connectionRef}
					id={`right-connection-${index}`}
					className="absolute left-[-12px] top-1/2 transform -translate-y-1/2 h-6 w-6 rounded-full border-2 cursor-pointer transition-all"
					onClick={onClick}
					style={{
						zIndex: 10,
						borderColor:
							isSelected || isConnected ? connectionColor : "#d1d5db",
						backgroundColor:
							isSelected || isConnected ? connectionColor : "white",
					}}
				/>
			</div>
			{onRemove && (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={onRemove}
					aria-label="Paar entfernen"
				>
					<Trash className="h-4 w-4 text-destructive" />
				</Button>
			)}
		</motion.div>
	)
);

const DistractorItem = React.memo(
	({
		index,
		value,
		onChange,
		onRemove,
	}: {
		index: number;
		value: string;
		onChange: (value: string) => void;
		onRemove: () => void;
	}) => (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			transition={{ type: "spring", stiffness: 400, damping: 25 }}
			className="flex items-center gap-2 mb-3"
		>
			<div className="relative flex-1">
				<Input
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={`Distraktor ${index + 1}`}
					className="w-full pl-8 bg-gray-100 dark:bg-gray-800 border-dashed"
					autoComplete="off"
				/>
				<div className="absolute left-[-12px] top-1/2 transform -translate-y-1/2 h-6 w-6 rounded-full border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800" />
			</div>

			<Button
				type="button"
				variant="ghost"
				size="icon"
				onClick={onRemove}
				aria-label="Distraktor entfernen"
			>
				<Trash className="h-4 w-4 text-destructive" />
			</Button>
		</motion.div>
	)
);

const MatchingEditor: React.FC<MatchingEditorProps> = ({
	question,
	onChange,
	onDelete,
	showDelete = false,
}) => {
	// Initialize from props only once
	const [questionText, setQuestionText] = useState(() => question.text || "");
	const [leftItems, setLeftItems] = useState<string[]>(() =>
		question.leftItems ? [...question.leftItems] : []
	);
	const [rightItems, setRightItems] = useState<string[]>(() =>
		question.rightItems ? [...question.rightItems] : []
	);
	const [distractors, setDistractors] = useState<string[]>(() =>
		question.distractors ? [...question.distractors] : []
	);
	const [selectedItem, setSelectedItem] = useState<{
		side: "left" | "right";
		index: number;
	} | null>(null);
	const [connections, setConnections] = useState<Connection[]>([]);

	const leftConnectionRefs = useRef<(HTMLDivElement | null)[]>([]);
	const rightConnectionRefs = useRef<(HTMLDivElement | null)[]>([]);

	useEffect(() => {
		leftConnectionRefs.current = Array(leftItems.length).fill(null);
		rightConnectionRefs.current = Array(rightItems.length).fill(null);
	}, [leftItems.length, rightItems.length]);

	// Sync everything to parent whenever any part changes
	useEffect(() => {
		const correctMatches = Array(leftItems.length).fill(-1);
		connections.forEach(({ leftIndex, rightIndex }) => {
			correctMatches[leftIndex] = rightIndex;
		});
		onChange({
			...question,
			text: questionText,
			leftItems,
			rightItems,
			distractors: distractors.length > 0 ? distractors : undefined,
			correctMatches,
		});
	}, [questionText, leftItems, rightItems, distractors, connections]);

	const getNextColor = () =>
		CONNECTION_COLORS[connections.length % CONNECTION_COLORS.length];

	const handleConnectionPointClick = useCallback(
		(side: "left" | "right", index: number) => {
			// Deselect if clicking the same
			if (selectedItem?.side === side && selectedItem.index === index) {
				setSelectedItem(null);
				return;
			}
			// Switch selection on same side: remove existing connection for this item
			if (selectedItem && selectedItem.side === side) {
				setConnections((conns) =>
					conns.filter((c) =>
						side === "left" ? c.leftIndex !== index : c.rightIndex !== index
					)
				);
				setSelectedItem({ side, index });
				return;
			}
			// If nothing selected, select
			if (!selectedItem) {
				setSelectedItem({ side, index });
				return;
			}
			// Opposite side clicked: create or update connection
			const leftIndex = side === "left" ? index : selectedItem.index;
			const rightIndex = side === "right" ? index : selectedItem.index;
			setConnections((conns) => {
				// remove any existing involvement
				const filtered = conns.filter(
					(c) => c.leftIndex !== leftIndex && c.rightIndex !== rightIndex
				);
				return [...filtered, { leftIndex, rightIndex }];
			});
			setSelectedItem(null);
		},
		[selectedItem]
	);

	// Handlers for item changes
	const handleLeftItemChange = useCallback((index: number, value: string) => {
		setLeftItems((items) => {
			const ni = [...items];
			ni[index] = value;
			return ni;
		});
	}, []);

	const handleRightItemChange = useCallback((index: number, value: string) => {
		setRightItems((items) => {
			const ni = [...items];
			ni[index] = value;
			return ni;
		});
	}, []);

	const handleAddPair = useCallback(() => {
		if (leftItems.length >= MAX_PAIRS) return;
		setLeftItems((l) => [...l, ""]);
		setRightItems((r) => [...r, ""]);
	}, [leftItems.length]);

	const handleRemovePair = useCallback(
		(index: number) => {
			if (leftItems.length <= 2) return;
			setLeftItems((l) => l.filter((_, i) => i !== index));
			setRightItems((r) => r.filter((_, i) => i !== index));
			setConnections((conns) =>
				conns
					.filter((c) => c.leftIndex !== index && c.rightIndex !== index)
					.map((c) => ({
						leftIndex: c.leftIndex > index ? c.leftIndex - 1 : c.leftIndex,
						rightIndex: c.rightIndex > index ? c.rightIndex - 1 : c.rightIndex,
					}))
			);
		},
		[leftItems.length]
	);

	const handleAddDistractor = useCallback(() => {
		setDistractors((d) => [...d, ""]);
	}, []);

	const handleDistractorChange = useCallback((index: number, value: string) => {
		setDistractors((d) => {
			const nd = [...d];
			nd[index] = value;
			return nd;
		});
	}, []);

	const handleRemoveDistractor = useCallback((index: number) => {
		setDistractors((d) => d.filter((_, i) => i !== index));
	}, []);

	// Validation
	const allConnected =
		connections.length === leftItems.length && leftItems.length > 0;

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			transition={{ type: "spring", stiffness: 300, damping: 30 }}
			className="w-full"
		>
			<Card className="mb-4 border-green-200 dark:border-green-800">
				<CardHeader className="bg-green-50 dark:bg-green-950/20 flex justify-between pb-2">
					<CardTitle className="text-md font-medium">Zuordnung</CardTitle>
					{showDelete && onDelete && (
						<Button
							variant="ghost"
							size="icon"
							onClick={onDelete}
							className="h-8 w-8 text-destructive hover:bg-destructive/10"
						>
							<Trash className="h-4 w-4" />
						</Button>
					)}
				</CardHeader>
				<CardContent className="pt-4">
					<div className="space-y-4">
						<div>
							<Label htmlFor="matching-question-text">Fragetext</Label>
							<Input
								id="matching-question-text"
								value={questionText}
								onChange={(e) => setQuestionText(e.target.value)}
								placeholder="Ordnen Sie die Elemente korrekt zu..."
								className="mt-1"
								autoComplete="off"
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative mt-6">
							{/* Left column */}
							<div>
								<h3 className="text-center font-medium mb-4">Linke Seite</h3>
								<AnimatePresence>
									{leftItems.map((item, idx) => (
										<LeftItem
											key={`left-${idx}`}
											index={idx}
											value={item}
											placeholder={`Linkes Element ${idx + 1}`}
											isSelected={
												selectedItem?.side === "left" &&
												selectedItem.index === idx
											}
											isConnected={connections.some((c) => c.leftIndex === idx)}
											connectionColor={
												selectedItem?.side === "left" &&
												selectedItem.index === idx
													? getNextColor()
													: CONNECTION_COLORS[
															connections.findIndex(
																(c) => c.leftIndex === idx
															) % CONNECTION_COLORS.length
													  ]
											}
											onChange={(val) => handleLeftItemChange(idx, val)}
											onClick={() => handleConnectionPointClick("left", idx)}
											onRemove={
												idx >= 2 ? () => handleRemovePair(idx) : undefined
											}
											connectionRef={(el) =>
												(leftConnectionRefs.current[idx] = el)
											}
										/>
									))}
								</AnimatePresence>
							</div>

							{/* Right column */}
							<div>
								<h3 className="text-center font-medium mb-4">Rechte Seite</h3>
								<AnimatePresence>
									{rightItems.map((item, idx) => (
										<RightItem
											key={`right-${idx}`}
											index={idx}
											value={item}
											placeholder={`Rechtes Element ${idx + 1}`}
											isSelected={
												selectedItem?.side === "right" &&
												selectedItem.index === idx
											}
											isConnected={connections.some(
												(c) => c.rightIndex === idx
											)}
											connectionColor={
												selectedItem?.side === "right" &&
												selectedItem.index === idx
													? getNextColor()
													: CONNECTION_COLORS[
															connections.findIndex(
																(c) => c.rightIndex === idx
															) % CONNECTION_COLORS.length
													  ]
											}
											onChange={(val) => handleRightItemChange(idx, val)}
											onClick={() => handleConnectionPointClick("right", idx)}
											onRemove={
												idx >= 2 ? () => handleRemovePair(idx) : undefined
											}
											connectionRef={(el) =>
												(rightConnectionRefs.current[idx] = el)
											}
										/>
									))}
								</AnimatePresence>

								{/* Distractors */}
								{distractors.length > 0 && (
									<div className="mt-4">
										<h4 className="text-sm font-medium text-muted-foreground mb-2">
											Distraktoren
										</h4>
										<AnimatePresence>
											{distractors.map((item, idx) => (
												<DistractorItem
													key={`distractor-${idx}`}
													index={idx}
													value={item}
													onChange={(val) => handleDistractorChange(idx, val)}
													onRemove={() => handleRemoveDistractor(idx)}
												/>
											))}
										</AnimatePresence>
									</div>
								)}
							</div>

							{/* Connection arrows */}
							{connections.map(({ leftIndex, rightIndex }) => (
								<Xarrow
									key={`arrow-${leftIndex}-${rightIndex}`}
									start={`left-connection-${leftIndex}`}
									end={`right-connection-${rightIndex}`}
									color={
										CONNECTION_COLORS[
											connections.findIndex(
												(c) =>
													c.leftIndex === leftIndex &&
													c.rightIndex === rightIndex
											) % CONNECTION_COLORS.length
										]
									}
									strokeWidth={3}
									curveness={0.8}
									startAnchor="right"
									endAnchor="left"
									path="smooth"
									showHead={false}
									zIndex={5}
								/>
							))}
						</div>

						<div className="flex flex-col sm:flex-row gap-2 mt-4">
							<Button
								type="button"
								variant="outline"
								onClick={handleAddPair}
								className="flex-1"
								size="sm"
								disabled={leftItems.length >= MAX_PAIRS}
							>
								<Plus className="h-4 w-4 mr-1" />
								Paar hinzufügen
							</Button>

							<Button
								type="button"
								variant="outline"
								onClick={handleAddDistractor}
								className="flex-1"
								size="sm"
							>
								<Plus className="h-4 w-4 mr-1" />
								Distraktor hinzufügen
							</Button>
						</div>
					</div>
				</CardContent>

				<CardFooter className="bg-muted/20 flex justify-between">
					<div className="flex items-center">
						{!allConnected ? (
							<div className="flex items-center text-destructive text-sm">
								<AlertCircle className="h-4 w-4 mr-1" />
								Alle Elemente müssen verbunden sein
							</div>
						) : (
							<div className="flex items-center text-green-600 text-sm">
								<Check className="h-4 w-4 mr-1" />
								Alle Verbindungen gesetzt
							</div>
						)}
					</div>
				</CardFooter>
			</Card>
		</motion.div>
	);
};

export default MatchingEditor;
