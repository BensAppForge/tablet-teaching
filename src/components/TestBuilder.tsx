"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  ImageIcon,
  AlertCircle,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  AiQuestionType,
  AiSourceFile,
  AiSourceFileMime,
  AiSourceImage,
  AiSourceImageMime,
  AI_SOURCE_DOCX_MIME,
  AI_SOURCE_PDF_MIME,
  AI_SOURCE_IMAGE_MIMES,
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
import CollectionPicker from "@/components/CollectionPicker";
import {
  subscribeToTeacherCollections,
  setTestCollection,
  TestCollection,
} from "@/lib/firebase/collections";
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
import { validateQuestion } from "@/lib/questionValidation";
import { cn } from "@/lib/utils";

interface TestBuilderProps {
  testId?: string; // Optional - if provided, we're editing an existing test
}

// Read a File into plain base64 (no "data:<mime>;base64," prefix), the
// shape the callable expects for both documents and images.
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      if (comma < 0) reject(new Error("FileReader payload missing"));
      else resolve(result.slice(comma + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

// Resolve an accepted image MIME from a File. iOS sometimes reports an
// empty file.type for HEIC, so fall back to the extension.
function imageMimeFor(file: File): AiSourceImageMime | null {
  if ((AI_SOURCE_IMAGE_MIMES as readonly string[]).includes(file.type))
    return file.type as AiSourceImageMime;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".heic")) return "image/heic";
  if (name.endsWith(".heif")) return "image/heif";
  return null;
}

const AI_MAX_IMAGES = 6;

