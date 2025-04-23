"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash, Plus } from "lucide-react";
import { GapFillQuestion } from "@/lib/firebase/tests";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface GapFillEditorProps {
  question: GapFillQuestion;
  onChange: (question: GapFillQuestion) => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

const GapFillEditor: React.FC<GapFillEditorProps> = ({
  question,
  onChange,
  onDelete,
  showDelete = false,
}) => {
  const [textInput, setTextInput] = useState(question.text || "");
  const [selectedText, setSelectedText] = useState("");

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value);
    onChange({ ...question, text: e.target.value });
  };

  const handleGapChange = (index: number, value: string) => {
    const newGaps = [...question.gaps];
    newGaps[index] = value;
    onChange({ ...question, gaps: newGaps });
  };

  const handleDistractorChange = (index: number, value: string) => {
    const newDistractors = [...(question.distractors || [])];
    newDistractors[index] = value;
    onChange({ ...question, distractors: newDistractors });
  };

  const handleAddGap = () => {
    // If text is selected, use it as the gap value
    const newGapValue = selectedText.trim() || "";
    
    onChange({
      ...question,
      gaps: [...question.gaps, newGapValue],
      // Update text by replacing the selected text with a placeholder
      text: selectedText ? 
        textInput.replace(selectedText, "___") : 
        textInput,
    });
    
    // Clear selection after adding
    setSelectedText("");
  };

  const handleAddDistractor = () => {
    const newDistractors = [...(question.distractors || []), ""];
    onChange({ ...question, distractors: newDistractors });
  };

  const handleRemoveGap = (index: number) => {
    const newGaps = question.gaps.filter((_, i) => i !== index);
    onChange({ ...question, gaps: newGaps });
  };

  const handleRemoveDistractor = (index: number) => {
    const newDistractors = (question.distractors || []).filter((_, i) => i !== index);
    onChange({ ...question, distractors: newDistractors });
  };

  // Handle text selection
  const handleTextSelect = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString());
    }
  };

  // Preview text with highlighted gaps
  const renderPreviewText = () => {
    let previewText = question.text;
    
    // Replace ___ with highlighted spans
    if (previewText) {
      previewText = previewText.replace(/___/g, '<span class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">___</span>');
    }
    
    return previewText;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full"
    >
      <Card className="mb-4 border-yellow-200 dark:border-yellow-800">
        <CardHeader className="bg-yellow-50 dark:bg-yellow-950/20 flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-md font-medium">Lückentext</CardTitle>
          {showDelete && onDelete && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onDelete}
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="gap-fill-text">Text mit Lücken</Label>
              <div className="mt-1 text-sm text-muted-foreground mb-2">
                Markieren Sie Text und klicken Sie auf "Lücke hinzufügen", oder schreiben Sie ___ für Lücken.
              </div>
              <Textarea
                id="gap-fill-text"
                value={textInput}
                onChange={handleTextChange}
                onMouseUp={handleTextSelect}
                placeholder="Geben Sie hier Ihren Text ein. Verwenden Sie ___ für Lücken."
                className="min-h-[100px]"
              />
              
              <div className="flex justify-between mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddGap}
                  disabled={!selectedText && !textInput.includes("___")}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Lücke hinzufügen
                </Button>
              </div>
            </div>
            
            {question.text && (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <Label className="text-sm">Vorschau:</Label>
                <div 
                  className="mt-1"
                  dangerouslySetInnerHTML={{ __html: renderPreviewText() }}
                />
              </div>
            )}
            
            <div>
              <Label>Korrekte Antworten für die Lücken</Label>
              <AnimatePresence initial={false}>
                {question.gaps.map((gap, idx) => (
                  <motion.div
                    key={`gap-${idx}`}
                    className="flex items-center gap-2 mt-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Badge variant="outline" className="shrink-0">
                      Lücke {idx + 1}
                    </Badge>
                    <Input
                      value={gap}
                      onChange={(e) => handleGapChange(idx, e.target.value)}
                      placeholder={`Antwort für Lücke ${idx + 1}`}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveGap(idx)}
                      aria-label="Lücke entfernen"
                    >
                      <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            <div>
              <div className="flex items-center justify-between">
                <Label>Distraktoren (Falsche Antworten)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddDistractor}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Distraktor hinzufügen
                </Button>
              </div>
              <AnimatePresence initial={false}>
                {(question.distractors || []).map((distractor, idx) => (
                  <motion.div
                    key={`distractor-${idx}`}
                    className="flex items-center gap-2 mt-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Badge variant="outline" className="shrink-0 bg-red-50 dark:bg-red-950/20">
                      Falsch {idx + 1}
                    </Badge>
                    <Input
                      value={distractor}
                      onChange={(e) => handleDistractorChange(idx, e.target.value)}
                      placeholder={`Falsche Antwort ${idx + 1}`}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveDistractor(idx)}
                      aria-label="Distraktor entfernen"
                    >
                      <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default GapFillEditor;
