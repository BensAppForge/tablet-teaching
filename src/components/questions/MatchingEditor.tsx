"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
import Xarrow, { anchorType, Xwrapper, useXarrow } from "react-xarrows";

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
	// HTML id assigned to the connection-circle div. Threaded in from the
	// parent so the id can include a per-editor-instance prefix (avoids
	// collisions when multiple MatchingEditors are on the same page).
	connectionId: string;
	onChange: (value: string) => void;
	onClick: () => void;
	connectionRef: (el: HTMLDivElement | null) => void;
}

// Left item component with layout animation
const LeftItem = React.memo(
	({
		index,
		value,
		placeholder,
		isSelected,
		isConnected,
		connectionColor,
		connectionId,
		onChange,
		onClick,
		connectionRef,
	}: ItemProps) => (
		<motion.div layout initial={false} className="relative flex-1 mb-3">
			<div className="relative">
				<Input
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className="w-full pr-8"
					autoComplete="off"
				/>
				<div
					ref={connectionRef}
					id={connectionId}
					className="absolute right-[-12px] top-1/2 transform -translate-y-1/2 h-6 w-6 flex items-center justify-center"
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
		</motion.div>
	)
);

// Right item component with layout animation
const RightItem = React.memo(
	({
		index,
		value,
		placeholder,
		isSelected,
		isConnected,
		connectionColor,
		connectionId,
		onChange,
		onClick,
		connectionRef,
	}: ItemProps) => (
		<motion.div layout initial={false} className="relative flex-1 mb-3">
			<div className="relative">
				<Input
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className="w-full pl-8"
					autoComplete="off"
				/>
				<div
					ref={connectionRef}
					id={connectionId}
					className="absolute left-[-12px] top-1/2 transform -translate-y-1/2 h-6 w-6 flex items-center justify-center"
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
		</motion.div>
	)
);

// Helper that lives inside <Xwrapper> and calls updateXarrow() on every
// animation frame for the first 1000ms after mount. The editor enters
// with a framer-motion spring (~600ms to settle), and react-xarrows
// otherwise snapshots dot positions at the wrong moment, leaving
// arrows visibly off-centre until the next state change. updateXarrow
// re-measures without remounting the Xarrow components, so it's cheap
// to call every frame.
const ArrowSyncer: React.FC = () => {
	const updateXarrow = useXarrow();
	useEffect(() => {
		let rafId = 0;
		const start = performance.now();
		const tick = () => {
			updateXarrow();
			if (performance.now() - start < 1000) {
				rafId = requestAnimationFrame(tick);
			}
		};
		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	}, [updateXarrow]);
	return null;
};

