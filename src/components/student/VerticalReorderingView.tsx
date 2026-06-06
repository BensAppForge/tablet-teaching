"use client";

import React, { useEffect, useMemo } from "react";
import {
	DndContext,
	DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	TouchSensor,
	closestCenter,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	arrayMove,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GripVertical, Check, X } from "lucide-react";
import { ReorderingQuestion } from "@/lib/firebase/tests";
import { ReorderingAnswer, norm } from "@/lib/student/scoring";
import { Input } from "@/components/ui/input";
import SortableWord from "@/components/SortableWord";
import type { WorksheetStrings } from "@/lib/i18n/types";

interface Props {
	question: ReorderingQuestion;
	index: number;
	answer: ReorderingAnswer | undefined;
	onAnswer: (a: ReorderingAnswer) => void;
	mode: "take" | "review";
	strings: WorksheetStrings;
}

// See HorizontalReorderingView for the rationale on avoiding the correct
// permutation.
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

// Inline restrictToVerticalAxis modifier — zeroing out the x component
// keeps the dragged item locked to its column without pulling in
// @dnd-kit/modifiers as an extra dependency.
const restrictToVerticalAxis = ({
	transform,
}: {
	transform: { x: number; y: number; scaleX: number; scaleY: number };
}) => ({ ...transform, x: 0 });

const VerticalReorderingView: React.FC<Props> = ({
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

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 120, tolerance: 6 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	// See HorizontalReorderingView for the word-bank rationale.
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

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const oldIdx = order.indexOf(active.id as number);
		const newIdx = order.indexOf(over.id as number);
		if (oldIdx < 0 || newIdx < 0) return;
		updateOrder(arrayMove(order, oldIdx, newIdx));
	};

	const isGap = (i: number) => !!(question.isGap || [])[i];

	return (
		<div className="space-y-3">
			<p className="font-medium">
				{index + 1}.{" "}
				{question.text || strings.defaultQuestion.verticalReordering}
			</p>
			{wordBank.length > 0 && (
				<div className="pl-6">
					<p className="text-xs text-muted-foreground mb-1">
						{strings.wordBank}
					</p>
					<div className="flex flex-wrap gap-1.5">
						{wordBank.map((w, i) => (
							<span
								key={i}
								className="text-sm px-2 py-0.5 rounded bg-muted text-muted-foreground"
							>
								{w}
							</span>
						))}
					</div>
				</div>
			)}
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				modifiers={[restrictToVerticalAxis]}
				onDragEnd={review ? undefined : handleDragEnd}
			>
				<SortableContext
					items={order}
					strategy={verticalListSortingStrategy}
				>
					<div className="space-y-2 pl-6">
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
								<SortableWord
									key={origIndex}
									id={origIndex}
									disabled={review}
								>
									{({ attributes, listeners }) => (
										<div
											{...attributes}
											{...listeners}
											className={[
												"flex min-h-12 items-center gap-3 rounded-md border bg-background px-3 py-2",
												review
													? positionRight
														? "border-green-500 bg-green-50 dark:bg-green-950/30"
														: "border-destructive bg-destructive/10"
													: "border-input",
											].join(" ")}
										>
											<span className="inline-flex items-center justify-center h-6 w-6 rounded border text-xs font-medium shrink-0 text-muted-foreground">
												{displayIndex + 1}
											</span>
											{!review && (
												<GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
											)}
											{gap ? (
												<Input
													type="text"
													value={gapTyped}
													onChange={(e) =>
														updateGap(origIndex, e.target.value)
													}
													onPointerDown={(e) => e.stopPropagation()}
													onKeyDown={(e) => e.stopPropagation()}
													disabled={review}
													aria-label={`Lückentext an Position ${displayIndex + 1}`}
													className={[
														"h-11 px-2 text-sm flex-1",
														gapRight ? "border-green-500" : "",
														gapWrong ? "border-destructive" : "",
													].join(" ")}
												/>
											) : (
												<span className="text-sm flex-1">
													{itemText || "leer"}
												</span>
											)}
											{review && positionRight && !gapWrong && (
												<>
													<Check className="h-4 w-4 text-green-600" aria-hidden="true" />
													<span className="sr-only">richtig</span>
												</>
											)}
											{review && (positionWrong || gapWrong) && (
												<>
													<X className="h-4 w-4 text-destructive" aria-hidden="true" />
													<span className="sr-only">falsch</span>
												</>
											)}
										</div>
									)}
								</SortableWord>
							);
						})}
					</div>
				</SortableContext>
			</DndContext>
			{!review && (
				<p className="pl-6 text-xs text-muted-foreground">
					{strings.hint.verticalReordering}
				</p>
			)}
		</div>
	);
};

export default VerticalReorderingView;
