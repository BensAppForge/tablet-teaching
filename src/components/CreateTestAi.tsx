"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
	ArrowLeft,
	Loader2,
	Sparkles,
	X,
	Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import {
	AiQuestionType,
	generateTestQuestions,
	GenerateTestQuestionsResponse,
} from "@/lib/firebase/ai";
import { CEFRLevel, createTest, Question, Test } from "@/lib/firebase/tests";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const LANGUAGES = [
	"Deutsch",
	"Englisch",
	"Französisch",
	"Spanisch",
	"Italienisch",
];
const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const ALL_TYPES: { value: AiQuestionType; label: string }[] = [
	{ value: "multiple-choice", label: "Multiple Choice" },
	{ value: "true-false", label: "Wahr / Falsch" },
	{ value: "gap-fill", label: "Lückentext" },
	{ value: "matching", label: "Zuordnung" },
	{ value: "reordering-horizontal", label: "Horizontale Reihenfolge" },
	{ value: "reordering-vertical", label: "Vertikale Reihenfolge" },
];

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
	ALL_TYPES.map((t) => [t.value, t.label])
);

const CreateTestAi: React.FC = () => {
	const router = useRouter();
	const { currentUser } = useAuth();

	const [prompt, setPrompt] = useState("");
	const [sourceText, setSourceText] = useState("");
	const [language, setLanguage] = useState("Englisch");
	const [cefrLevel, setCefrLevel] = useState<CEFRLevel>("B1");
	const [count, setCount] = useState(8);
	const [allowedTypes, setAllowedTypes] = useState<AiQuestionType[]>(
		ALL_TYPES.map((t) => t.value)
	);

	const [generating, setGenerating] = useState(false);
	const [result, setResult] =
		useState<GenerateTestQuestionsResponse | null>(null);
	const [accepting, setAccepting] = useState(false);

	const toggleType = (t: AiQuestionType) => {
		setAllowedTypes((prev) =>
			prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
		);
	};

	const canGenerate =
		prompt.trim().length >= 3 &&
		allowedTypes.length > 0 &&
		count >= 1 &&
		count <= 15 &&
		!generating;

	const handleGenerate = async () => {
		if (!canGenerate) return;
		setGenerating(true);
		try {
			const res = await generateTestQuestions({
				prompt: prompt.trim(),
				sourceText: sourceText.trim() || undefined,
				language,
				cefrLevel,
				count,
				allowedTypes,
			});
			if (!res.questions.length) {
				toast.error("Die KI hat keine Aufgaben erzeugt. Bitte erneut versuchen.");
				return;
			}
			setResult(res);
			if (typeof window !== "undefined") {
				window.scrollTo({ top: 0, behavior: "smooth" });
			}
		} catch (err: any) {
			console.error(err);
			const code = err?.code as string | undefined;
			if (code === "functions/resource-exhausted") {
				toast.error(
					err?.message ??
						"KI-Limit erreicht. Mit Premium gibt es keine Beschränkung."
				);
			} else {
				toast.error(err?.message ?? "KI-Anfrage fehlgeschlagen");
			}
		} finally {
			setGenerating(false);
		}
	};

	const handleAccept = async () => {
		if (!currentUser || !result) return;
		setAccepting(true);
		try {
			const testData: Test = {
				teacherId: currentUser.uid,
				title: result.title || "KI-generierter Test",
				description: result.description ?? "",
				targetLanguage: language,
				cefrLevel,
				defaultCreditPoints: 1,
				isAIGenerated: true,
			};
			const newTestId = await createTest(testData, result.questions);
			toast.success("Test gespeichert. Du kannst die Aufgaben jetzt bearbeiten.");
			router.push(`/edit-test?id=${newTestId}`);
		} catch (err: any) {
			console.error(err);
			toast.error(
				err?.message ??
					"Speichern fehlgeschlagen. Bitte versuche es erneut."
			);
		} finally {
			setAccepting(false);
		}
	};

	const handleDiscard = () => {
		setResult(null);
	};

	return (
		<div className="container mx-auto px-4 py-6 max-w-3xl">
			<div className="flex items-center gap-2 mb-4">
				<Button
					variant="outline"
					size="sm"
					className="gap-1 text-muted-foreground"
					onClick={() => router.push("/teacher/dashboard")}
				>
					<ArrowLeft className="h-4 w-4" />
					<span>Dashboard</span>
				</Button>
			</div>

			<div className="border-b mb-6 flex items-center gap-3">
				<Sparkles className="h-6 w-6 text-primary" />
				<h1 className="text-2xl font-semibold py-2 text-gray-700 dark:text-gray-200">
					Test mit KI erstellen
				</h1>
			</div>

			{result ? (
				<>
					<Card className="mb-6 border-primary/30 bg-primary/5">
						<CardContent className="p-5">
							<p className="text-sm text-muted-foreground mb-1">
								KI-Vorschlag
							</p>
							<h2 className="text-xl font-semibold">{result.title}</h2>
							{result.description && (
								<p className="text-sm text-muted-foreground mt-1">
									{result.description}
								</p>
							)}
							<p className="text-sm mt-3">
								{result.questions.length} Aufgaben generiert. Übernimm sie,
								um sie im Test-Editor zu bearbeiten, oder verwirf sie und
								starte einen neuen Versuch.
							</p>
						</CardContent>
					</Card>

					<div className="space-y-4 mb-6">
						{result.questions.map((q, i) => (
							<Card key={i}>
								<CardContent className="p-4">
									<div className="flex items-center justify-between mb-1">
										<span className="text-xs uppercase tracking-wide text-muted-foreground">
											Aufgabe {i + 1}
										</span>
										<span className="text-xs text-muted-foreground">
											{TYPE_LABEL[q.type] ?? q.type}
										</span>
									</div>
									<p className="font-medium">{q.text}</p>
									<QuestionPreviewBody q={q} />
								</CardContent>
							</Card>
						))}
					</div>

					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							onClick={handleDiscard}
							disabled={accepting}
						>
							<X className="h-4 w-4 mr-2" />
							Verwerfen
						</Button>
						<Button onClick={handleAccept} disabled={accepting}>
							{accepting ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Speichern…
								</>
							) : (
								<>
									<Wand2 className="h-4 w-4 mr-2" />
									Übernehmen und bearbeiten
								</>
							)}
						</Button>
					</div>
				</>
			) : (
				<Card>
					<CardHeader>
						<CardTitle>Anweisung & Optionen</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-2">
							<Label htmlFor="ai-prompt">Was soll der Test prüfen? *</Label>
							<Textarea
								id="ai-prompt"
								rows={3}
								placeholder='z. B. "Vokabeltest zum Thema Familie auf B1 mit gemischten Aufgabentypen."'
								value={prompt}
								onChange={(e) => setPrompt(e.target.value)}
								disabled={generating}
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="ai-source">
								Quelltext (optional)
							</Label>
							<Textarea
								id="ai-source"
								rows={6}
								placeholder="Optionaler Text, auf den die Aufgaben sich beziehen sollen. Lehrbuch-Abschnitte, Lesetexte, Vokabel-Listen…"
								value={sourceText}
								onChange={(e) => setSourceText(e.target.value)}
								disabled={generating}
								maxLength={30000}
							/>
							<p className="text-xs text-muted-foreground">
								PDF- und DOCX-Upload folgen demnächst. Vorerst Text einfügen.
							</p>
						</div>

						<div className="flex flex-col md:flex-row gap-4">
							<div className="flex-1 grid gap-2">
								<Label htmlFor="ai-language">Sprache</Label>
								<Select
									value={language}
									onValueChange={(v) => setLanguage(v)}
									disabled={generating}
								>
									<SelectTrigger id="ai-language">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{LANGUAGES.map((l) => (
											<SelectItem key={l} value={l}>
												{l}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex-1 grid gap-2">
								<Label htmlFor="ai-cefr">CEFR-Niveau</Label>
								<Select
									value={cefrLevel}
									onValueChange={(v) => setCefrLevel(v as CEFRLevel)}
									disabled={generating}
								>
									<SelectTrigger id="ai-cefr">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{CEFR_LEVELS.map((l) => (
											<SelectItem key={l} value={l}>
												{l}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex-1 grid gap-2">
								<Label htmlFor="ai-count">Anzahl Aufgaben</Label>
								<Input
									id="ai-count"
									type="number"
									min={1}
									max={15}
									value={count}
									onChange={(e) =>
										setCount(
											Math.max(
												1,
												Math.min(15, parseInt(e.target.value, 10) || 1)
											)
										)
									}
									disabled={generating}
								/>
							</div>
						</div>

						<div>
							<Label>Erlaubte Aufgabentypen</Label>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
								{ALL_TYPES.map((t) => (
									<label
										key={t.value}
										className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent/40"
									>
										<Checkbox
											checked={allowedTypes.includes(t.value)}
											onCheckedChange={() => toggleType(t.value)}
											disabled={generating}
										/>
										<span className="text-sm">{t.label}</span>
									</label>
								))}
							</div>
							{allowedTypes.length === 0 && (
								<p className="text-xs text-destructive mt-1">
									Mindestens ein Aufgabentyp muss erlaubt sein.
								</p>
							)}
						</div>

						<div className="flex justify-end pt-2">
							<Button
								onClick={handleGenerate}
								disabled={!canGenerate}
								size="lg"
							>
								{generating ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Generiere…
									</>
								) : (
									<>
										<Sparkles className="h-4 w-4 mr-2" />
										Generieren
									</>
								)}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
};

// Minimal read-only preview per question type. Kept light — no inputs,
// no scoring, just enough to let the teacher see what was generated
// before clicking "Übernehmen". The real editing happens in TestBuilder
// after acceptance.
const QuestionPreviewBody: React.FC<{ q: Question }> = ({ q }) => {
	const LETTERS = ["A", "B", "C", "D", "E", "F"];

	switch (q.type) {
		case "multiple-choice":
			return (
				<ul className="mt-2 space-y-1 pl-4 text-sm">
					{q.options.map((o, i) => (
						<li key={i}>
							<span
								className={
									i === q.correctOption
										? "text-green-700 dark:text-green-400 font-medium"
										: "text-foreground"
								}
							>
								{LETTERS[i] ?? i + 1}) {o}
							</span>
						</li>
					))}
				</ul>
			);
		case "true-false":
			return (
				<p className="mt-2 text-sm text-muted-foreground">
					Antwort:{" "}
					<span className="text-green-700 dark:text-green-400 font-medium">
						{q.isTrue ? "Wahr" : "Falsch"}
					</span>
				</p>
			);
		case "gap-fill":
			return (
				<div className="mt-2 text-sm text-muted-foreground">
					Lücken:{" "}
					<span className="text-foreground">{q.gaps.join(", ")}</span>
					{q.distractors && q.distractors.length > 0 && (
						<>
							{" · "}Distraktoren:{" "}
							<span className="text-foreground">
								{q.distractors.join(", ")}
							</span>
						</>
					)}
				</div>
			);
		case "matching":
			return (
				<div className="mt-2 grid grid-cols-2 gap-4 text-sm">
					<ul className="space-y-1">
						{q.leftItems.map((l, i) => (
							<li key={i}>
								{i + 1}. {l}{" "}
								<span className="text-muted-foreground">
									→ {q.rightItems[q.correctMatches[i]] ?? "?"}
								</span>
							</li>
						))}
					</ul>
					<ul className="space-y-1">
						{q.rightItems.map((r, i) => (
							<li key={i}>
								{LETTERS[i] ?? i + 1}. {r}
							</li>
						))}
						{q.distractors?.map((d, i) => (
							<li key={`d${i}`} className="text-muted-foreground">
								— {d}
							</li>
						))}
					</ul>
				</div>
			);
		case "reordering-horizontal":
		case "reordering-vertical": {
			const isGap = q.isGap || [];
			return (
				<div className="mt-2 text-sm">
					<p className="text-muted-foreground mb-1">
						Korrekte Reihenfolge:
					</p>
					<ol className="list-decimal pl-5 space-y-0.5">
						{q.items.map((item, i) => (
							<li key={i}>
								<span className={isGap[i] ? "italic" : ""}>{item}</span>
								{isGap[i] && (
									<span className="ml-1 text-xs text-muted-foreground">
										(Lücke)
									</span>
								)}
							</li>
						))}
					</ol>
					{q.distractors && q.distractors.length > 0 && (
						<p className="mt-1 text-muted-foreground text-xs">
							Distraktoren: {q.distractors.join(", ")}
						</p>
					)}
				</div>
			);
		}
	}
	return null;
};

export default CreateTestAi;
