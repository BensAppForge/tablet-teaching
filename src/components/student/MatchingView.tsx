"use client";

import React, { useEffect, useMemo, useRef } from "react";
import Xarrow, { Xwrapper, useXarrow, anchorType } from "react-xarrows";
import { MatchingQuestion } from "@/lib/firebase/tests";
import { MatchingAnswer } from "@/lib/student/scoring";
import type { WorksheetStrings } from "@/lib/i18n/types";

interface Props {
	question: MatchingQuestion;
	index: number;
	answer: MatchingAnswer | undefined;
	onAnswer: (a: MatchingAnswer) => void;
	mode: "take" | "review";
	strings: WorksheetStrings;
}

const COLORS = [
	"#3b82f6",
	"#ef4444",
	"#10b981",
	"#f59e0b",
	"#8b5cf6",
	"#ec4899",
	"#06b6d4",
	"#f97316",
];

interface RightRow {
	value: string;
	isDistractor: boolean;
	originalIndex: number;
	id: string; // "regular-N" or "distractor-N"
	code: number; // numeric encoding stored in MatchingAnswer.connections
}

// Forces Xarrow to remeasure on mount and once after layout settles —
// same trick as in the editor.
const ArrowSyncer: React.FC = () => {
	const updateXarrow = useXarrow();
	useEffect(() => {
		const raf = requestAnimationFrame(updateXarrow);
		const t = window.setTimeout(updateXarrow, 200);
		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(t);
		};
	}, [updateXarrow]);
	return null;
};

