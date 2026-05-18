"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { MultipleChoiceQuestion } from "@/lib/firebase/tests";
import { MCAnswer } from "@/lib/student/scoring";
import type { WorksheetStrings } from "@/lib/i18n/types";

interface Props {
	question: MultipleChoiceQuestion;
	index: number;
	answer: MCAnswer | undefined;
	onAnswer: (a: MCAnswer) => void;
	mode: "take" | "review";
	strings: WorksheetStrings;
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

const MultipleChoiceView: React.FC<Props> = ({
	question,
	index,
	answer,
	onAnswer,
	mode,
	strings,
}) => {
	const selected = answer?.selectedOption ?? null;
	const review = mode === "review";

	return (
		<div className="space-y-2">
			<p className="font-medium">
				{index + 1}. {question.text || strings.fallback.questionMissing}
			</p>
			<ul className="space-y-2 pl-6">
				{question.options.map((opt, i) => {
					const isSelected = selected === i;
					const isCorrect = review && i === question.correctOption;
					const isWrongSelected = review && isSelected && !isCorrect;
					return (
						<li key={i}>
							<button
								type="button"
								onClick={() => !review && onAnswer({ selectedOption: i })}
								disabled={review}
								className={[
									"w-full flex items-start gap-3 text-left p-2 rounded-md border transition-colors",
									isCorrect
										? "border-green-500 bg-green-50 dark:bg-green-950/30"
										: isWrongSelected
											? "border-destructive bg-destructive/10"
											: isSelected
												? "border-primary bg-primary/5"
												: "border-input hover:bg-accent/40",
								].join(" ")}
							>
								<span
									className={[
										"inline-flex items-center justify-center h-6 w-6 rounded-full border text-xs font-medium shrink-0 mt-0.5",
										isSelected || isCorrect
											? "border-current"
											: "border-muted-foreground/50",
									].join(" ")}
								>
									{LETTERS[i] ?? i + 1}
								</span>
								<span className="flex-1">
									{opt || <em className="text-muted-foreground">leer</em>}
								</span>
								{review && isCorrect && (
									<Check className="h-5 w-5 text-green-600 shrink-0" />
								)}
								{review && isWrongSelected && (
									<X className="h-5 w-5 text-destructive shrink-0" />
								)}
							</button>
						</li>
					);
				})}
			</ul>
		</div>
	);
};

export default MultipleChoiceView;
