// Empty (blank) worksheet PDF — printed for students who don't take the
// test in-app. Same shape as WorksheetResultsPDF.tsx but every per-type
// renderer produces handwriting space instead of the student's answer.
//
// Helvetica doesn't ship the symbols we'd want (○, □), so we render them
// as bordered Views.

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
import type { Strings } from "@/lib/i18n/types";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

const colors = {
	text: "#111827",
	muted: "#6b7280",
	border: "#d1d5db",
	rule: "#9ca3af",
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
	identityRow: {
		flexDirection: "row",
		gap: 12,
		marginTop: 8,
		fontSize: 10,
		color: colors.muted,
	},
	identityField: { flex: 1 },
	identityLine: {
		borderBottomWidth: 1,
		borderBottomColor: colors.text,
		height: 14,
		marginTop: 2,
	},
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
	wordBankBox: {
		marginTop: 4,
		marginBottom: 8,
		padding: 6,
		borderWidth: 0.5,
		borderColor: colors.border,
		borderRadius: 3,
	},
	wordBankLabel: { fontSize: 9, color: colors.muted, marginBottom: 4 },
	wordBankRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
	wordChip: {
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderWidth: 0.5,
		borderColor: colors.border,
		borderRadius: 3,
		fontSize: 10,
	},
	row: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 },
	bullet: {
		width: 12,
		height: 12,
		borderWidth: 1,
		borderColor: colors.text,
		borderRadius: 6,
	},
	square: {
		width: 12,
		height: 12,
		borderWidth: 1,
		borderColor: colors.text,
	},
	rowText: { fontSize: 11 },
	handwriteLine: {
		marginTop: 6,
		borderBottomWidth: 1,
		borderBottomColor: colors.rule,
		height: 22,
	},
	twoCol: { flexDirection: "row", gap: 24, marginTop: 6 },
	col: { flex: 1 },
	colItem: { flexDirection: "row", alignItems: "center", marginTop: 6 },
	colLabel: { width: 18, fontSize: 11 },
	hint: { fontSize: 9, color: colors.muted, marginTop: 4 },
});

function shuffle<T>(arr: T[]): T[] {
	const out = [...arr];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

function renderMultipleChoice(q: MultipleChoiceQuestion) {
	return (
		<View>
			{q.options.map((opt, i) => (
				<View key={i} style={styles.row}>
					<View style={styles.bullet} />
					<Text style={styles.rowText}>
						{LETTERS[i] ?? i + 1}) {opt}
					</Text>
				</View>
			))}
		</View>
	);
}

function renderTrueFalse(q: TrueFalseQuestion, t: Strings) {
	return (
		<View style={{ flexDirection: "row", gap: 24, marginTop: 6 }}>
			<View style={styles.row}>
				<View style={styles.square} />
				<Text style={styles.rowText}>{t.pdf.trueLabel}</Text>
			</View>
			<View style={styles.row}>
				<View style={styles.square} />
				<Text style={styles.rowText}>{t.pdf.falseLabel}</Text>
			</View>
		</View>
	);
}

// Render the gap-fill text with each gap replaced by an inline underlined
// gap marker (an underscore run of approximate length).
function renderGapFill(q: GapFillQuestion, t: Strings) {
	const positions = (q as any).gapPositions as
		| { start: number; end: number }[]
		| undefined;
	const text = q.text || "";
	const bankWords = shuffle([
		...(q.gaps ?? []).filter((w) => typeof w === "string" && w.trim()),
		...((q.distractors ?? []).filter(
			(w) => typeof w === "string" && w.trim()
		) as string[]),
	]);

	let body: React.ReactNode;
	if (!Array.isArray(positions) || positions.length === 0) {
		body = <Text style={styles.questionText}>{text}</Text>;
	} else {
		const sorted = [...positions].sort((a, b) => a.start - b.start);
		const parts: React.ReactNode[] = [];
		let cursor = 0;
		sorted.forEach((p, i) => {
			if (cursor < p.start) parts.push(text.slice(cursor, p.start));
			// 12-underscore run as a visual blank.
			parts.push(<Text key={`g${i}`}>{" ____________ "}</Text>);
			cursor = p.end;
		});
		if (cursor < text.length) parts.push(text.slice(cursor));
		body = <Text style={styles.questionText}>{parts}</Text>;
	}

	return (
		<View>
			{bankWords.length > 0 && (
				<View style={styles.wordBankBox}>
					<Text style={styles.wordBankLabel}>{t.pdf.wordBank}:</Text>
					<View style={styles.wordBankRow}>
						{bankWords.map((w, i) => (
							<Text key={i} style={styles.wordChip}>
								{w}
							</Text>
						))}
					</View>
				</View>
			)}
			{body}
		</View>
	);
}

