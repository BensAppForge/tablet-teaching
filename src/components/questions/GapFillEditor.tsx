"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash, Plus } from "lucide-react";
import { GapFillQuestion } from "@/lib/firebase/tests";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Clock, Award, Percent, Highlighter } from "lucide-react";
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
  
  // State for custom settings toggles
  const [customTimeEnabled, setCustomTimeEnabled] = React.useState(false);
  const [customPointsEnabled, setCustomPointsEnabled] = React.useState(false);
  const [customMultiplierEnabled, setCustomMultiplierEnabled] = React.useState(false);

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
    // Only proceed if text is selected
    if (!selectedText.trim()) {
      return;
    }
    
    // Use selected text as the gap value
    const newGapValue = selectedText.trim();
    const newGaps = [...question.gaps, newGapValue];
    const gapIndex = newGaps.length; // 1-based index for display
    
    // Replace the selected text with a placeholder that includes the gap number
    const updatedText = textInput.replace(
      selectedText, 
      `___${gapIndex}___`
    );
    
    // Update the question
    onChange({
      ...question,
      gaps: newGaps,
      text: updatedText
    });
    
    // Update the text input to reflect the change
    setTextInput(updatedText);
    
    // Clear selection after adding
    setSelectedText("");
  };

  const handleRemoveGap = (index: number) => {
    // Remove the gap from the array
    const newGaps = question.gaps.filter((_, i) => i !== index);
    
    // We need to update the text to remove the gap marker and renumber remaining gaps
    let updatedText = question.text;
    
    // First, remove the gap that's being deleted
    const gapNumberToRemove = index + 1; // 1-based index
    updatedText = updatedText.replace(`___${gapNumberToRemove}___`, question.gaps[index]);
    
    // Then renumber all gaps after this one
    for (let i = gapNumberToRemove + 1; i <= question.gaps.length; i++) {
      updatedText = updatedText.replace(`___${i}___`, `___${i-1}___`);
    }
    
    // Update the question with new gaps and text
    onChange({ 
      ...question, 
      gaps: newGaps,
      text: updatedText
    });
    
    // Update the text input to reflect the changes
    setTextInput(updatedText);
  };

  // Handle text selection
  const handleTextSelect = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString());
    }
  };

  // Handle time limit change
  const handleTimeLimitChange = (value: number[]) => {
    onChange({ ...question, timeLimit: value[0] });
  };

  // Handle points change
  const handlePointsChange = (value: number[]) => {
    onChange({ ...question, points: value[0] });
  };

  // Handle multiplier change
  const handleMultiplierChange = (value: number[]) => {
    onChange({ ...question, multiplier: value[0] });
  };

  // Toggle custom time setting
  const toggleCustomTime = (checked: boolean) => {
    setCustomTimeEnabled(checked);
    if (!checked) {
      // Reset to default when disabling custom time
      onChange({ ...question, timeLimit: undefined });
    }
  };

  // Toggle custom points setting
  const toggleCustomPoints = (checked: boolean) => {
    setCustomPointsEnabled(checked);
    if (!checked) {
      // Reset to default when disabling custom points
      onChange({ ...question, points: undefined });
    }
  };

  // Toggle custom multiplier setting
  const toggleCustomMultiplier = (checked: boolean) => {
    setCustomMultiplierEnabled(checked);
    if (!checked) {
      // Reset to default when disabling custom multiplier
      onChange({ ...question, multiplier: undefined });
    }
  };

  // Initialize toggle states based on whether custom values are set
  React.useEffect(() => {
    setCustomTimeEnabled(question.timeLimit !== undefined);
    setCustomPointsEnabled(question.points !== undefined);
    setCustomMultiplierEnabled(question.multiplier !== undefined);
  }, [question.timeLimit, question.points, question.multiplier]);
  
  // Preview text with highlighted gaps and numbered subscripts
  const renderPreviewText = () => {
    let previewText = question.text;
    
    if (!previewText) return "";
    
    // Replace ___N___ pattern with highlighted spans including the number
    for (let i = 1; i <= question.gaps.length; i++) {
      const pattern = new RegExp(`___${i}___`, 'g');
      previewText = previewText.replace(
        pattern, 
        `<span class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">__<sub>${i}</sub>__</span>`
      );
    }
    
    // Handle any remaining ___ without numbers (shouldn't happen with new implementation)
    previewText = previewText.replace(
      /___/g, 
      '<span class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">__</span>'
    );
    
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
              <div className="flex items-center space-x-2 mb-1">
                <Label>Text mit Lücken</Label>
                <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  <Highlighter className="h-3 w-3 inline mr-1" />
                  Text markieren und auf "Lücke hinzufügen" klicken
                </div>
              </div>
              <div className="relative">
                <Textarea
                  value={textInput}
                  onChange={handleTextChange}
                  onMouseUp={handleTextSelect}
                  onKeyUp={handleTextSelect}
                  placeholder="Geben Sie hier Ihren Text ein und markieren Sie die Wörter, die als Lücken erscheinen sollen..."
                  className="min-h-[100px]"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-2 right-2"
                  onClick={handleAddGap}
                  disabled={!selectedText.trim()}
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
            

          </div>
        </CardContent>
        
        {/* Question-specific settings */}
        <CardFooter className="flex flex-col space-y-4 pt-0 pb-4">
          <div className="w-full border-t pt-4 mt-2">
            <h4 className="text-sm font-medium mb-3">Frage-spezifische Einstellungen</h4>
            
            {/* Time limit setting */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="custom-time-toggle" className="text-sm font-normal cursor-pointer">
                  Eigene Zeitbegrenzung
                </Label>
              </div>
              <Switch 
                id="custom-time-toggle"
                checked={customTimeEnabled}
                onCheckedChange={toggleCustomTime}
              />
            </div>
            
            {customTimeEnabled && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-4 pl-6"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Zeit (Sekunden):</span>
                  <span className="text-xs font-medium">{question.timeLimit || 10} Sek.</span>
                </div>
                <Slider
                  min={5}
                  max={60}
                  step={5}
                  value={[question.timeLimit || 10]}
                  onValueChange={handleTimeLimitChange}
                  className="mt-1"
                />
              </motion.div>
            )}
            
            {/* Points setting */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="custom-points-toggle" className="text-sm font-normal cursor-pointer">
                  Eigene Punktzahl
                </Label>
              </div>
              <Switch 
                id="custom-points-toggle"
                checked={customPointsEnabled}
                onCheckedChange={toggleCustomPoints}
              />
            </div>
            
            {customPointsEnabled && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-4 pl-6"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Punkte:</span>
                  <span className="text-xs font-medium">{question.points || 1} Punkt(e)</span>
                </div>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[question.points || 1]}
                  onValueChange={handlePointsChange}
                  className="mt-1"
                />
              </motion.div>
            )}
            
            {/* Multiplier setting */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="custom-multiplier-toggle" className="text-sm font-normal cursor-pointer">
                  Eigener Multiplikator
                </Label>
              </div>
              <Switch 
                id="custom-multiplier-toggle"
                checked={customMultiplierEnabled}
                onCheckedChange={toggleCustomMultiplier}
              />
            </div>
            
            {customMultiplierEnabled && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-4 pl-6"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Multiplikator:</span>
                  <span className="text-xs font-medium">{question.multiplier || 1}x</span>
                </div>
                <Slider
                  min={1}
                  max={3}
                  step={0.5}
                  value={[question.multiplier || 1]}
                  onValueChange={handleMultiplierChange}
                  className="mt-1"
                />
              </motion.div>
            )}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default GapFillEditor;
