"use client";

import React from "react";

import { MatchingQuestion } from "@/lib/firebase/tests";
import MatchingEditor from "@/components/questions/MatchingEditor";

const initialQuestion: MatchingQuestion = {
	type: "matching",
	text: "Ordnen Sie die Begriffe den passenden Erklärungen zu.",
	leftItems: ["der Apfel", "la maison", "to read"],
	rightItems: ["the apple", "das Haus", "lesen"],
	correctMatches: [0, 1, 2],
	distractors: ["laufen"],
	points: 1,
};

export default function MatchingEditorTest() {
	const [question, setQuestion] = React.useState<MatchingQuestion>(initialQuestion);

	return (
		<div className="space-y-4">
			<MatchingEditor question={question} onChange={setQuestion} />
		</div>
	);
}
