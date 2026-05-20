"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { TrueFalseQuestion } from "@/lib/firebase/tests";
import { TFAnswer } from "@/lib/student/scoring";
import type { WorksheetStrings } from "@/lib/i18n/types";

interface Props {
	question: TrueFalseQuestion;
	index: number;
	answer: TFAnswer | undefined;
	onAnswer: (a: TFAnswer) => void;
	mode: "take" | "review";
	strings: WorksheetStrings;
}

const TrueFalseView: React.FC<Props> = ({
	question,
	index,
	answer,
	onAnswer,
	mode,
	strings,
}) => {
	const selected = answer?.selected ?? null;
	const review = mode === "review";

	const renderButton = (value: boolean, label: string) => {
		const isSelected = selected === value;
		const isCorrect = review && value === question.isTrue;
		const isWrongSelected = review && isSelected && !isCorrect;
		return (
			<button
				type="button"
				onClick={() => !review && onAnswer({ selected: value })}
				disabled={review}
				className={[
					"flex-1 flex min-h-12 items-center justify-center gap-2 rounded-md border p-3 text-base transition-colors",
					isCorrect
						? "border-green-500 bg-green-50 dark:bg-green-950/30"
						: isWrongSelected
							? "border-destructive bg-destructive/10"
							: isSelected
								? "border-primary bg-primary/5"
								: "border-input hover:bg-accent/40",
				].join(" ")}
			>
				<span className="font-medium">{label}</span>
				{review && isCorrect && (
					<Check className="h-5 w-5 text-green-600" />
				)}
				{review && isWrongSelected && (
					<X className="h-5 w-5 text-destructive" />
				)}
			</button>
		);
	};

	return (
		<div className="space-y-2">
			<p className="font-medium">
				{index + 1}. {question.text || strings.fallback.statementMissing}
			</p>
			<div className="flex items-stretch gap-3 pl-6">
				{renderButton(true, strings.trueLabel)}
				{renderButton(false, strings.falseLabel)}
			</div>
		</div>
	);
};

export default TrueFalseView;
