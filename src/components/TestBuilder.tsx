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
} from "lucide-react";
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
    defaultTimePerQuestion: 10,
    defaultCreditPoints: 1,
    defaultMultiplier: 1,
  });
  
  // State for questions
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
        defaultTimePerQuestion: test.defaultTimePerQuestion,
        defaultCreditPoints: test.defaultCreditPoints,
        defaultMultiplier: test.defaultMultiplier,
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
  
  const handleDeleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
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
          timeLimit: testSettings.defaultTimePerQuestion,
          points: testSettings.defaultCreditPoints,
          multiplier: testSettings.defaultMultiplier,
        } as MultipleChoiceQuestion;
        break;
        
      case "true-false":
        newQuestion = {
          type: "true-false",
          text: "",
          isTrue: false,
          timeLimit: testSettings.defaultTimePerQuestion,
          points: testSettings.defaultCreditPoints,
          multiplier: testSettings.defaultMultiplier,
        } as TrueFalseQuestion;
        break;
        
      case "gap-fill":
        newQuestion = {
          type: "gap-fill",
          text: "",
          gaps: [""],
          distractors: [],
          timeLimit: testSettings.defaultTimePerQuestion,
          points: testSettings.defaultCreditPoints,
          multiplier: testSettings.defaultMultiplier,
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
          timeLimit: testSettings.defaultTimePerQuestion,
          points: testSettings.defaultCreditPoints,
          multiplier: testSettings.defaultMultiplier,
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
          timeLimit: testSettings.defaultTimePerQuestion,
          points: testSettings.defaultCreditPoints,
          multiplier: testSettings.defaultMultiplier,
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
        defaultTimePerQuestion: testSettings.defaultTimePerQuestion,
        defaultCreditPoints: testSettings.defaultCreditPoints,
        defaultMultiplier: testSettings.defaultMultiplier,
        isAIGenerated: false,
      };
      
      if (testId) {
        // Update existing test with questions
        await updateTest(testId, testData, questions);
        toast.success("Test erfolgreich aktualisiert");
      } else {
        // Create new test
        const newTestId = await createTest(testData, questions);
        toast.success("Test erfolgreich erstellt");
        
        // Redirect to the test management page
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
      
      <div className="border-b mb-6">
        <h1 className="text-2xl font-semibold py-2 text-gray-700 dark:text-gray-200">
          {testId ? "Test bearbeiten" : "Neuen Test erstellen"}
        </h1>
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
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
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
