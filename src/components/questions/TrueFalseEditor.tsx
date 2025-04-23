"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trash } from "lucide-react";
import { TrueFalseQuestion } from "@/lib/firebase/tests";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      </Card>
    </motion.div>
  );
};

export default TrueFalseEditor;
