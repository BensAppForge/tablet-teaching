// Worksheet results PDF document.
//
// Lives in /components/student so it ships only with the worksheet route
// bundle, and is itself loaded via dynamic import from
// StudentWorksheet.tsx so @react-pdf/renderer (~300KB) only hits the
// network when the student clicks "PDF herunterladen".
//
// Per-type renderers below use plain text + colour to mark correctness,
// rather than ✓/✗ glyphs — @react-pdf/renderer's default Helvetica
// doesn't include those code points and registering a fallback font is
// out of scope for v1.

import React from "react";
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
} from "@react-pdf/renderer";

import {
	GapFillQuestion,
	MatchingQuestion,
	MultipleChoiceQuestion,
	Question,
	ReorderingQuestion,
	TrueFalseQuestion,
} from "@/lib/firebase/tests";
import {
	GapAnswer,
	MatchingAnswer,
	MCAnswer,
	QuestionGrade,
	ReorderingAnswer,
	TFAnswer,
} from "@/lib/student/scoring";
import { SubmissionResult } from "@/lib/student/storage";
import type { Strings } from "@/lib/i18n/types";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

const colors = {
	text: "#111827",
	muted: "#6b7280",
	border: "#e5e7eb",
	correct: "#15803d",
	wrong: "#b91c1c",
};

const styles = StyleSheet.create({
	page: {
		padding: 40,
		fontSize: 11,
		fontFamily: "Helvetica",
		color: colors.text,
	},
	header: {
		marginBottom: 16,
		paddingBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
	description: { color: "#374151", marginBottom: 6 },
	metaRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		fontSize: 10,
		color: colors.muted,
		marginTop: 2,
	},
	scoreBanner: { fontSize: 12, marginTop: 6, color: colors.text },
	scoreStrong: { fontFamily: "Helvetica-Bold" },
	section: {
		marginTop: 14,
		paddingBottom: 10,
		borderBottomWidth: 0.5,
		borderBottomColor: colors.border,
	},
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 4,
	},
	questionNum: { fontFamily: "Helvetica-Bold", fontSize: 12 },
	typeLabel: { fontSize: 9, color: colors.muted },
	questionText: { marginBottom: 6, lineHeight: 1.4 },
	label: { fontSize: 9, color: colors.muted, marginTop: 4 },
	answerLine: { marginLeft: 10, marginTop: 1 },
	correctLine: { marginLeft: 10, marginTop: 1, color: colors.correct },
	wrongLine: { marginLeft: 10, marginTop: 1, color: colors.wrong },
	pointsLine: { marginTop: 6, fontSize: 10 },
});

function fmtPoints(n: number): string {
	// Trim trailing zero after a single decimal place.
	return n % 1 === 0 ? String(n) : (Math.round(n * 10) / 10).toString();
}

function renderMultipleChoice(
	q: MultipleChoiceQuestion,
	ans: MCAnswer | undefined,
	t: Strings
) {
	const selected = ans?.selectedOption ?? null;
	const correct = q.correctOption;
	return (
		<View>
			<Text style={styles.label}>{t.pdf.yourAnswer}:</Text>
			{selected === null ? (
				<Text style={styles.wrongLine}>
					{t.pdf.notAnswered} ({t.pdf.wrong})
				</Text>
			) : (
				<Text
					style={
						selected === correct ? styles.correctLine : styles.wrongLine
					}
				>
					{LETTERS[selected] ?? selected + 1}) {q.options[selected] ?? ""}{" "}
					({selected === correct ? t.pdf.correct : t.pdf.wrong})
				</Text>
			)}
			{selected !== correct && (
				<>
					<Text style={styles.label}>{t.pdf.correctAnswer}:</Text>
					<Text style={styles.correctLine}>
						{LETTERS[correct] ?? correct + 1}) {q.options[correct] ?? ""}
					</Text>
				</>
			)}
		</View>
	);
}

