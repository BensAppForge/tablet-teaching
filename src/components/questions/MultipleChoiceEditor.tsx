"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trash, Plus } from "lucide-react";
import { MultipleChoiceQuestion } from "@/lib/firebase/tests";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Clock, Award, Percent } from "lucide-react";

interface MultipleChoiceEditorProps {
  question: MultipleChoiceQuestion;
  onChange: (question: MultipleChoiceQuestion) => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

const MultipleChoiceEditor: React.FC<MultipleChoiceEditorProps> = ({
  question,
  onChange,
  onDelete,
  showDelete = false,
}) => {
  // Per-instance id prefix so multiple MC editors on the same page don't
  // share HTML ids (which would break <label htmlFor> linking and is
  // invalid HTML). Strip every non-alphanumeric char from useId so the
  // result is safe as a CSS selector / querySelector argument — React's
  // useId can emit colons, guillemets («r1r»), etc. depending on the
  // bundler/runtime.
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...question, text: e.target.value });
  };

  const handleCorrectOptionChange = (value: string) => {
    onChange({ ...question, correctOption: Number(value) });
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...question.options];
    newOptions[index] = value;
    onChange({ ...question, options: newOptions });
  };

  const handleAddOption = () => {
    if (question.options.length < 4) {
      onChange({ ...question, options: [...question.options, ""] });
    }
  };

  const handleRemoveOption = (index: number) => {
    if (question.options.length <= 2) return; // Minimum 2 options
    
    const newOptions = question.options.filter((_, i) => i !== index);
    
    // If we're removing the correct option, reset it to the first option
    let newCorrectOption = question.correctOption;
    if (index === question.correctOption) {
      newCorrectOption = 0;
    } else if (index < question.correctOption) {
      // If we're removing an option before the correct one, adjust the index
      newCorrectOption--;
    }
    
    onChange({ 
      ...question, 
      options: newOptions,
      correctOption: newCorrectOption
    });
  };

  // State for custom settings toggles
  const [customTimeEnabled, setCustomTimeEnabled] = React.useState(false);
  const [customPointsEnabled, setCustomPointsEnabled] = React.useState(false);
  const [customMultiplierEnabled, setCustomMultiplierEnabled] = React.useState(false);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full"
    >
      <Card className="mb-4 border-orange-200 dark:border-orange-800">
        <CardHeader className="bg-orange-50 dark:bg-orange-950/20 flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-md font-medium">Multiple Choice</CardTitle>
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
              <Label htmlFor={`${uid}-mc-question-text`}>Fragetext</Label>
              <Input
                id={`${uid}-mc-question-text`}
                value={question.text}
                onChange={handleTextChange}
                placeholder="Geben Sie hier Ihre Frage ein..."
              />
            </div>
            <div>
              <Label>Antwortoptionen</Label>
              <RadioGroup
                value={String(question.correctOption)}
                onValueChange={handleCorrectOptionChange}
                className="space-y-2 mt-2"
              >
                <AnimatePresence initial={false}>
                  {question.options.map((opt, idx) => (
                    <motion.div
                      key={idx}
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, x: 32 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -32 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30, duration: 0.25 }}
                      layout
                    >
                      <RadioGroupItem value={String(idx)} id={`${uid}-mc-option-${idx}`} />
                      <Input
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1"
                      />
                      {question.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveOption(idx)}
                          disabled={idx === question.correctOption}
                          aria-label="Antwortoption entfernen"
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </RadioGroup>
              {question.options.length < 4 && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={handleAddOption}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Option hinzufügen
                </Button>
              )}
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
                <Label htmlFor={`${uid}-custom-time-toggle`} className="text-sm font-normal cursor-pointer">
                  Eigene Zeitbegrenzung
                </Label>
              </div>
              <Switch
                id={`${uid}-custom-time-toggle`}
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
                <Label htmlFor={`${uid}-custom-points-toggle`} className="text-sm font-normal cursor-pointer">
                  Eigene Punktzahl
                </Label>
              </div>
              <Switch
                id={`${uid}-custom-points-toggle`}
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
                <Label htmlFor={`${uid}-custom-multiplier-toggle`} className="text-sm font-normal cursor-pointer">
                  Eigener Multiplikator
                </Label>
              </div>
              <Switch
                id={`${uid}-custom-multiplier-toggle`}
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

export default MultipleChoiceEditor;