const TestBuilder: React.FC<TestBuilderProps> = ({ testId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();

  // State for general test settings with safe default values
  const [testSettings, setTestSettings] = useState<TestGeneralSettings>({
    title: "Neuer Test",
    description: "Beschreibung des Tests",
    targetLanguage: "Englisch",
    cefrLevel: "B1",
    defaultCreditPoints: 1,
  });

  // Collection (virtual folder) this test belongs to. In create mode it's
  // held locally and written by createTest; in edit mode the picker writes
  // it immediately (a move action, like the test card's), so it's not part
  // of the unsaved-changes baseline. Defaults from ?collection= when the
  // teacher creates a test from inside a folder.
  const [collections, setCollections] = useState<TestCollection[]>([]);
  const [collectionId, setCollectionId] = useState<string | null>(
    () => (!testId ? searchParams.get("collection") : null)
  );
  
  // State for questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionKeys, setQuestionKeys] = useState<string[]>([]);
  const questionKeyCounter = React.useRef(0);
  const makeQuestionKey = React.useCallback(
    () => `local-question-${questionKeyCounter.current++}`,
    []
  );

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Validation: once the teacher tries to save, surface every problem
  // (highlight settings fields + incomplete questions) and scroll to the
  // first one. Kept off until the first save attempt so we don't nag while
  // they're still filling things in.
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const settingsRef = React.useRef<HTMLDivElement | null>(null);
  const questionRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  // Per-question problem (or null). Recomputed live so highlights clear as
  // the teacher fixes each question after a failed save attempt.
  const questionErrors = React.useMemo(
    () => questions.map((q) => validateQuestion(q)),
    [questions]
  );
  // Settings problems mirror TestGeneralSettingsForm's own checks so the
  // save gate and the inline form errors never disagree.
  const settingsValid = React.useMemo(() => {
    const s = testSettings;
    return (
      !!s.title.trim() &&
      !!s.description.trim() &&
      !!s.targetLanguage &&
      !!s.cefrLevel &&
      s.defaultCreditPoints >= 1 &&
      s.defaultCreditPoints <= 5
    );
  }, [testSettings]);
  // Unsaved-changes tracking: baseline holds the serialized state as of
  // load / last save; anything diverging from it counts as dirty. JSON
  // comparison is cheap enough here (runs on leave attempts, not renders).
  const baselineRef = React.useRef<string | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const snapshotState = React.useCallback(
    (settings: TestGeneralSettings, qs: Question[]) =>
      JSON.stringify({ settings, qs }),
    []
  );
  const isDirty = React.useCallback(
    () =>
      baselineRef.current !== null &&
      snapshotState(testSettings, questions) !== baselineRef.current,
    [snapshotState, testSettings, questions]
  );

  // New-test mode: the pristine baseline is the initial defaults.
  // Edit mode: loadTest overwrites it once the data arrives.
  useEffect(() => {
    if (baselineRef.current === null && !testId) {
      baselineRef.current = snapshotState(testSettings, questions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before the tab/PWA closes or hard-navigates with unsaved work.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
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
  // Screenshots / photos read together as one visual source. Separate
  // from the single PDF/DOCX picker above.
  const [aiSourceImages, setAiSourceImages] = useState<
    (AiSourceImage & { sizeBytes: number })[]
  >([]);
  const aiImageInputRef = React.useRef<HTMLInputElement | null>(null);
  // We no longer need this state since we're always showing the question selector
  // const [showQuestionSelector, setShowQuestionSelector] = useState(false);
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType>("multiple-choice");
  
  // Load existing test if testId is provided
  useEffect(() => {
    if (testId && currentUser) {
      loadTest();
    }
  }, [testId, currentUser]);

  // Keep the teacher's collection list in sync for the picker.
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToTeacherCollections(
      currentUser.uid,
      setCollections,
      (err) => console.error("Error loading collections:", err)
    );
    return () => unsub();
  }, [currentUser]);
  
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
      
      // Collection membership (edit mode reflects the stored value).
      setCollectionId(test.collectionId ?? null);

      // Set questions
      setQuestions(loadedQuestions);
      setQuestionKeys(loadedQuestions.map((q) => q.id ?? makeQuestionKey()));
      baselineRef.current = snapshotState(
        {
          title: test.title,
          description: test.description || "",
          targetLanguage: test.targetLanguage,
          cefrLevel: test.cefrLevel,
          defaultCreditPoints: test.defaultCreditPoints,
        },
        loadedQuestions
      );
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

  // In edit mode the collection change is a move action — persist it
  // right away (matching the test card). In create mode there's no doc
  // yet, so just hold it until the test is saved.
  const handleCollectionChange = async (id: string | null) => {
    setCollectionId(id);
    if (testId) {
      try {
        await setTestCollection(testId, id);
      } catch (err) {
        console.error(err);
        toast.error("Sammlung konnte nicht geändert werden");
      }
    }
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
    setQuestionKeys((prev) => prev.filter((_, i) => i !== index));
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

  // Keep the encoded callable payload under Firebase's request cap.
  // 7 MiB binary -> ~9.4 MB base64, leaving room for JSON overhead.
  const AI_FILE_MAX_BYTES = 7 * 1024 * 1024;

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
        )} MB). Maximum: 7 MB.`,
        { duration: Infinity }
      );
      return;
    }

    try {
      const dataBase64 = await readFileAsBase64(file);
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

  const handleAiImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files ?? []);
    // Reset so picking the same files again still fires onChange.
    e.target.value = "";
    if (!files.length) return;

    // Running totals start from what's already attached (images + any
    // document) so the combined payload stays under the callable limit.
    let count = aiSourceImages.length;
    let totalBytes =
      aiSourceImages.reduce((s, i) => s + i.sizeBytes, 0) +
      (aiSourceFile?.sizeBytes ?? 0);
    const accepted: (AiSourceImage & { sizeBytes: number })[] = [];

    try {
      for (const file of files) {
        if (count + accepted.length >= AI_MAX_IMAGES) {
          toast.error(`Maximal ${AI_MAX_IMAGES} Bilder.`, {
            duration: Infinity,
          });
          break;
        }
        const mimeType = imageMimeFor(file);
        if (!mimeType) {
          toast.error(`„${file.name}" ist kein unterstütztes Bildformat.`, {
            duration: Infinity,
          });
          continue;
        }
        if (totalBytes + file.size > AI_FILE_MAX_BYTES) {
          toast.error(
            "Die Bilder sind zusammen zu groß (max. 7 MB). Bitte weniger oder kleinere Bilder wählen.",
            { duration: Infinity }
          );
          break;
        }
        const dataBase64 = await readFileAsBase64(file);
        accepted.push({
          name: file.name,
          mimeType,
          dataBase64,
          sizeBytes: file.size,
        });
        totalBytes += file.size;
      }
      if (accepted.length) {
        setAiSourceImages((prev) => [...prev, ...accepted]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Bild konnte nicht gelesen werden.", { duration: Infinity });
    }
  };

  const removeAiImage = (index: number) => {
    setAiSourceImages((prev) => prev.filter((_, i) => i !== index));
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
      if (aiSourceImages.length) {
        input.sourceImages = aiSourceImages.map((img) => ({
          name: img.name,
          mimeType: img.mimeType,
          dataBase64: img.dataBase64,
        }));
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
      setQuestionKeys((prev) => [
        ...prev,
        ...res.questions.map((q) => q.id ?? makeQuestionKey()),
      ]);
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
      setAiSourceImages([]);
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
    setQuestionKeys((prev) => [...prev, makeQuestionKey()]);
  };
  
  const handleSaveTest = async () => {
    if (!currentUser) {
      toast.error("Sie müssen angemeldet sein, um einen Test zu speichern");
      return;
    }

    // Reveal all field/question highlights from here on.
    setSubmitAttempted(true);

    const scrollTo = (el: HTMLElement | null) => {
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    // 1. Test settings (title, description, language, level, points).
    if (!settingsValid) {
      toast.error("Bitte fülle die rot markierten Test-Einstellungen aus.");
      scrollTo(settingsRef.current);
      return;
    }

    // 2. At least one question.
    if (questions.length === 0) {
      toast.error("Bitte füge mindestens eine Frage hinzu.");
      return;
    }

    // 3. Every question must be complete — jump to the first incomplete one.
    const firstBad = questionErrors.findIndex((e) => e !== null);
    if (firstBad !== -1) {
      const count = questionErrors.filter((e) => e !== null).length;
      toast.error(
        count === 1
          ? `Frage ${firstBad + 1} ist noch unvollständig.`
          : `${count} Fragen sind noch unvollständig — beginnend mit Frage ${
              firstBad + 1
            }.`
      );
      scrollTo(questionRefs.current[firstBad]);
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
        // Pass collectionId explicitly (null → undefined) so updateTest
        // removes the field when the test is moved to "Ohne Sammlung".
        const savedIds = await updateTest(
          testId,
          { ...testData, collectionId: collectionId ?? undefined },
          questions
        );
        // Apply the Firestore ids to local state — without this, a second
        // save in the same session re-inserts every new question as a
        // duplicate (the local copies would still be id-less).
        const savedQuestions = questions.map((q, i) =>
          savedIds[i] ? { ...q, id: savedIds[i] } : q
        );
        setQuestions(savedQuestions);
        baselineRef.current = snapshotState(testSettings, savedQuestions);
        toast.success("Test erfolgreich aktualisiert");
      } else {
        // Only attach collectionId when set — createTest doesn't strip
        // undefined from the test object and Firestore rejects undefined.
        await createTest(
          collectionId ? { ...testData, collectionId } : testData,
          questions
        );
        // Mark pristine before navigating so no stale unload warning fires.
        baselineRef.current = snapshotState(testSettings, questions);
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
      {/* Unsaved-changes guard for "Zurück zur Übersicht" */}
      <ConfirmationDialog
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        title="Ungespeicherte Änderungen"
        description="Dieser Test hat ungespeicherte Änderungen. Wenn Sie zur Übersicht zurückkehren, gehen sie verloren."
        confirmLabel="Änderungen verwerfen"
        cancelLabel="Weiter bearbeiten"
        onConfirm={() => router.push("/tests")}
      />
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={() =>
            isDirty() ? setLeaveDialogOpen(true) : router.push("/tests")
          }
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
      <Card className="mb-8" ref={settingsRef}>
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
            showAllErrors={submitAttempted}
          />
          <div className="mt-6 max-w-sm">
            <Label htmlFor="collection-picker">Sammlung</Label>
            <div className="mt-1">
              <CollectionPicker
                collections={collections}
                value={collectionId}
                onChange={handleCollectionChange}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Optionaler Ordner zur Organisation deiner Tests.
            </p>
          </div>
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
            {questions.map((question, index) => {
              const qError = submitAttempted ? questionErrors[index] : null;
              return (
              <motion.div
                key={question.id ?? questionKeys[index] ?? `question-${index}`}
                ref={(el) => {
                  questionRefs.current[index] = el;
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div
                  className={cn(
                    "rounded-lg",
                    qError &&
                      "ring-2 ring-destructive ring-offset-2 ring-offset-background"
                  )}
                >
                  {qError && (
                    <div className="mb-1 flex items-center gap-2 px-1 text-sm font-medium text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        Frage {index + 1}: {qError}
                      </span>
                    </div>
                  )}
                  {renderQuestionEditor(question, index)}
                </div>
              </motion.div>
              );
            })}
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
                      <Label>
                        Bilder / Screenshots (optional, bis zu {AI_MAX_IMAGES})
                      </Label>
                      <input
                        ref={aiImageInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.png,.jpg,.jpeg,.webp,.heic,.heif"
                        multiple
                        className="hidden"
                        onChange={handleAiImageChange}
                        disabled={aiGenerating}
                      />
                      {aiSourceImages.length > 0 && (
                        <div className="space-y-2">
                          {aiSourceImages.map((img, idx) => (
                            <div
                              key={`${img.name ?? "bild"}-${idx}`}
                              className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2"
                            >
                              <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm truncate">
                                  {img.name ?? `Bild ${idx + 1}`}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {(img.sizeBytes / 1024).toFixed(0)} KB
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeAiImage(idx)}
                                disabled={aiGenerating}
                                aria-label="Bild entfernen"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      {aiSourceImages.length < AI_MAX_IMAGES && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-fit"
                          onClick={() => aiImageInputRef.current?.click()}
                          disabled={aiGenerating}
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          {aiSourceImages.length > 0
                            ? "Weitere Bilder"
                            : "Bilder auswählen"}
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
