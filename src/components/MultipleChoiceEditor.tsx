"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trash } from "lucide-react";
import { MultipleChoiceQuestion } from "@/lib/firebase/tests";

interface MultipleChoiceEditorProps {
  question: MultipleChoiceQuestion;
  onChange: (question: MultipleChoiceQuestion) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  onOptionChange: (index: number, value: string) => void;
  onCorrectOptionChange: (index: number) => void;
  disabled?: boolean;
}

const MultipleChoiceEditor: React.FC<MultipleChoiceEditorProps> = ({
  question,
  onChange,
  onAddOption,
  onRemoveOption,
  onOptionChange,
  onCorrectOptionChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="mc-question-text">Fragetext</Label>
        <Input
          id="mc-question-text"
          value={question.text}
          onChange={e => onChange({ ...question, text: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div>
        <Label>Antwortoptionen</Label>
        <RadioGroup
          value={String(question.correctOption)}
          onValueChange={val => onCorrectOptionChange(Number(val))}
          className="space-y-2"
        >
          {question.options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <RadioGroupItem value={String(idx)} id={`mc-option-${idx}`} />
              <Input
                value={opt}
                onChange={e => onOptionChange(idx, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                className="flex-1"
                disabled={disabled}
              />
              {question.options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveOption(idx)}
                  disabled={disabled}
                  aria-label="Antwortoption entfernen"
                >
                  <Trash className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </RadioGroup>
        {question.options.length < 4 && (
          <Button
            type="button"
            variant="outline"
            className="mt-2"
            onClick={onAddOption}
            disabled={disabled}
          >
            Option hinzufügen
          </Button>
        )}
      </div>
    </div>
  );
};

export default MultipleChoiceEditor;
