"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash, Hand, Plus } from "lucide-react";
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

// Gap with position information. Offsets index into the raw text and are
// the single source of truth — the student renderer slices the text at
// exactly these positions, so they must stay in sync with every edit.
interface Gap {
  text: string;
  startIndex: number;
  endIndex: number;
}

// Word tokenizer for the tap-to-gap preview. Unicode-aware so umlauts,
// accents and apostrophes stay inside one word ("läuft", "doesn't",
// "Müller-Lüdenscheidt"); punctuation stays outside the gap.
const WORD_RE = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;

/**
 * Shift gap offsets across a text edit instead of keeping stale ones.
 * Strategy: find the single changed region via common prefix/suffix
 * (keystrokes and pastes are always one contiguous edit), then:
 *   - gaps entirely before it are untouched,
 *   - gaps entirely after it shift by the length delta,
 *   - gaps overlapping it are dropped — the gapped word itself changed,
 *     which the teacher sees immediately in the preview.
 */
function remapGaps(oldText: string, newText: string, gaps: Gap[]): Gap[] {
  if (oldText === newText) return gaps;

  let prefix = 0;
  const maxPrefix = Math.min(oldText.length, newText.length);
  while (prefix < maxPrefix && oldText[prefix] === newText[prefix]) prefix++;

  let suffix = 0;
  const maxSuffix = Math.min(oldText.length, newText.length) - prefix;
  while (
    suffix < maxSuffix &&
    oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
  ) {
    suffix++;
  }

  const oldEditEnd = oldText.length - suffix;
  const delta = newText.length - oldText.length;

  const kept: Gap[] = [];
  for (const gap of gaps) {
    if (gap.endIndex <= prefix) {
      kept.push(gap);
    } else if (gap.startIndex >= oldEditEnd) {
      kept.push({
        text: newText.slice(gap.startIndex + delta, gap.endIndex + delta),
        startIndex: gap.startIndex + delta,
        endIndex: gap.endIndex + delta,
      });
    }
    // Overlapping the edit region: dropped.
  }
  return kept;
}

