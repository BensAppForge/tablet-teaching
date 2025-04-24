"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash, Highlighter, Undo, Clock, Award, Percent } from "lucide-react";
import { GapFillQuestion } from "@/lib/firebase/tests";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface GapFillEditorProps {
  question: GapFillQuestion;
  onChange: (question: GapFillQuestion) => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

// Enhanced Gap interface with position information
interface Gap {
  text: string;
  startIndex: number;
  endIndex: number;
}

// Enhanced GapFillQuestion interface to store position information
interface EnhancedGapFillQuestion extends GapFillQuestion {
  gapPositions?: { start: number; end: number }[];
}

const GapFillEditor: React.FC<GapFillEditorProps> = ({
  question,
  onChange,
  onDelete,
  showDelete = false,
}) => {
  // References
  const previewRef = useRef<HTMLDivElement>(null);
  
  // State for the raw text and gaps
  const [rawText, setRawText] = useState(question.text || "");
  const [gaps, setGaps] = useState<Gap[]>([]);
  
  // State for custom settings toggles
  const [customTimeEnabled, setCustomTimeEnabled] = useState(!!question.timeLimit);
  const [customPointsEnabled, setCustomPointsEnabled] = useState(!!question.points);
  const [customMultiplierEnabled, setCustomMultiplierEnabled] = useState(!!question.multiplier);

  // Initialize gaps from question on mount
  useEffect(() => {
    // Initialize the raw text
    setRawText(question.text || "");
    
    // Initialize custom settings
    setCustomTimeEnabled(!!question.timeLimit);
    setCustomPointsEnabled(!!question.points);
    setCustomMultiplierEnabled(!!question.multiplier);
    
    // Initialize gaps
    const enhancedQuestion = question as EnhancedGapFillQuestion;
    
    if (enhancedQuestion.gapPositions && enhancedQuestion.gapPositions.length > 0) {
      // If we have position information, use it directly
      const restoredGaps = enhancedQuestion.gapPositions.map((pos, index) => ({
        text: question.gaps[index] || "",
        startIndex: pos.start,
        endIndex: pos.end
      }));
      setGaps(restoredGaps);
    } else if (question.gaps && question.gaps.length > 0) {
      // If we don't have position info but have gaps, try to find them in the text
      extractGapsFromQuestion();
    } else {
      // No gaps, initialize with empty array
      setGaps([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount
  
  // Extract gaps from an existing question by searching for them in the text
  const extractGapsFromQuestion = () => {
    const extractedGaps: Gap[] = [];
    const text = question.text || "";
    
    // For each gap in the question, try to find its position in the text
    if (question.gaps) {
      // We need to limit the number of gaps to match exactly what's in the question
      // This prevents duplicate words from all becoming gaps
      const gapCount = question.gaps.length;
      let gapsFound = 0;
      
      for (let i = 0; i < gapCount; i++) {
        const gapText = question.gaps[i];
        if (!gapText) continue;
        
        // Find the position of this gap in the text
        // We'll use the first occurrence that doesn't overlap with an existing gap
        let startPos = 0;
        let foundPos = -1;
        let found = false;
        
        // Try to find a position for this gap that doesn't overlap with existing gaps
        while (!found && (foundPos = text.indexOf(gapText, startPos)) !== -1) {
          // Check if this position overlaps with any existing gap
          const overlaps = extractedGaps.some(gap => 
            (foundPos >= gap.startIndex && foundPos < gap.endIndex) ||
            (foundPos + gapText.length > gap.startIndex && foundPos + gapText.length <= gap.endIndex)
          );
          
          if (!overlaps) {
            extractedGaps.push({
              text: gapText,
              startIndex: foundPos,
              endIndex: foundPos + gapText.length
            });
            found = true;
            gapsFound++;
          }
          
          startPos = foundPos + 1; // Move past this occurrence
        }
      }
    }
    
    // Sort gaps by position and set them
    setGaps(extractedGaps.sort((a, b) => a.startIndex - b.startIndex));
  };
  
  // Handle raw text change
  const handleRawTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawText(e.target.value);
    
    // When text changes, we need to update the question
    // but preserve any existing gaps
    updateQuestionWithCurrentState(e.target.value, gaps);
  };
  
  // Handle text selection for creating a gap
  const handleTextSelection = () => {
    // Get the current selection
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    
    // Make sure we have the preview element
    const previewElement = previewRef.current;
    if (!previewElement) return;
    
    // Check if selection is within the preview
    if (!isSelectionWithinElement(selection, previewElement)) return;
    
    try {
      // Get the selected text without any artifacts
      const selectedText = selection.toString().trim();
      if (!selectedText) return;
      
      // Get the range information
      const range = selection.getRangeAt(0);
      
      // Create a temporary element to hold the raw text content
      const tempElement = document.createElement('div');
      tempElement.textContent = rawText;
      document.body.appendChild(tempElement);
      
      // Create a new range to work with the raw text
      const tempRange = document.createRange();
      tempRange.selectNodeContents(tempElement);
      
      // Find the position in the raw text by comparing the selected text
      let startIndex = rawText.indexOf(selectedText);
      let endIndex = startIndex + selectedText.length;
      
      // If we found a valid position
      if (startIndex >= 0) {
        // Create a new gap with the correct position
        const newGap: Gap = {
          text: selectedText,
          startIndex: startIndex,
          endIndex: endIndex
        };
        
        // Check if this selection overlaps with an existing gap
        const overlappingGapIndex = gaps.findIndex(gap => 
          (newGap.startIndex >= gap.startIndex && newGap.startIndex < gap.endIndex) ||
          (newGap.endIndex > gap.startIndex && newGap.endIndex <= gap.endIndex) ||
          (newGap.startIndex <= gap.startIndex && newGap.endIndex >= gap.endIndex)
        );
        
        if (overlappingGapIndex >= 0) {
          // If it overlaps, remove the existing gap
          handleRemoveGap(gaps[overlappingGapIndex]);
        } else {
          // Otherwise, add the new gap
          const updatedGaps = [...gaps, newGap];
          setGaps(updatedGaps);
          updateQuestionWithCurrentState(rawText, updatedGaps);
        }
      }
      
      // Clean up the temporary element
      document.body.removeChild(tempElement);
    } catch (error) {
      console.error("Error processing text selection:", error);
    } finally {
      // Clear the selection
      selection.removeAllRanges();
    }
  };
  
  // Check if a selection is within a specific element
  const isSelectionWithinElement = (selection: Selection, element: HTMLElement) => {
    if (selection.rangeCount === 0) return false;
    
    const range = selection.getRangeAt(0);
    return element.contains(range.commonAncestorContainer);
  };
  
  // Helper function to get plain text content from HTML
  const getPlainTextFromHTML = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || '';  
  };
  
  // Add a new gap
  const handleAddGap = (newGap: Gap) => {
    // Add the new gap
    const updatedGaps = [...gaps, newGap];
    
    // Update state
    setGaps(updatedGaps);
    
    // Update the question
    updateQuestionWithCurrentState(rawText, updatedGaps);
  };
  
  // Remove a gap
  const handleRemoveGap = (gapToRemove: Gap) => {
    // Remove the gap
    const updatedGaps = gaps.filter(gap => 
      gap.startIndex !== gapToRemove.startIndex || gap.endIndex !== gapToRemove.endIndex
    );
    
    // Update state
    setGaps(updatedGaps);
    
    // Update the question
    updateQuestionWithCurrentState(rawText, updatedGaps);
  };
  
  // Update the question with current state
  const updateQuestionWithCurrentState = (text: string, currentGaps: Gap[]) => {
    // Sort gaps by position in text
    const sortedGaps = [...currentGaps].sort((a, b) => a.startIndex - b.startIndex);
    
    // Extract gap texts in the correct order
    const gapTexts = sortedGaps.map(gap => gap.text);
    
    // Store position information to handle duplicate gap texts
    const gapPositions = sortedGaps.map(gap => ({
      start: gap.startIndex,
      end: gap.endIndex
    }));
    
    // Update the question with enhanced position information
    onChange({
      ...question,
      text: text,
      gaps: gapTexts,
      gapPositions: gapPositions
    } as EnhancedGapFillQuestion);
  };
  
  // Render the preview text with gaps highlighted
  const renderPreviewText = () => {
    if (!rawText) return "";
    
    // Create a safe copy of the text to work with
    const safeText = rawText;
    let html = "";
    let lastIndex = 0;
    
    // Sort gaps by position (ascending)
    const sortedGaps = [...gaps].sort((a, b) => a.startIndex - b.startIndex);
    
    // Process each gap
    sortedGaps.forEach((gap, index) => {
      // Add text before the gap (safely escaped)
      const textBeforeGap = safeText.substring(lastIndex, gap.startIndex);
      html += escapeHtml(textBeforeGap);
      
      // Add the gap with highlighting and numbering (safely escaped)
      const gapText = safeText.substring(gap.startIndex, gap.endIndex);
      html += `<span 
        class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded cursor-pointer" 
        data-gap-index="${index}"
        data-start="${gap.startIndex}"
        data-end="${gap.endIndex}"
      >${escapeHtml(gapText)}<sub>${index + 1}</sub></span>`;
      
      // Update lastIndex
      lastIndex = gap.endIndex;
    });
    
    // Add any remaining text (safely escaped)
    const textAfterGaps = safeText.substring(lastIndex);
    html += escapeHtml(textAfterGaps);
    
    return html;
  };
  
  // Helper function to escape HTML special characters
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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
  useEffect(() => {
    setCustomTimeEnabled(question.timeLimit !== undefined);
    setCustomPointsEnabled(question.points !== undefined);
    setCustomMultiplierEnabled(question.multiplier !== undefined);
  }, [question.timeLimit, question.points, question.multiplier]);

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
          <div className="space-y-6">
            {/* Step 1: Enter the raw text */}
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Label>Schritt 1: Text eingeben</Label>
              </div>
              <Textarea
                value={rawText}
                onChange={handleRawTextChange}
                placeholder="Geben Sie hier Ihren vollständigen Text ein..."
                className="min-h-[100px]"
              />
            </div>
            
            {/* Step 2: Select text to create gaps */}
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Label>Schritt 2: Lücken erstellen</Label>
                <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  <Highlighter className="h-3 w-3 inline mr-1" />
                  Text markieren, um eine Lücke zu erstellen oder zu entfernen
                </div>
              </div>
              <div
                id="gap-preview"
                ref={previewRef}
                className="p-3 border rounded-md bg-background min-h-[100px] cursor-text"
                dangerouslySetInnerHTML={{ __html: renderPreviewText() }}
                onMouseUp={handleTextSelection}
                onClick={(e) => {
                  // Check if we clicked on a gap
                  const target = e.target as HTMLElement;
                  if (target.hasAttribute('data-gap-index')) {
                    // Get the gap index
                    const gapIndex = parseInt(target.getAttribute('data-gap-index') || '0');
                    // Remove the gap
                    if (gapIndex >= 0 && gapIndex < gaps.length) {
                      handleRemoveGap(gaps.sort((a, b) => a.startIndex - b.startIndex)[gapIndex]);
                    }
                  }
                }}
              />
            </div>
            
            {/* Gap answers list */}
            <div>
              <Label>Korrekte Antworten für die Lücken</Label>
              <AnimatePresence initial={false}>
                {gaps.length === 0 ? (
                  <div className="text-sm text-muted-foreground mt-2 italic">
                    Markieren Sie Text in der Vorschau oben, um Lücken zu erstellen.
                  </div>
                ) : (
                  gaps.sort((a, b) => a.startIndex - b.startIndex).map((gap, idx) => (
                    <motion.div
                      key={`gap-${gap.startIndex}-${gap.endIndex}`}
                      className="flex items-center gap-2 mt-2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 400, 
                        damping: 25 
                      }}
                    >
                      <Badge variant="outline" className="shrink-0">
                        Lücke {idx + 1}
                      </Badge>
                      <div className="flex-1 relative">
                        <Input
                          value={gap.text}
                          readOnly
                          className="flex-1 bg-muted pr-16"
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                          Pos: {gap.startIndex}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveGap(gap)}
                        aria-label="Lücke entfernen"
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </motion.div>
                  ))
                )}
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
