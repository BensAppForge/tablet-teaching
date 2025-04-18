"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LANGUAGES = ["Deutsch", "Englisch", "Französisch", "Spanisch", "Italienisch"];

export interface TestGeneralSettings {
  title: string;
  description: string;
  targetLanguage: string;
  cefrLevel: string;
  defaultTimePerQuestion: number;
  defaultCreditPoints: number;
  defaultMultiplier: number;
}

interface TestGeneralSettingsFormProps {
  initialValues: TestGeneralSettings;
  onChange: (values: TestGeneralSettings) => void;
  mode?: "create" | "edit";
}

export const TestGeneralSettingsForm: React.FC<TestGeneralSettingsFormProps> = ({ initialValues, onChange, mode }) => {
  const [values, setValues] = useState<TestGeneralSettings>(initialValues);
  const [touched, setTouched] = useState<{ [K in keyof TestGeneralSettings]?: boolean }>({});

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  useEffect(() => {
    onChange(values);
  }, [values, onChange]);

  // Validation
  const errors: Partial<Record<keyof TestGeneralSettings, string>> = {};
  if (!values.title.trim()) errors.title = "Titel ist erforderlich.";
  if (!values.description.trim()) errors.description = "Beschreibung ist erforderlich.";
  if (!values.targetLanguage) errors.targetLanguage = "Sprache ist erforderlich.";
  if (!values.cefrLevel) errors.cefrLevel = "CEFR-Niveau ist erforderlich.";
  if (values.defaultTimePerQuestion < 5 || values.defaultTimePerQuestion > 60) errors.defaultTimePerQuestion = "Zeit pro Frage: 5–60 Sekunden.";
  if (values.defaultCreditPoints < 1 || values.defaultCreditPoints > 5) errors.defaultCreditPoints = "Punkte: 1–5.";
  if (values.defaultMultiplier < 1 || values.defaultMultiplier > 3) errors.defaultMultiplier = "Multiplikator: 1–3.";

  const handleChange = <K extends keyof TestGeneralSettings>(key: K, value: TestGeneralSettings[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {mode === "edit" ? "Test-Einstellungen bearbeiten" : "Allgemeine Test-Einstellungen"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={values.title}
              onChange={(e) => handleChange("title", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, title: true }))}
              required
            />
            {touched.title && errors.title && <div className="text-destructive text-sm mt-1">{errors.title}</div>}
          </div>

          <div>
            <Label htmlFor="description">Beschreibung *</Label>
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => handleChange("description", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, description: true }))}
              required
              rows={2}
            />
            {touched.description && errors.description && <div className="text-destructive text-sm mt-1">{errors.description}</div>}
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="targetLanguage">Sprache *</Label>
              <Select
                value={values.targetLanguage}
                onValueChange={(val) => handleChange("targetLanguage", val)}
              >
                <SelectTrigger id="targetLanguage">
                  <SelectValue placeholder="Sprache wählen" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched.targetLanguage && errors.targetLanguage && <div className="text-destructive text-sm mt-1">{errors.targetLanguage}</div>}
            </div>
            <div className="flex-1">
              <Label htmlFor="cefrLevel">CEFR-Niveau *</Label>
              <Select
                value={values.cefrLevel}
                onValueChange={(val) => handleChange("cefrLevel", val)}
              >
                <SelectTrigger id="cefrLevel">
                  <SelectValue placeholder="Niveau wählen" />
                </SelectTrigger>
                <SelectContent>
                  {CEFR_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched.cefrLevel && errors.cefrLevel && <div className="text-destructive text-sm mt-1">{errors.cefrLevel}</div>}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="defaultTimePerQuestion">Zeit pro Frage (Sekunden) *</Label>
              <Slider
                id="defaultTimePerQuestion"
                min={5}
                max={60}
                step={5}
                value={[values.defaultTimePerQuestion]}
                onValueChange={([val]) => handleChange("defaultTimePerQuestion", val)}
              />
              <div className="text-sm mt-1">{values.defaultTimePerQuestion} Sekunden</div>
              {touched.defaultTimePerQuestion && errors.defaultTimePerQuestion && <div className="text-destructive text-sm mt-1">{errors.defaultTimePerQuestion}</div>}
            </div>
            <div className="flex-1">
              <Label htmlFor="defaultCreditPoints">Punkte pro Frage *</Label>
              <Slider
                id="defaultCreditPoints"
                min={1}
                max={5}
                step={1}
                value={[values.defaultCreditPoints]}
                onValueChange={([val]) => handleChange("defaultCreditPoints", val)}
              />
              <div className="text-sm mt-1">{values.defaultCreditPoints} Punkt(e)</div>
              {touched.defaultCreditPoints && errors.defaultCreditPoints && <div className="text-destructive text-sm mt-1">{errors.defaultCreditPoints}</div>}
            </div>
            <div className="flex-1">
              <Label htmlFor="defaultMultiplier">Multiplikator *</Label>
              <Slider
                id="defaultMultiplier"
                min={1}
                max={3}
                step={0.5}
                value={[values.defaultMultiplier]}
                onValueChange={([val]) => handleChange("defaultMultiplier", val)}
              />
              <div className="text-sm mt-1">{values.defaultMultiplier}x</div>
              {touched.defaultMultiplier && errors.defaultMultiplier && <div className="text-destructive text-sm mt-1">{errors.defaultMultiplier}</div>}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TestGeneralSettingsForm;
