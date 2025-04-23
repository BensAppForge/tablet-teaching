"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash, Plus, ArrowRight } from "lucide-react";
import { MatchingQuestion } from "@/lib/firebase/tests";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MatchingEditorProps {
  question: MatchingQuestion;
  onChange: (question: MatchingQuestion) => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

const CONNECTION_COLORS = [
  "rgb(var(--primary))",
  "rgb(239, 68, 68)",
  "rgb(59, 130, 246)",
  "rgb(16, 185, 129)",
  "rgb(245, 158, 11)",
  "rgb(168, 85, 247)",
];

const MatchingEditor: React.FC<MatchingEditorProps> = ({
  question,
  onChange,
  onDelete,
  showDelete = false,
}) => {
  const [showConnections, setShowConnections] = useState(true);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...question, text: e.target.value });
  };

  const handleLeftItemChange = (index: number, value: string) => {
    const newLeftItems = [...question.leftItems];
    newLeftItems[index] = value;
    onChange({ ...question, leftItems: newLeftItems });
  };

  const handleRightItemChange = (index: number, value: string) => {
    const newRightItems = [...question.rightItems];
    newRightItems[index] = value;
    onChange({ ...question, rightItems: newRightItems });
  };

  const handleMatchChange = (leftIndex: number, rightIndex: number) => {
    const newCorrectMatches = [...question.correctMatches];
    newCorrectMatches[leftIndex] = rightIndex;
    onChange({ ...question, correctMatches: newCorrectMatches });
  };

  const handleAddPair = () => {
    const newLeftItems = [...question.leftItems, ""];
    const newRightItems = [...question.rightItems, ""];
    const newCorrectMatches = [...question.correctMatches, newRightItems.length - 1];
    
    onChange({
      ...question,
      leftItems: newLeftItems,
      rightItems: newRightItems,
      correctMatches: newCorrectMatches,
    });
  };

  const handleRemovePair = (index: number) => {
    if (question.leftItems.length <= 2) return; // Minimum 2 pairs
    
    const newLeftItems = question.leftItems.filter((_, i) => i !== index);
    const newRightItems = question.rightItems.filter((_, i) => i !== index);
    
    // Update correctMatches to maintain valid indices
    let newCorrectMatches = question.correctMatches.filter((_, i) => i !== index);
    
    // Adjust correctMatches indices for removed item
    newCorrectMatches = newCorrectMatches.map(match => {
      if (match > index) return match - 1;
      return match;
    });
    
    onChange({
      ...question,
      leftItems: newLeftItems,
      rightItems: newRightItems,
      correctMatches: newCorrectMatches,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full"
    >
      <Card className="mb-4 border-green-200 dark:border-green-800">
        <CardHeader className="bg-green-50 dark:bg-green-950/20 flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-md font-medium">Zuordnung</CardTitle>
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
              <Label htmlFor="matching-question-text">Fragetext</Label>
              <Input
                id="matching-question-text"
                value={question.text}
                onChange={handleTextChange}
                placeholder="Geben Sie hier Ihre Frage ein..."
              />
            </div>
            
            <div className="flex justify-end mb-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowConnections(!showConnections)}
              >
                {showConnections ? "Verbindungen ausblenden" : "Verbindungen anzeigen"}
              </Button>
            </div>
            
            <div className="grid grid-cols-[1fr,auto,1fr] gap-2">
              <div className="font-medium text-center">Linke Seite</div>
              <div></div>
              <div className="font-medium text-center">Rechte Seite</div>
              
              <AnimatePresence initial={false}>
                {question.leftItems.map((leftItem, idx) => (
                  <React.Fragment key={`pair-${idx}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="relative"
                    >
                      <Input
                        id={`left-item-${idx}`}
                        value={leftItem}
                        onChange={(e) => handleLeftItemChange(idx, e.target.value)}
                        placeholder={`Linkes Element ${idx + 1}`}
                        className="w-full"
                      />
                      <div id={`left-${idx}`} className="absolute right-0 top-1/2 h-2 w-2 rounded-full bg-green-500" style={{ visibility: 'hidden' }} />
                    </motion.div>
                    
                    <div className="flex items-center justify-center">
                      {showConnections && (
                        <div 
                          className="w-6 h-0.5" 
                          style={{ 
                            backgroundColor: CONNECTION_COLORS[idx % CONNECTION_COLORS.length],
                          }}
                        />
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="flex gap-2"
                    >
                      <div className="relative flex-1">
                        <Input
                          id={`right-item-${idx}`}
                          value={question.rightItems[idx] || ""}
                          onChange={(e) => handleRightItemChange(idx, e.target.value)}
                          placeholder={`Rechtes Element ${idx + 1}`}
                          className="w-full"
                        />
                        <div id={`right-${idx}`} className="absolute left-0 top-1/2 h-2 w-2 rounded-full bg-green-500" style={{ visibility: 'hidden' }} />
                      </div>
                      
                      {question.leftItems.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePair(idx)}
                          aria-label="Paar entfernen"
                          className="h-10 w-10"
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </motion.div>
                  </React.Fragment>
                ))}
              </AnimatePresence>
            </div>
            
            <Button
              type="button"
              variant="outline"
              onClick={handleAddPair}
              className="w-full mt-2"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Paar hinzufügen
            </Button>
            
            <div className="mt-4 space-y-2">
              <Label>Korrekte Zuordnungen</Label>
              <div className="space-y-2">
                {question.leftItems.map((leftItem, leftIdx) => (
                  <div key={`match-${leftIdx}`} className="flex items-center gap-2">
                    <div className="w-1/3 truncate font-medium">
                      {leftItem || `Linkes Element ${leftIdx + 1}`}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Select
                      value={String(question.correctMatches[leftIdx] || 0)}
                      onValueChange={(value) => handleMatchChange(leftIdx, parseInt(value))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Wählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {question.rightItems.map((rightItem, rightIdx) => (
                          <SelectItem key={`option-${rightIdx}`} value={String(rightIdx)}>
                            {rightItem || `Rechtes Element ${rightIdx + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MatchingEditor;
