// Per-question completeness checks used by the test builder to tell a
// teacher EXACTLY which question is incomplete (and why) before saving —
// rather than silently saving a broken test. Each function returns a short
// German message naming the first missing piece, or null when the question
// is complete. Kept here (not in the editors) so the builder can validate
// every question centrally and highlight/scroll to the first problem.

import { Question } from "@/lib/firebase/tests";

const filled = (s?: string): boolean => !!s && s.trim().length > 0;

/**
 * Returns a human-readable problem for an incomplete question, or null if
 * it's ready to save. Messages are phrased for non-technical teachers.
 */
export function validateQuestion(q: Question): string | null {
	if (!filled(q.text)) {
		return q.type === "true-false"
			? "Die Aussage fehlt."
			: "Der Fragetext fehlt.";
	}

	switch (q.type) {
		case "multiple-choice": {
			const options = q.options ?? [];
			if (options.length < 2) return "Mindestens zwei Antwortoptionen nötig.";
			if (options.some((o) => !filled(o)))
				return "Alle Antwortoptionen müssen ausgefüllt sein.";
			if (
				q.correctOption == null ||
				q.correctOption < 0 ||
				q.correctOption >= options.length
			)
				return "Bitte die richtige Antwort markieren.";
			return null;
		}

		case "true-false":
			// `isTrue` is always a boolean, so a filled statement is enough.
			return null;

		case "gap-fill": {
			const gaps = q.gaps ?? [];
			if (gaps.length < 1)
				return "Bitte mindestens ein Wort als Lücke markieren.";
			if (gaps.some((g) => !filled(g)))
				return "Jede Lücke braucht eine Lösung.";
			if (q.distractors?.some((d) => !filled(d)))
				return "Leere Ablenker-Wörter bitte ausfüllen oder entfernen.";
			return null;
		}

		case "matching": {
			const left = q.leftItems ?? [];
			const right = q.rightItems ?? [];
			if (left.length < 2) return "Mindestens zwei Paare nötig.";
			if (left.some((v) => !filled(v)))
				return "Alle linken Elemente müssen ausgefüllt sein.";
			if (right.some((v) => !filled(v)))
				return "Alle rechten Elemente müssen ausgefüllt sein.";
			if (q.distractors?.some((d) => !filled(d)))
				return "Leere Ablenker-Elemente bitte ausfüllen oder entfernen.";
			if (
				!q.correctMatches ||
				q.correctMatches.length !== left.length ||
				q.correctMatches.some((m) => m == null || m < 0 || m >= right.length)
			)
				return "Bitte jedem linken Element ein rechtes zuordnen.";
			return null;
		}

		case "reordering-horizontal":
		case "reordering-vertical": {
			const items = q.items ?? [];
			if (items.length < 2) return "Mindestens zwei Elemente nötig.";
			if (items.some((v) => !filled(v)))
				return "Alle Elemente müssen ausgefüllt sein.";
			if (q.distractors?.some((d) => !filled(d)))
				return "Leere Ablenker-Wörter bitte ausfüllen oder entfernen.";
			return null;
		}

		default:
			return null;
	}
}