function renderTrueFalse(
	q: TrueFalseQuestion,
	ans: TFAnswer | undefined,
	t: Strings
) {
	const selected = ans?.selected ?? null;
	const correct = q.isTrue;
	const labelFor = (v: boolean) => (v ? t.pdf.trueLabel : t.pdf.falseLabel);
	return (
		<View>
			<Text style={styles.label}>{t.pdf.yourAnswer}:</Text>
			{selected === null ? (
				<Text style={styles.wrongLine}>
					{t.pdf.notAnswered} ({t.pdf.wrong})
				</Text>
			) : (
				<Text
					style={
						selected === correct ? styles.correctLine : styles.wrongLine
					}
				>
					{labelFor(selected)} (
					{selected === correct ? t.pdf.correct : t.pdf.wrong})
				</Text>
			)}
			{selected !== correct && (
				<>
					<Text style={styles.label}>{t.pdf.correctAnswer}:</Text>
					<Text style={styles.correctLine}>{labelFor(correct)}</Text>
				</>
			)}
		</View>
	);
}

function renderGapFill(
	q: GapFillQuestion,
	ans: GapAnswer | undefined,
	t: Strings
) {
	const answers = ans?.answers ?? [];
	const norm = (s: string) =>
		(s ?? "")
			.normalize("NFC")
			.replace(/[​-‍﻿]/g, "")
			.replace(/[  ]/g, " ")
			.trim()
			.replace(/\s+/g, " ")
			.toLocaleLowerCase("de-DE");
	return (
		<View>
			<Text style={styles.label}>{t.pdf.yourAnswer}:</Text>
			{q.gaps.map((expected, i) => {
				const typed = answers[i] ?? "";
				const ok = typed && norm(typed) === norm(expected);
				return (
					<Text
						key={i}
						style={ok ? styles.correctLine : styles.wrongLine}
					>
						{t.pdf.gap} {i + 1}: {typed || t.pdf.notAnswered}
						{ok
							? ` (${t.pdf.correct})`
							: ` (${t.pdf.wrong} — ${t.pdf.correctAnswer.toLowerCase()}: ${expected})`}
					</Text>
				);
			})}
		</View>
	);
}

function renderMatching(
	q: MatchingQuestion,
	ans: MatchingAnswer | undefined,
	t: Strings
) {
	const conns = ans?.connections ?? [];
	const right = q.rightItems;
	const dist = q.distractors || [];
	const codeText = (code: number): string => {
		if (code < right.length) return right[code] ?? "";
		const di = code - right.length;
		return dist[di] ?? "";
	};
	return (
		<View>
			<Text style={styles.label}>{t.pdf.yourAnswer}:</Text>
			{q.leftItems.map((left, i) => {
				const code = conns[i] ?? -1;
				const expected = q.correctMatches[i];
				const ok = code === expected;
				const yourText =
					code === -1 ? t.pdf.notAnswered : codeText(code);
				return (
					<Text
						key={i}
						style={ok ? styles.correctLine : styles.wrongLine}
					>
						{i + 1}. {left} {t.pdf.matchedWith} {yourText}
						{ok
							? ` (${t.pdf.correct})`
							: ` (${t.pdf.wrong} — ${t.pdf.correctAnswer.toLowerCase()}: ${right[expected] ?? ""})`}
					</Text>
				);
			})}
		</View>
	);
}

function renderReordering(
	q: ReorderingQuestion,
	ans: ReorderingAnswer | undefined,
	t: Strings
) {
	const order = ans?.order ?? [];
	const gapTexts = ans?.gapTexts ?? {};
	const correct =
		q.correctOrder?.length === q.items.length
			? q.correctOrder
			: q.items.map((_, i) => i);
	// For gap items, show whatever the student typed (or the not-answered
	// dash if they skipped). No brackets: the colour already indicates
	// correctness and brackets only invited the "but the correct answer
	// doesn't have brackets" confusion.
	const display = (origIndex: number): string => {
		const isGap = !!(q.isGap || [])[origIndex];
		if (isGap) {
			const typed = gapTexts[origIndex] ?? "";
			return typed.trim() || t.pdf.notAnswered;
		}
		return q.items[origIndex] ?? "";
	};
	return (
		<View>
			<Text style={styles.label}>{t.pdf.yourOrder}:</Text>
			{order.length === 0 ? (
				<Text style={styles.wrongLine}>{t.pdf.notAnswered}</Text>
			) : (
				order.map((origIndex, i) => {
					const ok = correct[i] === origIndex;
					return (
						<Text
							key={i}
							style={ok ? styles.correctLine : styles.wrongLine}
						>
							{i + 1}. {display(origIndex)}
						</Text>
					);
				})
			)}
			<Text style={styles.label}>{t.pdf.correctOrder}:</Text>
			{correct.map((origIndex, i) => (
				<Text key={i} style={styles.correctLine}>
					{i + 1}. {q.items[origIndex] ?? ""}
				</Text>
			))}
		</View>
	);
}

