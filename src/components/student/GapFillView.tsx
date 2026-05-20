"use client";

import React, { useMemo } from "react";
import { Check, X } from "lucide-react";
import { GapFillQuestion } from "@/lib/firebase/tests";
import { GapAnswer, norm } from "@/lib/student/scoring";
import { Input } from "@/components/ui/input";
import type { WorksheetStrings } from "@/lib/i18n/types";

interface Props {
	question: GapFillQuestion;
	index: number;
	answer: GapAnswer | undefined;
	onAnswer: (a: GapAnswer) => void;
	mode: "take" | "review";
	strings: WorksheetStrings;
}

interface GapPos {
	start: number;
	end: number;
}

type Segment =
	| { type: "text"; value: string }
	| { type: "gap"; gapIndex: number };

const GapFillView: React.FC<Props> = ({
	question,
	index,
	answer,
	onAnswer,
	mode,
	strings,
}) => {
	const review = mode === "review";
	const answers = answer?.answers ?? [];

	const segments: Segment[] = useMemo(() => {
		const text = question.text || "";
		const positions: GapPos[] = Array.isArray(
			(question as any).gapPositions
		)
			? [...((question as any).gapPositions as GapPos[])].sort(
					(a, b) => a.start - b.start
			  )
			: [];
		if (positions.length === 0) {
			return [{ type: "text", value: text }];
		}
		const out: Segment[] = [];
		let cursor = 0;
		positions.forEach((p, i) => {
			if (cursor < p.start) {
				out.push({ type: "text", value: text.slice(cursor, p.start) });
			}
			out.push({ type: "gap", gapIndex: i });
			cursor = p.end;
		});
		if (cursor < text.length) {
			out.push({ type: "text", value: text.slice(cursor) });
		}
		return out;
	}, [question]);

	const updateGap = (gapIndex: number, value: string) => {
		const next = [...answers];
		while (next.length <= gapIndex) next.push("");
		next[gapIndex] = value;
		onAnswer({ answers: next });
	};

	// Always show a word bank so students see which words go into the gaps.
	// For v1 this contains the gap answers; once distractors are wired in,
	// they get mixed in here too. Stable per question.id so it doesn't
	// reshuffle on every keystroke.
	const wordBank = useMemo(() => {
		const all = [
			...(question.gaps || []),
			...(question.distractors || []),
		].filter(
			(w): w is string => typeof w === "string" && w.trim().length > 0
		);
		const arr = [...all];
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [question.id]);

	return (
		<div className="space-y-3">
			<p className="font-medium">
				{index + 1}. {strings.gapFillHeader}
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
			<p className="pl-6 leading-relaxed text-base">
				{segments.map((seg, i) => {
					if (seg.type === "text") return <span key={i}>{seg.value}</span>;
					const value = answers[seg.gapIndex] ?? "";
					const correct = question.gaps[seg.gapIndex] ?? "";
					const isCorrect = review && norm(value) === norm(correct);
					const isWrong = review && !isCorrect;
					return (
						<span
							key={i}
							className="inline-flex items-center align-middle mx-1"
						>
							<Input
								type="text"
								value={value}
								onChange={(e) => updateGap(seg.gapIndex, e.target.value)}
								disabled={review}
								aria-label={`Lücke ${seg.gapIndex + 1}`}
								className={[
										"inline-block h-11 min-w-[6ch] w-auto px-2 text-base",
									isCorrect
										? "border-green-500 bg-green-50 dark:bg-green-950/30"
										: isWrong
											? "border-destructive bg-destructive/10"
											: "",
								].join(" ")}
								style={{ width: `${Math.max(value.length, correct.length || 6) + 2}ch` }}
							/>
							{review && isCorrect && (
								<Check className="h-4 w-4 text-green-600 ml-1" />
							)}
							{review && isWrong && (
								<>
									<X className="h-4 w-4 text-destructive ml-1" />
									<span className="ml-1 text-xs text-muted-foreground">
										({strings.correctAnswerInline}:{" "}
										<strong>{correct}</strong>)
									</span>
								</>
							)}
						</span>
					);
				})}
			</p>
		</div>
	);
};

export default GapFillView;