function renderMatching(q: MatchingQuestion) {
	const right = shuffle([
		...q.rightItems.map((v) => ({ v, distractor: false })),
		...((q.distractors ?? []).map((v) => ({ v, distractor: true })) as {
			v: string;
			distractor: boolean;
		}[]),
	]);
	return (
		<View>
			<View style={styles.twoCol}>
				<View style={styles.col}>
					{q.leftItems.map((item, i) => (
						<View key={i} style={styles.colItem}>
							<Text style={styles.colLabel}>{i + 1}.</Text>
							<Text style={styles.rowText}>{item}</Text>
						</View>
					))}
				</View>
				<View style={styles.col}>
					{right.map((row, i) => (
						<View key={i} style={styles.colItem}>
							<Text style={styles.colLabel}>{LETTERS[i] ?? i + 1}.</Text>
							<Text style={styles.rowText}>{row.v}</Text>
						</View>
					))}
				</View>
			</View>
		</View>
	);
}

function renderReordering(q: ReorderingQuestion, t: Strings) {
	const gapWords = (q.isGap || [])
		.map((isGap, i) => (isGap ? q.items[i] : null))
		.filter((w): w is string => typeof w === "string" && w.trim().length > 0);
	const bankWords = shuffle([
		...gapWords,
		...((q.distractors ?? []).filter(
			(w) => typeof w === "string" && w.trim()
		) as string[]),
	]);
	const shuffledItems = shuffle(
		q.items.map((value, i) => ({ value, isGap: !!(q.isGap || [])[i] }))
	);
	return (
		<View>
			{bankWords.length > 0 && (
				<View style={styles.wordBankBox}>
					<Text style={styles.wordBankLabel}>{t.pdf.wordBank}:</Text>
					<View style={styles.wordBankRow}>
						{bankWords.map((w, i) => (
							<Text key={i} style={styles.wordChip}>
								{w}
							</Text>
						))}
					</View>
				</View>
			)}
			<View style={styles.wordBankRow}>
				{shuffledItems.map((it, i) => (
					<Text key={i} style={styles.wordChip}>
						{it.isGap ? "______" : it.value}
					</Text>
				))}
			</View>
			<Text style={styles.hint}>{t.pdf.correctOrder}:</Text>
			{q.items.map((_, i) => (
				<View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
					<Text style={styles.colLabel}>{i + 1}.</Text>
					<View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: colors.rule, height: 18 }} />
				</View>
			))}
		</View>
	);
}

function renderBody(q: Question, t: Strings) {
	switch (q.type) {
		case "multiple-choice":
			return renderMultipleChoice(q as MultipleChoiceQuestion);
		case "true-false":
			return renderTrueFalse(q as TrueFalseQuestion, t);
		case "gap-fill":
			return renderGapFill(q as GapFillQuestion, t);
		case "matching":
			return renderMatching(q as MatchingQuestion);
		case "reordering-horizontal":
		case "reordering-vertical":
			return renderReordering(q as ReorderingQuestion, t);
	}
	return null;
}

export interface EmptyWorksheetPDFProps {
	testTitle: string;
	testDescription?: string;
	questions: Question[];
	strings: Strings;
}

export const EmptyWorksheetPDF: React.FC<EmptyWorksheetPDFProps> = ({
	testTitle,
	testDescription,
	questions,
	strings: t,
}) => {
	return (
		<Document title={`${testTitle} (leer)`}>
			<Page size="A4" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>{testTitle}</Text>
					{testDescription ? (
						<Text style={styles.description}>{testDescription}</Text>
					) : null}
					<View style={styles.identityRow}>
						<View style={styles.identityField}>
							<Text>{t.pdf.student}:</Text>
							<View style={styles.identityLine} />
						</View>
						<View style={styles.identityField}>
							<Text>{t.pdf.class}:</Text>
							<View style={styles.identityLine} />
						</View>
						<View style={styles.identityField}>
							<Text>{t.pdf.submittedOn}:</Text>
							<View style={styles.identityLine} />
						</View>
					</View>
				</View>

				{questions.map((q, i) => (
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
						{renderBody(q, t)}
					</View>
				))}
			</Page>
		</Document>
	);
};

export default EmptyWorksheetPDF;
