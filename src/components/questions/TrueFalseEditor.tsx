"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trash } from "lucide-react";
import { TrueFalseQuestion } from "@/lib/firebase/tests";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Clock, Award, Percent } from "lucide-react";

interface TrueFalseEditorProps {
  question: TrueFalseQuestion;
  onChange: (question: TrueFalseQuestion) => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

const TrueFalseEditor: React.FC<TrueFalseEditorProps> = ({
  question,
  onChange,
  onDelete,
  showDelete = false,
}) => {
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...question, text: e.target.value });
  };

  const handleTrueFalseChange = (value: string) => {
    onChange({ ...question, isTrue: value === "true" });
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
      <Card className="mb-4 border-blue-200 dark:border-blue-800">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20 flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-md font-medium">Wahr/Falsch</CardTitle>
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
              <Label htmlFor="tf-question-text">Aussage</Label>
              <Input
                id="tf-question-text"
                value={question.text}
                onChange={handleTextChange}
                placeholder="Geben Sie hier Ihre Aussage ein..."
              />
            </div>
            <div>
              <Label>Korrekte Antwort</Label>
              <RadioGroup
                value={question.isTrue ? "true" : "false"}
                onValueChange={handleTrueFalseChange}
                className="flex space-x-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="tf-true" />
                  <Label htmlFor="tf-true" className="cursor-pointer">Wahr</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="tf-false" />
                  <Label htmlFor="tf-false" className="cursor-pointer">Falsch</Label>
                </div>
              </RadioGroup>
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

export default TrueFalseEditor;