const MatchingView: React.FC<Props> = ({
	question,
	index,
	answer,
	onAnswer,
	mode,
	strings,
}) => {
	const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
	const review = mode === "review";

	const rightRows: RightRow[] = useMemo(() => {
		const real: RightRow[] = question.rightItems.map((value, i) => ({
			value,
			isDistractor: false,
			originalIndex: i,
			id: `regular-${i}`,
			code: i,
		}));
		const dist: RightRow[] = (question.distractors || []).map((value, i) => ({
			value,
			isDistractor: true,
			originalIndex: i,
			id: `distractor-${i}`,
			code: question.rightItems.length + i,
		}));
		const all = [...real, ...dist];
		// Deterministic shuffle so the order doesn't reshuffle on every re-render
		// of this component instance.
		for (let i = all.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[all[i], all[j]] = [all[j], all[i]];
		}
		return all;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [question.id]);

	const codeToRow = useMemo(() => {
		const m = new Map<number, RightRow>();
		rightRows.forEach((r) => m.set(r.code, r));
		return m;
	}, [rightRows]);

	const connections = answer?.connections ?? [];
	const selectedRef = useRef<
		| { side: "left"; leftIndex: number }
		| { side: "right"; rightCode: number }
		| null
	>(null);
	// Force re-render when selection changes — kept off React state to
	// avoid the useEffect-on-change ping-pong.
	const [, setTick] = React.useState(0);
	const repaint = () => setTick((t) => t + 1);

	const setConnection = (leftIndex: number, rightCode: number) => {
		const next = [...connections];
		while (next.length <= leftIndex) next.push(-1);
		// Clear any existing connection to this right code so a right dot
		// can never connect to more than one left.
		for (let i = 0; i < next.length; i++) {
			if (i !== leftIndex && next[i] === rightCode) next[i] = -1;
		}
		next[leftIndex] = rightCode;
		// Trim trailing -1s for cleanliness.
		while (next.length > question.leftItems.length) next.pop();
		onAnswer({ connections: next });
	};

	const clearConnection = (predicate: (val: number, i: number) => boolean) => {
		const next = [...connections];
		next.forEach((v, i) => {
			if (predicate(v, i)) next[i] = -1;
		});
		onAnswer({ connections: next });
	};

	const handleLeftTap = (leftIndex: number) => {
		if (review) return;
		const sel = selectedRef.current;
		if (sel?.side === "left" && sel.leftIndex === leftIndex) {
			// Tapping the same left again clears its connection AND its selection.
			clearConnection((_, i) => i === leftIndex);
			selectedRef.current = null;
		} else if (sel?.side === "right") {
			setConnection(leftIndex, sel.rightCode);
			selectedRef.current = null;
		} else {
			selectedRef.current = { side: "left", leftIndex };
		}
		repaint();
	};

	const handleRightTap = (rightCode: number) => {
		if (review) return;
		const sel = selectedRef.current;
		const existingLeft = connections.findIndex((v) => v === rightCode);
		if (sel?.side === "right" && sel.rightCode === rightCode) {
			if (existingLeft >= 0) {
				clearConnection((v) => v === rightCode);
			}
			selectedRef.current = null;
		} else if (sel?.side === "left") {
			setConnection(sel.leftIndex, rightCode);
			selectedRef.current = null;
		} else {
			selectedRef.current = { side: "right", rightCode };
		}
		repaint();
	};

	const sel = selectedRef.current;

	const colorFor = (leftIndex: number) =>
		COLORS[leftIndex % COLORS.length];

	const reviewColor = (leftIndex: number, code: number): string => {
		const expected = question.correctMatches[leftIndex];
		return code === expected ? "#16a34a" /* green */ : "#dc2626" /* red */;
	};

	return (
		<Xwrapper>
			<ArrowSyncer />
			<div className="space-y-3">
				<p className="font-medium">
					{index + 1}. {question.text || strings.defaultQuestion.matching}
				</p>
				<div className="relative">
					{/* Middle column has a guaranteed min width so the left and
					    right connection dots don't appear glued together when
					    item text is short. */}
					<div className="grid grid-cols-[1fr_minmax(3rem,6rem)_1fr] gap-x-6 gap-y-2 pl-6">
						<ul className="space-y-3 py-1">
							{question.leftItems.map((item, i) => {
								const isSelected =
									sel?.side === "left" && sel.leftIndex === i;
								const isConnected = (connections[i] ?? -1) !== -1;
								const color = review
									? isConnected
										? reviewColor(i, connections[i])
										: "#dc2626"
									: isSelected || isConnected
										? colorFor(i)
										: "#9ca3af";
								return (
									<li key={i} className="flex items-center gap-3">
										<span className="text-sm text-muted-foreground shrink-0 w-5">
											{i + 1}.
										</span>
										<span className="flex-1 text-sm">{item}</span>
										<button
											type="button"
											id={`${uid}-left-${i}`}
											onClick={() => handleLeftTap(i)}
											disabled={review}
											aria-label={`Verbinden mit ${item}`}
											className="h-6 w-6 rounded-full border-2 shrink-0 transition-transform active:scale-90"
											style={{
												borderColor: color,
												backgroundColor:
													isSelected || isConnected ? color : "white",
											}}
										/>
									</li>
								);
							})}
						</ul>
						<div />
						<ul className="space-y-3 py-1">
							{rightRows.map((row) => {
								const ownerLeft = connections.findIndex(
									(v) => v === row.code
								);
								const isConnected = ownerLeft !== -1;
								const isSelected =
									sel?.side === "right" && sel.rightCode === row.code;
								const color = review
									? isConnected
										? reviewColor(ownerLeft, row.code)
										: "#9ca3af"
									: isSelected || isConnected
										? colorFor(isConnected ? ownerLeft : 0)
										: "#9ca3af";
								return (
									<li key={row.id} className="flex items-center gap-3">
										<button
											type="button"
											id={`${uid}-right-${row.id}`}
											onClick={() => handleRightTap(row.code)}
											disabled={review}
											aria-label={`Verbinden mit ${row.value}`}
											className="h-6 w-6 rounded-full border-2 shrink-0 transition-transform active:scale-90"
											style={{
												borderColor: color,
												backgroundColor:
													isSelected || isConnected ? color : "white",
											}}
										/>
										{/* Distractors render identically to real items — any
										    visual distinction would give the answer away. */}
										<span className="flex-1 text-sm">{row.value}</span>
									</li>
								);
							})}
						</ul>
					</div>
					<div className="absolute inset-0 pointer-events-none">
						{connections.map((code, leftIndex) => {
							if (code === -1) return null;
							const row = codeToRow.get(code);
							if (!row) return null;
							const color = review
								? reviewColor(leftIndex, code)
								: colorFor(leftIndex);
							return (
								<Xarrow
									key={`${leftIndex}-${code}`}
									start={`${uid}-left-${leftIndex}`}
									end={`${uid}-right-${row.id}`}
									color={color}
									strokeWidth={3}
									curveness={0.6}
									startAnchor={"right" as anchorType}
									endAnchor={"left" as anchorType}
									path="smooth"
									showHead={false}
									zIndex={5}
								/>
							);
						})}
					</div>
				</div>
				{!review && (
					<p className="pl-6 text-xs text-muted-foreground">
						{strings.hint.matching}
					</p>
				)}
			</div>
		</Xwrapper>
	);
};

export default MatchingView;