// Distractor item (integrated with right items)
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
		<motion.div layout initial={false} className="flex items-center gap-2 mb-3">
			<div className="relative flex-1">
				<Input
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={`Rechtes Element (Distraktor)`}
					className="w-full pl-8 bg-gray-50 dark:bg-gray-800/30 border-dashed"
					autoComplete="off"
				/>
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
	// Per-instance id prefix so the connection-circle ids (used by Xarrow
	// to draw lines) and form ids don't collide when multiple
	// MatchingEditors live on the same page. Strip every non-alphanumeric
	// char because Xarrow passes these ids to querySelector and React's
	// useId can emit chars like colons or guillemets that break CSS
	// selectors. The remaining alphanumeric core is still unique per
	// component instance.
	const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");

	// State
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
	const [shuffleKey, setShuffleKey] = useState(0);

	// Display order for the right-side column, expressed as a stable list
	// of row ids ("regular-N" / "distractor-N"). Independent of the
	// canonical rightItems/distractors arrays: hitting "Mischen" only
	// reshuffles this list — never the underlying data — so a distractor
	// can appear anywhere in the column, not always at the bottom.
	const [visualOrderIds, setVisualOrderIds] = useState<string[]>(() => {
		const ids: string[] = [];
		(question.rightItems || []).forEach((_, i) =>
			ids.push(`regular-${i}`)
		);
		(question.distractors || []).forEach((_, i) =>
			ids.push(`distractor-${i}`)
		);
		return ids;
	});

	// Refs
	const leftRefs = useRef<(HTMLDivElement | null)[]>([]);
	const rightRefs = useRef<(HTMLDivElement | null)[]>([]);
	useEffect(() => {
		leftRefs.current = Array(leftItems.length).fill(null);
		rightRefs.current = Array(rightItems.length).fill(null);
	}, [leftItems.length, rightItems.length]);

	// Reset on load
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
		const ids: string[] = [];
		(question.rightItems || []).forEach((_, i) =>
			ids.push(`regular-${i}`)
		);
		(question.distractors || []).forEach((_, i) =>
			ids.push(`distractor-${i}`)
		);
		setVisualOrderIds(ids);
	}, [question.id]);

	// Sync up
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

	// Helpers
	const totalRight = rightItems.length + distractors.length;
	const leftNeedsCenter = leftItems.length < totalRight;
	const getNextColor = () =>
		CONNECTION_COLORS[connections.length % CONNECTION_COLORS.length];
	const allConnected =
		connections.length === leftItems.length && leftItems.length > 0;

	// Connection logic
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

	// Handlers
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
			// Force re-render of connections
			setShuffleKey(prev => prev + 1);
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
				// Force re-render of connections
				setShuffleKey(prev => prev + 1);
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

	// Unified view of every right-hand row (real items + distractors).
	// `originalIndex` is the row's canonical position in its source array
	// (rightItems or distractors). It MUST be carried through here rather
	// than recomputed via indexOf(value), because two rows with the same
	// string value (e.g. two empty inputs in a fresh question) collapse
	// to the same index under indexOf — which leads to duplicate
	// connection ids, dangling Xarrow targets and "second click goes to
	// first dot" bugs.
	type RightSideItem = {
		value: string;
		isDistractor: boolean;
		id: string;
		originalIndex: number;
	};

	const rightSideItems: RightSideItem[] = useMemo(() => {
		const byId = new Map<string, RightSideItem>();
		rightItems.forEach((value, index) => {
			const id = `regular-${index}`;
			byId.set(id, {
				value,
				isDistractor: false,
				id,
				originalIndex: index,
			});
		});
		distractors.forEach((value, index) => {
			const id = `distractor-${index}`;
			byId.set(id, {
				value,
				isDistractor: true,
				id,
				originalIndex: index,
			});
		});
		// Honour visualOrderIds for display, but tolerate transient drift
		// (e.g. between an add/remove and the length-change reset effect
		// firing) by appending any items missing from the order at the end
		// and skipping ids that no longer correspond to a row.
		const ordered: RightSideItem[] = [];
		const seen = new Set<string>();
		visualOrderIds.forEach((id) => {
			const item = byId.get(id);
			if (item) {
				ordered.push(item);
				seen.add(id);
			}
		});
		byId.forEach((item, id) => {
			if (!seen.has(id)) ordered.push(item);
		});
		return ordered;
	}, [rightItems, distractors, visualOrderIds]);

	// Reset the display order to natural (regulars first, then distractors)
	// when the item counts change. Stable per-row ids would let us preserve
	// the shuffled order across add/remove but the underlying data model
	// re-keys by array index, so a reset is the simplest correct option.
	useEffect(() => {
		const ids: string[] = [];
		rightItems.forEach((_, i) => ids.push(`regular-${i}`));
		distractors.forEach((_, i) => ids.push(`distractor-${i}`));
		setVisualOrderIds(ids);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rightItems.length, distractors.length]);

	// Shuffle the display order of the right-side column (regular items
	// and distractors mixed). Does NOT touch rightItems, distractors, or
	// connections — those are the canonical data model. Xarrow finds
	// dots by id and re-measures their positions, so connections stay
	// visually correct regardless of how the column is reordered.
	const shuffleAll = useCallback(() => {
		setVisualOrderIds((order) => {
			const shuffled = [...order];
			for (let i = shuffled.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
			}
			return shuffled;
		});
		setShuffleKey((k) => k + 1);
	}, []);

	return (
		<Xwrapper>
			<ArrowSyncer />
			<motion.div
				layout
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -20 }}
				transition={{ type: "spring", stiffness: 300, damping: 30 }}
				className="w-full"
			>
				<Card className="mb-4 border-green-200 dark:border-green-800">
				<CardHeader className="bg-green-50 dark:bg-green-950/20 flex flex-row justify-between items-center pb-2">
					<CardTitle className="text-md font-medium">Zuordnung</CardTitle>
					{showDelete && onDelete && (
						<Button
							variant="ghost"
							size="icon"
							onClick={onDelete}
							className="h-8 w-8 text-destructive hover:bg-destructive/10 ml-auto"
						>
							<Trash className="h-4 w-4" />
						</Button>
					)}
				</CardHeader>
				<CardContent className="pt-4 space-y-4">
					<Label htmlFor={`${uid}-matching-question-text`}>Fragetext</Label>
					<Input
						id={`${uid}-matching-question-text`}
						value={questionText}
						onChange={(e) => setQuestionText(e.target.value)}
						placeholder="Ordnen Sie die Elemente korrekt zu..."
						className="mt-1"
						autoComplete="off"
					/>
					<div className="flex justify-end">
						<Button variant="outline" size="sm" onClick={shuffleAll}>
							Mischen
						</Button>
					</div>
					<div className="relative mt-6">
						<div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr] gap-x-8">
							<div
								className={`${
									leftNeedsCenter ? "flex flex-col justify-center" : ""
								} col-start-1 pr-4`}
							>
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
														connections.findIndex((c) => c.leftIndex === idx) %
															CONNECTION_COLORS.length
												  ]
										}
										connectionId={`${uid}-left-connection-${idx}`}
										onChange={(v) => handleLeftChange(idx, v)}
										onClick={() => handleClick("left", idx)}
										connectionRef={(el) => (leftRefs.current[idx] = el)}
									/>
								))}
							</div>
							<div className="col-start-2" />
							<div className="col-start-3">
								{/* Render all right side items (both regular items and distractors) in a unified list */}
								{rightSideItems.map((item, idx) => (
									<motion.div
										layout
										key={`${item.id}-${shuffleKey}`}
										className="flex items-center gap-2 mb-3"
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ type: "spring", stiffness: 300, damping: 25 }}
									>
										{!item.isDistractor ? (
											// Regular right item with connection. All indices come
											// from item.originalIndex — see RightSideItem type for why.
											<>
												<RightItem
													index={item.originalIndex}
													value={item.value}
													placeholder={`Rechtes Element ${item.originalIndex + 1}`}
													isSelected={
														selectedItem?.side === "right" &&
														selectedItem.index === item.originalIndex
													}
													isConnected={connections.some(
														(c) => c.rightIndex === item.originalIndex
													)}
													connectionColor={
														selectedItem?.side === "right" &&
														selectedItem.index === item.originalIndex
															? getNextColor()
															: CONNECTION_COLORS[
																	connections.findIndex(
																		(c) => c.rightIndex === item.originalIndex
																	) % CONNECTION_COLORS.length
															  ]
													}
													connectionId={`${uid}-right-connection-${item.originalIndex}`}
													onChange={(v) => handleRightChange(item.originalIndex, v)}
													onClick={() => handleClick("right", item.originalIndex)}
													connectionRef={(el) => (rightRefs.current[item.originalIndex] = el)}
												/>
												{item.originalIndex >= 2 && (
													<Button
														variant="ghost"
														size="icon"
														onClick={() => removePair(item.originalIndex)}
														className="text-destructive hover:bg-destructive/10"
													>
														<Trash className="h-4 w-4" />
													</Button>
												)}
											</>
										) : (
											<DistractorItem
												index={item.originalIndex}
												value={item.value}
												onChange={(v) => changeDistractor(item.originalIndex, v)}
												onRemove={() => removeDistractor(item.originalIndex)}
											/>
										)}
									</motion.div>
								))}
							</div>
						</div>
						<div className="absolute inset-0 pointer-events-none">
							{connections.map(({ leftIndex, rightIndex }) => (
								<Xarrow
									key={`${leftIndex}-${rightIndex}-${shuffleKey}`}
									start={`${uid}-left-connection-${leftIndex}`}
									end={`${uid}-right-connection-${rightIndex}`}
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
		</Xwrapper>
	);
};

export default MatchingEditor;
