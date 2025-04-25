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
import Xarrow, { anchorType } from "react-xarrows";

interface MatchingEditorProps {
	question: MatchingQuestion;
	onChange: (question: MatchingQuestion) => void;
	onDelete?: () => void;
	showDelete?: boolean;
}

type Connection = { leftIndex: number; rightIndex: number };
const CONNECTION_COLORS = [
	"#3b82f6",
	"#ef4444",
	"#10b981",
	"#f59e0b",
	"#8b5cf6",
	"#ec4899",
	"#06b6d4",
	"#f97316",
];
const MAX_PAIRS = 6;

interface ItemProps {
	index: number;
	value: string;
	placeholder: string;
	isSelected: boolean;
	isConnected: boolean;
	connectionColor: string;
	onChange: (value: string) => void;
	onClick: () => void;
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
		connectionRef,
	}: ItemProps) => (
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
				className="absolute right-[-12px] top-1/2 transform -translate-y-1/2 h-6 w-6"
				style={{ zIndex: 10 }}
			>
				<motion.div
					onClick={onClick}
					className="h-6 w-6 rounded-full border-2 cursor-pointer"
					style={{
						borderColor:
							isSelected || isConnected ? connectionColor : "#d1d5db",
						backgroundColor:
							isSelected || isConnected ? connectionColor : "white",
					}}
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.95 }}
					transition={{ type: "spring", stiffness: 400, damping: 25 }}
				/>
			</div>
		</div>
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
		connectionRef,
	}: ItemProps) => (
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
				className="absolute left-[-12px] top-1/2 transform -translate-y-1/2 h-6 w-6"
				style={{ zIndex: 10 }}
			>
				<motion.div
					onClick={onClick}
					className="h-6 w-6 rounded-full border-2 cursor-pointer"
					style={{
						borderColor:
							isSelected || isConnected ? connectionColor : "#d1d5db",
						backgroundColor:
							isSelected || isConnected ? connectionColor : "white",
					}}
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.95 }}
					transition={{ type: "spring", stiffness: 400, damping: 25 }}
				/>
			</div>
		</div>
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
	const [connections, setConnections] = useState<Connection[]>(() => {
		const arr: Connection[] = [];
		question.correctMatches?.forEach((ri, li) => {
			if (ri >= 0) arr.push({ leftIndex: li, rightIndex: ri });
		});
		return arr;
	});
	const [selectedItem, setSelectedItem] = useState<{
		side: "left" | "right";
		index: number;
	} | null>(null);

	const leftRefs = useRef<(HTMLDivElement | null)[]>([]);
	const rightRefs = useRef<(HTMLDivElement | null)[]>([]);
	useEffect(() => {
		leftRefs.current = Array(leftItems.length).fill(null);
		rightRefs.current = Array(rightItems.length).fill(null);
	}, [leftItems.length, rightItems.length]);

	useEffect(() => {
		setQuestionText(question.text || "");
		setLeftItems(question.leftItems ? [...question.leftItems] : []);
		setRightItems(question.rightItems ? [...question.rightItems] : []);
		setDistractors(question.distractors ? [...question.distractors] : []);
		const arr: Connection[] = [];
		question.correctMatches?.forEach((ri, li) => {
			if (ri >= 0) arr.push({ leftIndex: li, rightIndex: ri });
		});
		setConnections(arr);
		setSelectedItem(null);
	}, [question.id]);

	useEffect(() => {
		const cm = Array(leftItems.length).fill(-1);
		connections.forEach(({ leftIndex, rightIndex }) => {
			cm[leftIndex] = rightIndex;
		});
		onChange({
			...question,
			text: questionText,
			leftItems,
			rightItems,
			distractors: distractors.length > 0 ? distractors : undefined,
			correctMatches: cm,
		});
	}, [questionText, leftItems, rightItems, distractors, connections]);

	const getNextColor = () =>
		CONNECTION_COLORS[connections.length % CONNECTION_COLORS.length];
	const allConnected =
		connections.length === leftItems.length && leftItems.length > 0;

	const handleClick = useCallback(
		(side: "left" | "right", idx: number) => {
			if (selectedItem?.side === side && selectedItem.index === idx) {
				setSelectedItem(null);
				return;
			}
			if (selectedItem && selectedItem.side === side) {
				setConnections((cs) =>
					cs.filter((c) =>
						side === "left" ? c.leftIndex !== idx : c.rightIndex !== idx
					)
				);
				setSelectedItem({ side, index: idx });
				return;
			}
			if (!selectedItem) {
				setSelectedItem({ side, index: idx });
				return;
			}
			const leftIndex = side === "left" ? idx : selectedItem.index;
			const rightIndex = side === "right" ? idx : selectedItem.index;
			setConnections((cs) => {
				const filtered = cs.filter(
					(c) => c.leftIndex !== leftIndex && c.rightIndex !== rightIndex
				);
				return [...filtered, { leftIndex, rightIndex }];
			});
			setSelectedItem(null);
		},
		[selectedItem]
	);

	const handleLeftChange = useCallback(
		(i: number, v: string) =>
			setLeftItems((li) => {
				const a = [...li];
				a[i] = v;
				return a;
			}),
		[]
	);
	const handleRightChange = useCallback(
		(i: number, v: string) =>
			setRightItems((ri) => {
				const a = [...ri];
				a[i] = v;
				return a;
			}),
		[]
	);
	const addPair = useCallback(() => {
		if (leftItems.length < MAX_PAIRS) {
			setLeftItems((l) => [...l, ""]);
			setRightItems((r) => [...r, ""]);
		}
	}, [leftItems.length]);
	const removePair = useCallback(
		(i: number) => {
			if (leftItems.length > 2) {
				setLeftItems((l) => l.filter((_, idx) => idx !== i));
				setRightItems((r) => r.filter((_, idx) => idx !== i));
				setConnections((cs) =>
					cs
						.filter((c) => c.leftIndex !== i && c.rightIndex !== i)
						.map((c) => ({
							leftIndex: c.leftIndex > i ? c.leftIndex - 1 : c.leftIndex,
							rightIndex: c.rightIndex > i ? c.rightIndex - 1 : c.rightIndex,
						}))
				);
			}
		},
		[leftItems.length]
	);
	const addDistractor = useCallback(
		() => setDistractors((d) => [...d, ""]),
		[]
	);
	const changeDistractor = useCallback(
		(i: number, v: string) =>
			setDistractors((d) => {
				const a = [...d];
				a[i] = v;
				return a;
			}),
		[]
	);
	const removeDistractor = useCallback(
		(i: number) => setDistractors((d) => d.filter((_, idx) => idx !== i)),
		[]
	);

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
				<CardContent className="pt-4 space-y-4">
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
					<div className="relative mt-6">
						<div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr] gap-x-8">
							<div className="col-start-1 pr-4">
								<AnimatePresence>
									{leftItems.map((item, idx) => (
										<LeftItem
											key={idx}
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
											onChange={(v) => handleLeftChange(idx, v)}
											onClick={() => handleClick("left", idx)}
											connectionRef={(el) => (leftRefs.current[idx] = el)}
										/>
									))}
								</AnimatePresence>
							</div>
							<div className="col-start-3">
								<AnimatePresence>
									{rightItems.map((item, idx) => (
										<div key={idx} className="flex items-center gap-2 mb-3">
											<RightItem
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
												onChange={(v) => handleRightChange(idx, v)}
												onClick={() => handleClick("right", idx)}
												connectionRef={(el) => (rightRefs.current[idx] = el)}
											/>
											{idx >= 2 && (
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => removePair(idx)}
													className="text-destructive hover:bg-destructive/10"
												>
													<Trash className="h-4 w-4" />
												</Button>
											)}
										</div>
									))}
								</AnimatePresence>
								{distractors.length > 0 && (
									<div className="mt-4">
										<h4 className="text-sm font-medium text-muted-foreground mb-2">
											Distraktoren
										</h4>
										<AnimatePresence>
											{distractors.map((item, idx) => (
												<DistractorItem
													key={idx}
													index={idx}
													value={item}
													onChange={(v) => changeDistractor(idx, v)}
													onRemove={() => removeDistractor(idx)}
												/>
											))}
										</AnimatePresence>
									</div>
								)}
							</div>
						</div>
						<div className="absolute inset-0 pointer-events-none">
							{connections.map(({ leftIndex, rightIndex }) => (
								<Xarrow
									key={`${leftIndex}-${rightIndex}`}
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
									startAnchor={"right" as anchorType}
									endAnchor={"left" as anchorType}
									path="smooth"
									showHead={false}
									zIndex={5}
								/>
							))}
						</div>
					</div>
					<div className="flex flex-col sm:flex-row gap-2 mt-4">
						<Button
							variant="outline"
							onClick={addPair}
							className="flex-1"
							size="sm"
							disabled={leftItems.length >= MAX_PAIRS}
						>
							<Plus className="h-4 w-4 mr-1" />
							Paar hinzufügen
						</Button>
						<Button
							variant="outline"
							onClick={addDistractor}
							className="flex-1"
							size="sm"
						>
							<Plus className="h-4 w-4 mr-1" />
							Distraktor hinzufügen
						</Button>
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
