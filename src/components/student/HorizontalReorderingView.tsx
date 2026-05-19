"use client";

import React, { useEffect, useMemo } from "react";
import { Reorder } from "framer-motion";
import { GripVertical, Check, X } from "lucide-react";
import { ReorderingQuestion } from "@/lib/firebase/tests";
import { ReorderingAnswer, norm } from "@/lib/student/scoring";
import { Input } from "@/components/ui/input";
import type { WorksheetStrings } from "@/lib/i18n/types";

interface Props {
	question: ReorderingQuestion;
	index: number;
	answer: ReorderingAnswer | undefined;
	onAnswer: (a: ReorderingAnswer) => void;
	mode: "take" | "review";
	strings: WorksheetStrings;
}

// Fisher-Yates shuffle that guarantees the result does NOT equal `avoid`
// (typically the question's correctOrder). If the shuffle lands on the
// correct permutation, swap the first two elements as a deterministic
// fallback. With n=2 the unshuffled identity has a 50% chance of being
// "correct", so this matters in practice.
function shuffleIndicesAvoiding(n: number, avoid: number[]): number[] {
	const arr = Array.from({ length: n }, (_, i) => i);
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	if (n >= 2 && arr.every((v, i) => v === avoid[i])) {
		[arr[0], arr[1]] = [arr[1], arr[0]];
	}
	return arr;
}

const identityOrder = (n: number) =>
	Array.from({ length: n }, (_, i) => i);

const HorizontalReorderingView: React.FC<Props> = ({
	question,
	index,
	answer,
	onAnswer,
	mode,
	strings,
}) => {
	const review = mode === "review";

	const avoid =
		question.correctOrder?.length === question.items.length
			? question.correctOrder
			: identityOrder(question.items.length);

	// Initialise a shuffled order once per question if none exists.
	useEffect(() => {
		if (!answer?.order || answer.order.length !== question.items.length) {
			onAnswer({
				order: shuffleIndicesAvoiding(question.items.length, avoid),
				gapTexts: answer?.gapTexts ?? {},
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [question.id, question.items.length]);

	const order =
		answer?.order && answer.order.length === question.items.length
			? answer.order
			: shuffleIndicesAvoiding(question.items.length, avoid);
	const gapTexts = answer?.gapTexts ?? {};

	// Word bank shown above the exercise: gap solutions (the correct word
	// for each isGap item) plus any teacher-defined distractors, shuffled
	// once per question so it doesn't reshuffle on every keystroke.
	const wordBank = useMemo(() => {
		const gapWords = (question.isGap || [])
			.map((isGap, i) => (isGap ? question.items[i] : null))
			.filter(
				(w): w is string => typeof w === "string" && w.trim().length > 0
			);
		const dist = (question.distractors ?? []).filter(
			(w): w is string => typeof w === "string" && w.trim().length > 0
		);
		const all = [...gapWords, ...dist];
		const arr = [...all];
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [question.id]);

	const updateOrder = (newOrder: number[]) => {
		onAnswer({ order: newOrder, gapTexts });
	};
	const updateGap = (origIndex: number, value: string) => {
		onAnswer({ order, gapTexts: { ...gapTexts, [origIndex]: value } });
	};

	const isGap = (i: number) => !!(question.isGap || [])[i];

	return (
		<div className="space-y-3">
			<p className="font-medium">
				{index + 1}.{" "}
				{question.text || strings.defaultQuestion.horizontalReordering}
			</p>
			{wordBank.length > 0 && (
				<div className="pl-6">
					<p className="text-xs text-muted-foreground mb-1">
						{strings.wordBank}
					</p>
					<div className="flex flex-wrap gap-2">
						{wordBank.map((w, i) => (
							<span
								key={i}
								className="text-sm px-2.5 py-1 rounded border bg-muted/40"
							>
								{w}
							</span>
						))}
					</div>
				</div>
			)}
			<Reorder.Group
				as="div"
				axis="x"
				values={order}
				onReorder={review ? () => {} : updateOrder}
				className="flex flex-wrap gap-2 pl-6"
			>
				{order.map((origIndex, displayIndex) => {
					const itemText = question.items[origIndex] ?? "";
					const gap = isGap(origIndex);
					const correctOrigAtPosition =
						question.correctOrder?.[displayIndex];
					const positionRight =
						review && correctOrigAtPosition === origIndex;
					const positionWrong = review && !positionRight;
					const gapTyped = gapTexts[origIndex] ?? "";
					const gapRight =
						review && gap && norm(gapTyped) === norm(itemText);
					const gapWrong = review && gap && !gapRight;
					return (
						<Reorder.Item
							key={origIndex}
							value={origIndex}
							drag={review ? false : "x"}
							className="touch-none"
						>
							<div
								className={[
									"flex items-center gap-2 px-3 py-2 rounded-md border bg-background",
									review
										? positionRight
											? "border-green-500 bg-green-50 dark:bg-green-950/30"
											: "border-destructive bg-destructive/10"
										: "border-input",
								].join(" ")}
							>
								{!review && (
									<GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
								)}
								{gap ? (
									<Input
										type="text"
										value={gapTyped}
										onChange={(e) => updateGap(origIndex, e.target.value)}
										onPointerDown={(e) => e.stopPropagation()}
										disabled={review}
										aria-label={`Lückenwort an Position ${displayIndex + 1}`}
										className={[
											"h-7 px-2 text-sm",
											gapRight ? "border-green-500" : "",
											gapWrong ? "border-destructive" : "",
										].join(" ")}
										style={{
											width: `${Math.max(itemText.length, 8) + 2}ch`,
										}}
									/>
								) : (
									<span className="text-sm">{itemText || "leer"}</span>
								)}
								{review && positionRight && !gapWrong && (
									<Check className="h-4 w-4 text-green-600" />
								)}
								{review && (positionWrong || gapWrong) && (
									<X className="h-4 w-4 text-destructive" />
								)}
							</div>
						</Reorder.Item>
					);
				})}
			</Reorder.Group>
			{!review && (
				<p className="pl-6 text-xs text-muted-foreground">
					{strings.hint.horizontalReordering}
				</p>
			)}
		</div>
	);
};

export default HorizontalReorderingView;
