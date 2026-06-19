import React from "react";

import {
	Question,
	MultipleChoiceQuestion,
	TrueFalseQuestion,
	GapFillQuestion,
	MatchingQuestion,
	ReorderingQuestion,
} from "@/lib/firebase/tests";
import type { Strings } from "@/lib/i18n/types";
import {
	GapAnswer,
	MCAnswer,
	MatchingAnswer,
	ReorderingAnswer,
	TFAnswer,
} from "@/lib/student/scoring";
import {
	MultipleChoiceView,
	TrueFalseView,
	GapFillView,
	MatchingView,
	HorizontalReorderingView,
	VerticalReorderingView,
} from "@/components/student";

/**
 * Render a single question by type. Shared by the student worksheet
 * (`StudentWorksheet`) and the teacher's classroom-review view
 * (`BesprechungView`) so the per-type rendering stays in lockstep —
 * `mode="take"` is interactive, `mode="review"` shows the correct
 * solution and marks the given answer. The correct answer is derived
 * from the question object by each view, so no separate solution prop
 * is needed.
 */
export function renderQuestion(
	q: Question,
	displayIndex: number,
	answer: unknown,
	onAnswer: (a: unknown) => void,
	mode: "take" | "review",
	strings: Strings
): React.ReactNode {
	const ws = strings.worksheet;
	switch (q.type) {
		case "multiple-choice":
			return (
				<MultipleChoiceView
					question={q as MultipleChoiceQuestion}
					index={displayIndex}
					answer={answer as MCAnswer | undefined}
					onAnswer={onAnswer as (a: MCAnswer) => void}
					mode={mode}
					strings={ws}
				/>
			);
		case "true-false":
			return (
				<TrueFalseView
					question={q as TrueFalseQuestion}
					index={displayIndex}
					answer={answer as TFAnswer | undefined}
					onAnswer={onAnswer as (a: TFAnswer) => void}
					mode={mode}
					strings={ws}
				/>
			);
		case "gap-fill":
			return (
				<GapFillView
					question={q as GapFillQuestion}
					index={displayIndex}
					answer={answer as GapAnswer | undefined}
					onAnswer={onAnswer as (a: GapAnswer) => void}
					mode={mode}
					strings={ws}
				/>
			);
		case "matching":
			return (
				<MatchingView
					question={q as MatchingQuestion}
					index={displayIndex}
					answer={answer as MatchingAnswer | undefined}
					onAnswer={onAnswer as (a: MatchingAnswer) => void}
					mode={mode}
					strings={ws}
				/>
			);
		case "reordering-horizontal":
			return (
				<HorizontalReorderingView
					question={q as ReorderingQuestion}
					index={displayIndex}
					answer={answer as ReorderingAnswer | undefined}
					onAnswer={onAnswer as (a: ReorderingAnswer) => void}
					mode={mode}
					strings={ws}
				/>
			);
		case "reordering-vertical":
			return (
				<VerticalReorderingView
					question={q as ReorderingQuestion}
					index={displayIndex}
					answer={answer as ReorderingAnswer | undefined}
					onAnswer={onAnswer as (a: ReorderingAnswer) => void}
					mode={mode}
					strings={ws}
				/>
			);
		default:
			return (
				<p className="text-destructive text-sm">
					Unbekannter Fragentyp: {(q as any).type}
				</p>
			);
	}
}