const GapFillEditor: React.FC<GapFillEditorProps> = ({
  question,
  onChange,
  onDelete,
  showDelete = false,
}) => {
  // State for the raw text and gaps
  const [rawText, setRawText] = useState(question.text || "");
  const [gaps, setGaps] = useState<Gap[]>([]);

  // Initialize gaps from question on mount
  useEffect(() => {
    setRawText(question.text || "");

    if (question.gapPositions && question.gapPositions.length > 0) {
      // If we have position information, use it directly
      const restoredGaps = question.gapPositions.map((pos, index) => ({
        text: question.gaps[index] || "",
        startIndex: pos.start,
        endIndex: pos.end,
      }));
      setGaps(restoredGaps);
    } else if (question.gaps && question.gaps.length > 0) {
      // Legacy question without position info: locate each gap text in
      // the question text, skipping positions already taken so duplicate
      // words don't all collapse onto the first occurrence.
      extractGapsFromQuestion();
    } else {
      setGaps([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Extract gaps from an existing question by searching for them in the text
  const extractGapsFromQuestion = () => {
    const extractedGaps: Gap[] = [];
    const text = question.text || "";

    if (question.gaps) {
      for (const gapText of question.gaps) {
        if (!gapText) continue;

        let startPos = 0;
        let foundPos = -1;
        let found = false;

        // First occurrence that doesn't overlap an already-placed gap
        while (!found && (foundPos = text.indexOf(gapText, startPos)) !== -1) {
          const overlaps = extractedGaps.some(
            (gap) =>
              (foundPos >= gap.startIndex && foundPos < gap.endIndex) ||
              (foundPos + gapText.length > gap.startIndex &&
                foundPos + gapText.length <= gap.endIndex)
          );

          if (!overlaps) {
            extractedGaps.push({
              text: gapText,
              startIndex: foundPos,
              endIndex: foundPos + gapText.length,
            });
            found = true;
          }

          startPos = foundPos + 1;
        }
      }
    }

    setGaps(extractedGaps.sort((a, b) => a.startIndex - b.startIndex));
  };

  // Push the current state into the question. Gaps and their positions
  // are persisted sorted by position so `gaps[i]` and `gapPositions[i]`
  // always describe the same gap, in document order.
  const updateQuestionWithCurrentState = (text: string, currentGaps: Gap[]) => {
    const sortedGaps = [...currentGaps].sort(
      (a, b) => a.startIndex - b.startIndex
    );

    onChange({
      ...question,
      text: text,
      gaps: sortedGaps.map((gap) => gap.text),
      gapPositions: sortedGaps.map((gap) => ({
        start: gap.startIndex,
        end: gap.endIndex,
      })),
    });
  };

  // Text edits remap the gap offsets (see remapGaps) — previously the
  // old offsets were kept verbatim, so any edit before a gap silently
  // shifted every gap into the middle of the wrong word.
  const handleRawTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const remapped = remapGaps(rawText, newText, gaps);
    setRawText(newText);
    setGaps(remapped);
    updateQuestionWithCurrentState(newText, remapped);
  };

  const handleAddGap = (start: number, end: number, text: string) => {
    const updatedGaps = [...gaps, { text, startIndex: start, endIndex: end }];
    setGaps(updatedGaps);
    updateQuestionWithCurrentState(rawText, updatedGaps);
  };

  const handleRemoveGap = (gapToRemove: Gap) => {
    const updatedGaps = gaps.filter(
      (gap) =>
        gap.startIndex !== gapToRemove.startIndex ||
        gap.endIndex !== gapToRemove.endIndex
    );
    setGaps(updatedGaps);
    updateQuestionWithCurrentState(rawText, updatedGaps);
  };

  // Tap-to-gap preview. Words are buttons (tap = create gap), existing
  // gaps are highlighted buttons (tap = remove gap). Offsets come from
  // the tokenizer, never from string search — tapping the second "Mann"
  // in "Der Mann sieht den Mann" gaps exactly that occurrence. This
  // replaced a selection-based flow that resolved positions via
  // indexOf(selectedText) and fought the iOS text-selection callout.
  const renderPreview = () => {
    if (!rawText) {
      return (
        <span className="text-sm text-muted-foreground italic">
          Geben Sie zuerst oben einen Text ein.
        </span>
      );
    }

    const sortedGaps = [...gaps].sort((a, b) => a.startIndex - b.startIndex);
    const nodes: React.ReactNode[] = [];

    const pushWords = (segStart: number, segEnd: number) => {
      const segment = rawText.slice(segStart, segEnd);
      let last = 0;
      WORD_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = WORD_RE.exec(segment)) !== null) {
        if (match.index > last) {
          nodes.push(segment.slice(last, match.index));
        }
        const wordStart = segStart + match.index;
        const wordEnd = wordStart + match[0].length;
        const word = match[0];
        nodes.push(
          <button
            type="button"
            key={`w-${wordStart}`}
            onClick={() => handleAddGap(wordStart, wordEnd, word)}
            aria-label={`Lücke erstellen: ${word}`}
            className="inline rounded px-0.5 -mx-0.5 py-0.5 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {word}
          </button>
        );
        last = match.index + match[0].length;
      }
      if (last < segment.length) {
        nodes.push(segment.slice(last));
      }
    };

    let cursor = 0;
    sortedGaps.forEach((gap, index) => {
      if (gap.startIndex > cursor) pushWords(cursor, gap.startIndex);
      const gapText = rawText.slice(gap.startIndex, gap.endIndex);
      nodes.push(
        <button
          type="button"
          key={`g-${gap.startIndex}`}
          onClick={() => handleRemoveGap(gap)}
          aria-label={`Lücke entfernen: ${gapText}`}
          className="inline rounded px-1 py-0.5 bg-yellow-200 dark:bg-yellow-800 hover:bg-yellow-300 dark:hover:bg-yellow-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {gapText}
          <sub>{index + 1}</sub>
        </button>
      );
      cursor = gap.endIndex;
    });
    if (cursor < rawText.length) pushWords(cursor, rawText.length);

    return nodes;
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
              aria-label="Frage löschen"
              className="h-11 w-11 text-destructive hover:text-destructive hover:bg-destructive/10"
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

            {/* Step 2: Tap words to create gaps */}
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Label>Schritt 2: Lücken erstellen</Label>
                <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  <Hand className="h-3 w-3 inline mr-1" />
                  Wort antippen für eine Lücke, Lücke antippen zum Entfernen
                </div>
              </div>
              <div className="p-3 border rounded-md bg-background min-h-[100px] whitespace-pre-wrap leading-8">
                {renderPreview()}
              </div>
            </div>

            {/* Distractors — optional extra words shown in the student's
                word bank alongside the gap answers, to make filling the
                gaps harder. Updates question.distractors directly so the
                schema reflects whatever the teacher entered. */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Distraktoren (optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onChange({
                      ...question,
                      distractors: [...(question.distractors ?? []), ""],
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Distraktor hinzufügen
                </Button>
              </div>
              {(question.distractors ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Distraktoren erscheinen im Wortschatz der Schüler:innen,
                  zählen aber nie als richtige Antwort.
                </p>
              ) : (
                <AnimatePresence initial={false}>
                  {(question.distractors ?? []).map((value, idx) => (
                    <motion.div
                      key={`distractor-${idx}`}
                      className="flex items-center gap-2 mt-2"
                      initial={{ opacity: 0, x: 32 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -32 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                      }}
                      layout
                    >
                      <Badge variant="outline" className="shrink-0">
                        D{idx + 1}
                      </Badge>
                      <Input
                        value={value}
                        onChange={(e) => {
                          const next = [...(question.distractors ?? [])];
                          next[idx] = e.target.value;
                          onChange({ ...question, distractors: next });
                        }}
                        placeholder="Falsche Antwort"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const next = (question.distractors ?? []).filter(
                            (_, i) => i !== idx
                          );
                          onChange({ ...question, distractors: next });
                        }}
                        aria-label="Distraktor entfernen"
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Gap answers list */}
            <div>
              <Label>Korrekte Antworten für die Lücken</Label>
              <AnimatePresence initial={false}>
                {gaps.length === 0 ? (
                  <div className="text-sm text-muted-foreground mt-2 italic">
                    Tippen Sie oben auf ein Wort, um eine Lücke zu erstellen.
                  </div>
                ) : (
                  [...gaps]
                    .sort((a, b) => a.startIndex - b.startIndex)
                    .map((gap, idx) => (
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
                        <Input
                          value={gap.text}
                          readOnly
                          className="flex-1 bg-muted"
                        />
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
      </Card>
    </motion.div>
  );
};

export default GapFillEditor;