function renderQuestionBody(q: Question, ans: unknown, t: Strings) {
	switch (q.type) {
		case "multiple-choice":
			return renderMultipleChoice(
				q as MultipleChoiceQuestion,
				ans as MCAnswer | undefined,
				t
			);
		case "true-false":
			return renderTrueFalse(
				q as TrueFalseQuestion,
				ans as TFAnswer | undefined,
				t
			);
		case "gap-fill":
			return renderGapFill(
				q as GapFillQuestion,
				ans as GapAnswer | undefined,
				t
			);
		case "matching":
			return renderMatching(
				q as MatchingQuestion,
				ans as MatchingAnswer | undefined,
				t
			);
		case "reordering-horizontal":
		case "reordering-vertical":
			return renderReordering(
				q as ReorderingQuestion,
				ans as ReorderingAnswer | undefined,
				t
			);
	}
	return null;
}

export interface WorksheetResultsPDFProps {
	testTitle: string;
	testDescription?: string;
	questions: Question[];
	answers: Record<string, unknown>;
	submission: SubmissionResult;
	studentName: string;
	className: string;
	strings: Strings;
}

export const WorksheetResultsPDF: React.FC<WorksheetResultsPDFProps> = ({
	testTitle,
	testDescription,
	questions,
	answers,
	submission,
	studentName,
	className,
	strings: t,
}) => {
	const percent =
		submission.totalPossible > 0
			? Math.round((submission.totalEarned / submission.totalPossible) * 100)
			: 0;
	const submittedAt = new Date(submission.submittedAt).toLocaleString("de-DE");

	return (
		<Document title={`${t.pdf.documentTitle} – ${testTitle}`}>
			<Page size="A4" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>{testTitle}</Text>
					{testDescription ? (
						<Text style={styles.description}>{testDescription}</Text>
					) : null}
					<View style={styles.metaRow}>
						<Text>
							{t.pdf.student}: {studentName}
						</Text>
						<Text>
							{t.pdf.class}: {className}
						</Text>
					</View>
					<View style={styles.metaRow}>
						<Text>
							{t.pdf.submittedOn}: {submittedAt}
						</Text>
					</View>
					<Text style={styles.scoreBanner}>
						{t.pdf.totalScore}:{" "}
						<Text style={styles.scoreStrong}>
							{fmtPoints(submission.totalEarned)} /{" "}
							{fmtPoints(submission.totalPossible)} {t.pdf.points} ({percent}%)
						</Text>
					</Text>
				</View>

				{questions.map((q, i) => {
					const grade: QuestionGrade | undefined =
						submission.perQuestion[q.id ?? ""];
					const earned = grade?.earned ?? 0;
					const max = grade?.max ?? q.points ?? 1;
					const ok = grade?.correct ?? false;
					return (
						<View key={q.id ?? i} style={styles.section} wrap={false}>
							<View style={styles.sectionHeader}>
								<Text style={styles.questionNum}>
									{t.pdf.question} {i + 1}
								</Text>
								<Text style={styles.typeLabel}>
									{t.pdf.questionType[q.type] ?? q.type}
								</Text>
							</View>
							{q.text ? (
								<Text style={styles.questionText}>{q.text}</Text>
							) : null}
							{renderQuestionBody(q, answers[q.id ?? ""], t)}
							<Text
								style={{
									...styles.pointsLine,
									color: ok ? colors.correct : colors.wrong,
								}}
							>
								{fmtPoints(earned)} / {fmtPoints(max)} {t.pdf.points} —{" "}
								{ok ? t.pdf.correct : t.pdf.wrong}
							</Text>
						</View>
					);
				})}
			</Page>
		</Document>
	);
};

export default WorksheetResultsPDF;
