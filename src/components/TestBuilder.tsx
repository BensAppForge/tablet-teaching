"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Save,
  Plus,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Paperclip,
  X,
  FileText,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  AiQuestionType,
  AiSourceFile,
  AiSourceFileMime,
  AI_SOURCE_DOCX_MIME,
  AI_SOURCE_PDF_MIME,
  generateTestQuestions,
} from "@/lib/firebase/ai";
import {
  createTest,
  updateTest,
  getTest,
  Test,
  Question,
  QuestionType,
  CEFRLevel,
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  GapFillQuestion,
  MatchingQuestion,
  ReorderingQuestion,
} from "@/lib/firebase/tests";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import TestGeneralSettingsForm, { TestGeneralSettings } from "@/components/TestGeneralSettingsForm";
import {
  MultipleChoiceEditor,
  TrueFalseEditor,
  GapFillEditor,
  MatchingEditor,
  HorizontalReorderingEditor,
  VerticalReorderingEditor
} from "@/components/questions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TestBuilderProps {
  testId?: string; // Optional - if provided, we're editing an existing test
}

const TestBuilder: React.FC<TestBuilderProps> = ({ testId }) => {
  const router = useRouter();
  const { currentUser } = useAuth();
  
  // State for general test settings with safe default values
  const [testSettings, setTestSettings] = useState<TestGeneralSettings>({
    title: "Neuer Test",
    description: "Beschreibung des Tests",
    targetLanguage: "Englisch",
    cefrLevel: "B1",
    defaultCreditPoints: 1,
  });
  
  // State for questions
  const [questions, setQuestions] = useState<Question[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Track whether the AI-generation panel is open, plus its fields.
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSourceText, setAiSourceText] = useState("");
  const [aiCount, setAiCount] = useState(8);
  const [aiAllowedTypes, setAiAllowedTypes] = useState<AiQuestionType[]>([
    "multiple-choice",
    "true-false",
    "gap-fill",
    "matching",
    "reordering-horizontal",
    "reordering-vertical",
  ]);
  const [aiGenerating, setAiGenerating] = useState(false);
  // Optional uploaded source document (PDF or DOCX). Stored as plain
  // base64 so it goes straight into the callable; we also keep size
  // and name for the UI chip.
  const [aiSourceFile, setAiSourceFile] = useState<
    (AiSourceFile & { sizeBytes: number }) | null
  >(null);
  const aiFileInputRef = React.useRef<HTMLInputElement | null>(null);
  // We no longer need this state since we're always showing the question selector
  // const [showQuestionSelector, setShowQuestionSelector] = useState(false);
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType>("multiple-choice");
  
  // Load existing test if testId is provided
  useEffect(() => {
    if (testId && currentUser) {
      loadTest();
    }
  }, [testId, currentUser]);
  
  const loadTest = async () => {
    if (!testId) return;
    
    setIsLoading(true);
    try {
      const { test, questions: loadedQuestions } = await getTest(testId);
      
      // Set test settings
      setTestSettings({
        title: test.title,
        description: test.description || "",
        targetLanguage: test.targetLanguage,
        cefrLevel: test.cefrLevel,
        defaultCreditPoints: test.defaultCreditPoints,
      });
      
      // Set questions
      setQuestions(loadedQuestions);
    } catch (error) {
      console.error("Error loading test:", error);
      toast.error("Fehler beim Laden des Tests");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTestSettingsChange = (settings: TestGeneralSettings) => {
    setTestSettings(settings);
  };
  
  const handleQuestionChange = (index: number, updatedQuestion: Question) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    setQuestions(newQuestions);
  };
  
  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<number | null>(null);
  const { preferences, updatePreference } = useUserPreferences();

  const handleDeleteQuestion = (index: number) => {
    // Check if we should show confirmation
    if (preferences.confirmations.deleteQuestion) {
      setQuestionToDelete(index);
      setDeleteDialogOpen(true);
    } else {
      // If user disabled confirmations, delete immediately
      deleteQuestion(index);
    }
  };

  const deleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleDontAskAgainChange = (checked: boolean) => {
    // Update user preference for delete confirmation
    updatePreference("confirmations", "deleteQuestion", !checked);
  };
  
  const toggleAiType = (t: AiQuestionType) => {
    setAiAllowedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  // 9 MB binary cap — matches the server-side base64 length cap with
  // a small safety margin so we reject before round-tripping bytes.
  const AI_FILE_MAX_BYTES = 9 * 1024 * 1024;

  const handleAiFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    // Reset the input value so picking the same filename twice in a row
    // still fires onChange.
    e.target.value = "";
    if (!file) return;

    let mimeType: AiSourceFileMime | null = null;
    if (file.type === AI_SOURCE_PDF_MIME) mimeType = AI_SOURCE_PDF_MIME;
    else if (file.type === AI_SOURCE_DOCX_MIME) mimeType = AI_SOURCE_DOCX_MIME;
    else if (file.name.toLowerCase().endsWith(".pdf"))
      mimeType = AI_SOURCE_PDF_MIME;
    else if (file.name.toLowerCase().endsWith(".docx"))
      mimeType = AI_SOURCE_DOCX_MIME;

    if (!mimeType) {
      toast.error("Bitte eine PDF- oder DOCX-Datei wählen.", {
        duration: Infinity,
      });
      return;
    }
    if (file.size > AI_FILE_MAX_BYTES) {
      toast.error(
        `Die Datei ist zu groß (${(file.size / 1024 / 1024).toFixed(
          1
        )} MB). Maximum: 9 MB.`,
        { duration: Infinity }
      );
      return;
    }

    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // FileReader.readAsDataURL produces "data:<mime>;base64,<payload>".
          // We send just the payload and pass mimeType separately.
          const comma = result.indexOf(",");
          if (comma < 0) reject(new Error("FileReader payload missing"));
          else resolve(result.slice(comma + 1));
        };
        reader.onerror = () => reject(reader.error ?? new Error("read failed"));
        reader.readAsDataURL(file);
      });
      setAiSourceFile({
        name: file.name,
        mimeType,
        dataBase64,
        sizeBytes: file.size,
      });
    } catch (err) {
      console.error(err);
      toast.error("Datei konnte nicht gelesen werden.", { duration: Infinity });
    }
  };

  const handleAiGenerate = async () => {
    const prompt = aiPrompt.trim();
    if (prompt.length < 3) {
      toast.error("Bitte eine kurze Anweisung eingeben.", { duration: Infinity });
      return;
    }
    if (aiAllowedTypes.length === 0) {
      toast.error("Mindestens ein Aufgabentyp muss erlaubt sein.", {
        duration: Infinity,
      });
      return;
    }
    setAiGenerating(true);
    try {
      // Don't include sourceText when empty — Firebase httpsCallable
      // serialises `undefined` as `null` over the wire, which fails the
      // Function-side Zod schema (string-only).
      const input: Parameters<typeof generateTestQuestions>[0] = {
        prompt,
        language: testSettings.targetLanguage,
        cefrLevel: testSettings.cefrLevel as CEFRLevel,
        count: aiCount,
        allowedTypes: aiAllowedTypes,
      };
      const trimmedSource = aiSourceText.trim();
      if (trimmedSource) input.sourceText = trimmedSource;
      if (aiSourceFile) {
        input.sourceFile = {
          name: aiSourceFile.name,
          mimeType: aiSourceFile.mimeType,
          dataBase64: aiSourceFile.dataBase64,
        };
      }
      const res = await generateTestQuestions(input);
      if (!res.questions.length) {
        toast.error("Die KI hat keine Aufgaben erzeugt. Bitte erneut versuchen.", {
          duration: Infinity,
        });
        return;
      }
      // Append to existing questions so the teacher can mix manual + AI.
      setQuestions((prev) => [...prev, ...res.questions]);
      // If the test still has the default title/description, accept the
      // AI's suggestions; otherwise keep what the teacher typed.
      setTestSettings((prev) => ({
        ...prev,
        title:
          prev.title === "Neuer Test" && res.title ? res.title : prev.title,
        description:
          prev.description === "Beschreibung des Tests" && res.description
            ? res.description
            : prev.description,
      }));
      setAiPrompt("");
      setAiSourceText("");
      setAiSourceFile(null);
      setAiOpen(false);
      toast.success(`${res.questions.length} Aufgaben generiert`);
    } catch (err: any) {
      console.error(err);
      const code = err?.code as string | undefined;
      const msg =
        code === "functions/resource-exhausted"
          ? err?.message ??
            "KI-Limit erreicht. Mit Premium gibt es keine Beschränkung."
          : err?.message ?? "KI-Anfrage fehlgeschlagen";
      toast.error(msg, { duration: Infinity });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAddQuestion = () => {
    if (!selectedQuestionType) return;
    
    // Create a new question based on the selected type
    let newQuestion: Question;
    
    switch (selectedQuestionType) {
      case "multiple-choice":
        newQuestion = {
          type: "multiple-choice",
          text: "",
          options: ["", ""],
          correctOption: 0,
          points: testSettings.defaultCreditPoints,
        } as MultipleChoiceQuestion;
        break;

      case "true-false":
        newQuestion = {
          type: "true-false",
          text: "",
          isTrue: false,
          points: testSettings.defaultCreditPoints,
        } as TrueFalseQuestion;
        break;

      case "gap-fill":
        newQuestion = {
          type: "gap-fill",
          text: "",
          gaps: [""],
          distractors: [],
          points: testSettings.defaultCreditPoints,
        } as GapFillQuestion;
        break;

      case "matching":
        newQuestion = {
          type: "matching",
          text: "",
          leftItems: ["", ""],
          rightItems: ["", ""],
          correctMatches: [0, 1],
          distractors: [],
          points: testSettings.defaultCreditPoints,
        } as MatchingQuestion;
        break;

      case "reordering-horizontal":
      case "reordering-vertical":
        newQuestion = {
          type: selectedQuestionType,
          text: "",
          items: ["", "", ""],
          correctOrder: [0, 1, 2],
          isGap: [false, false, false],
          points: testSettings.defaultCreditPoints,
        } as ReorderingQuestion;
        break;
        
      default:
        return;
    }
    
    // Add the new question to the questions array
    setQuestions([...questions, newQuestion]);
  };
  
  const handleSaveTest = async () => {
    if (!currentUser) {
      toast.error("Sie müssen angemeldet sein, um einen Test zu speichern");
      return;
    }
    
    if (!testSettings.title) {
      toast.error("Bitte geben Sie einen Titel für den Test ein");
      return;
    }
    
    if (questions.length === 0) {
      toast.error("Bitte fügen Sie mindestens eine Frage hinzu");
      return;
    }
    
    setIsSaving(true);

    try {
      const testData: Test = {
        teacherId: currentUser.uid,
        title: testSettings.title,
        description: testSettings.description,
        targetLanguage: testSettings.targetLanguage,
        cefrLevel: testSettings.cefrLevel as CEFRLevel,
        defaultCreditPoints: testSettings.defaultCreditPoints,
        isAIGenerated: false,
      };

      if (testId) {
        await updateTest(testId, testData, questions);
        toast.success("Test erfolgreich aktualisiert");
      } else {
        await createTest(testData, questions);
        toast.success("Test erfolgreich erstellt");
        router.push("/tests");
      }
    } catch (error) {
      console.error("Error saving test:", error);
      toast.error("Fehler beim Speichern des Tests");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Function to render the appropriate editor for each question type
  const renderQuestionEditor = (question: Question, index: number) => {
    const commonProps = {
      onChange: (updatedQuestion: Question) => handleQuestionChange(index, updatedQuestion),
      onDelete: () => handleDeleteQuestion(index),
      showDelete: true,
    };
    
    switch (question.type) {
      case "multiple-choice":
        return (
          <MultipleChoiceEditor
            question={question as MultipleChoiceQuestion}
            {...commonProps}
          />
        );
        
      case "true-false":
        return (
          <TrueFalseEditor
            question={question as TrueFalseQuestion}
            {...commonProps}
          />
        );
        
      case "gap-fill":
        return (
          <GapFillEditor
            question={question as GapFillQuestion}
            {...commonProps}
          />
        );
        
      case "matching":
        return (
          <MatchingEditor
            question={question as MatchingQuestion}
            {...commonProps}
          />
        );
        
      case "reordering-horizontal":
        return (
          <HorizontalReorderingEditor
            question={question as ReorderingQuestion}
            {...commonProps}
          />
        );
        
      case "reordering-vertical":
        return (
          <VerticalReorderingEditor
            question={question as ReorderingQuestion}
            {...commonProps}
          />
        );
        
      default:
        return null;
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Confirmation Dialog for Question Deletion */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Frage löschen"
        description="Möchten Sie diese Frage wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        onConfirm={() => {
          if (questionToDelete !== null) {
            deleteQuestion(questionToDelete);
            setQuestionToDelete(null);
          }
        }}
        showDontAskAgain={true}
        onDontAskAgainChange={handleDontAskAgainChange}
      />
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={() => router.push("/tests")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Zurück zur Übersicht</span>
        </Button>
      </div>
      
      <div className="sticky top-16 z-30 mb-6 border-b bg-background/95 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
              {testId ? "Test bearbeiten" : "Neuen Test erstellen"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {questions.length} {questions.length === 1 ? "Frage" : "Fragen"}
            </p>
          </div>
          <Button
            className="gap-2 sm:w-auto"
            onClick={handleSaveTest}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Speichern...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Test speichern
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* General Settings */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Allgemeine Einstellungen</CardTitle>
          <CardDescription>
            Grundlegende Informationen zum Test
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TestGeneralSettingsForm
            initialValues={testSettings}
            onChange={handleTestSettingsChange}
            mode={testId ? "edit" : "create"}
          />
        </CardContent>
      </Card>

      {/* Questions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Fragen</CardTitle>
          <CardDescription>
            Fügen Sie Fragen zu Ihrem Test hinzu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatePresence initial={false}>
            {questions.map((question, index) => (
              <motion.div
                key={`question-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {renderQuestionEditor(question, index)}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* AI generation panel — lives next to the manual add card so
              the teacher can mix the two. Generated questions are
              appended to the existing list, then editable in-place. */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <Card className="border-dashed border-2 p-4 mb-4 bg-primary/5 border-primary/30">
              <CardContent className="p-0">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2"
                  onClick={() => setAiOpen((v) => !v)}
                >
                  <span className="flex items-center gap-2 text-lg font-medium">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Aufgaben mit KI generieren
                  </span>
                  {aiOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                {aiOpen && (
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-2">
                      <Label htmlFor="ai-prompt">Anweisung *</Label>
                      <Textarea
                        id="ai-prompt"
                        rows={2}
                        placeholder='z. B. "Vokabeltest zum Thema Familie, gemischte Aufgabentypen."'
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        disabled={aiGenerating}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Quelldokument (optional, PDF oder DOCX)</Label>
                      <input
                        ref={aiFileInputRef}
                        type="file"
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        onChange={handleAiFileChange}
                        disabled={aiGenerating}
                      />
                      {aiSourceFile ? (
                        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm truncate">
                              {aiSourceFile.name ?? "Dokument"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {aiSourceFile.mimeType === AI_SOURCE_PDF_MIME
                                ? "PDF"
                                : "DOCX"}{" "}
                              · {(aiSourceFile.sizeBytes / 1024).toFixed(0)} KB
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setAiSourceFile(null)}
                            disabled={aiGenerating}
                            aria-label="Datei entfernen"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-fit"
                          onClick={() => aiFileInputRef.current?.click()}
                          disabled={aiGenerating}
                        >
                          <Paperclip className="h-4 w-4 mr-2" />
                          Datei auswählen
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="ai-source">
                        Zusätzlicher Quelltext (optional)
                      </Label>
                      <Textarea
                        id="ai-source"
                        rows={4}
                        placeholder={
                          aiSourceFile
                            ? "Zusätzliche Hinweise zum Dokument (optional)."
                            : "Optionaler Text, auf den die Aufgaben sich beziehen sollen."
                        }
                        value={aiSourceText}
                        onChange={(e) => setAiSourceText(e.target.value)}
                        disabled={aiGenerating}
                        maxLength={30000}
                      />
                    </div>
                    <div className="grid gap-2 max-w-[12rem]">
                      <Label htmlFor="ai-count">Anzahl Aufgaben</Label>
                      <Input
                        id="ai-count"
                        type="number"
                        min={1}
                        max={15}
                        value={aiCount}
                        onChange={(e) =>
                          setAiCount(
                            Math.max(
                              1,
                              Math.min(15, parseInt(e.target.value, 10) || 1)
                            )
                          )
                        }
                        disabled={aiGenerating}
                      />
                    </div>
                    <div>
                      <Label>Erlaubte Aufgabentypen</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {[
                          { value: "multiple-choice", label: "Multiple Choice" },
                          { value: "true-false", label: "Wahr / Falsch" },
                          { value: "gap-fill", label: "Lückentext" },
                          { value: "matching", label: "Zuordnung" },
                          {
                            value: "reordering-horizontal",
                            label: "Horizontale Reihenfolge",
                          },
                          {
                            value: "reordering-vertical",
                            label: "Vertikale Reihenfolge",
                          },
                        ].map((t) => (
                          <label
                            key={t.value}
                            className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent/40 bg-background"
                          >
                            <Checkbox
                              checked={aiAllowedTypes.includes(
                                t.value as AiQuestionType
                              )}
                              onCheckedChange={() =>
                                toggleAiType(t.value as AiQuestionType)
                              }
                              disabled={aiGenerating}
                            />
                            <span className="text-sm">{t.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button
                        onClick={handleAiGenerate}
                        disabled={aiGenerating}
                      >
                        {aiGenerating ? (
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
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-dashed border-2 p-4 mb-4">
              <CardContent className="p-0">
                <h3 className="text-lg font-medium mb-4">Neue Frage hinzufügen</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <Select
                    value={selectedQuestionType}
                    onValueChange={(value) => setSelectedQuestionType(value as QuestionType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Fragetyp auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                      <SelectItem value="true-false">Wahr/Falsch</SelectItem>
                      <SelectItem value="gap-fill">Lückentext</SelectItem>
                      <SelectItem value="matching">Zuordnung</SelectItem>
                      <SelectItem value="reordering-horizontal">Horizontale Reihenfolge</SelectItem>
                      <SelectItem value="reordering-vertical">Vertikale Reihenfolge</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddQuestion}
                    className="h-10"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Frage hinzufügen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </CardContent>
      </Card>
      
      {/* Save Button */}
      <div className="flex justify-end mb-12">
        <Button
          className="gap-2"
          onClick={handleSaveTest}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Speichern...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Test speichern
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default TestBuilder;
