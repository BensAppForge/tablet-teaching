"use client";

import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash, Plus, GripVertical } from "lucide-react";
import { ReorderingQuestion } from "@/lib/firebase/tests";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface HorizontalReorderingEditorProps {
  question: ReorderingQuestion;
  onChange: (question: ReorderingQuestion) => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

const HorizontalReorderingEditor: React.FC<HorizontalReorderingEditorProps> = ({
  question,
  onChange,
  onDelete,
  showDelete = false,
}) => {
  // Per-instance id prefix — see MultipleChoiceEditor for rationale.
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");

  // Stable opaque id per row. framer-motion's Reorder uses these as
  // identity; if we used `item` text directly, duplicate or empty
  // strings (very likely from AI output or a freshly added row) would
  // collide and the drag would visually swap but snap back on drop.
  const idCounterRef = useRef(0);
  const makeId = () => `r${idCounterRef.current++}`;
  const [rowIds, setRowIds] = useState<string[]>(() =>
    question.items.map(() => `r${idCounterRef.current++}`)
  );

  // When the editor is switched to a different question, regenerate
  // a fresh set of rowIds so drag identity matches the new items.
  useEffect(() => {
    setRowIds(question.items.map(() => makeId()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  // Defensive sync: if the items array length ever drifts from rowIds
  // (e.g. a question is loaded with different content under the same
  // id), bring rowIds back in line so Reorder.Group has matching
  // values & items.
  useEffect(() => {
    if (rowIds.length === question.items.length) return;
    setRowIds((prev) => {
      const next = prev.slice(0, question.items.length);
      while (next.length < question.items.length) next.push(makeId());
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.items.length]);

  // One-time per question: if the stored correctOrder isn't already
  // identity, rearrange items + isGap into the correct sequence and
  // reset correctOrder to [0,1,2,…]. The editor (and the rest of the
  // app) can then treat items as already-in-correct-order.
  useEffect(() => {
    const len = question.items.length;
    const co = question.correctOrder ?? [];
    const isIdentity =
      co.length === len && co.every((v, i) => v === i);
    if (isIdentity || len === 0) return;
    // Validate it's a permutation before trusting it.
    const seen = new Set<number>();
    for (const n of co) {
      if (!Number.isInteger(n) || n < 0 || n >= len || seen.has(n)) return;
      seen.add(n);
    }
    const reorderedItems = co.map((i) => question.items[i]);
    const reorderedIsGap =
      (question.isGap ?? []).length === len
        ? co.map((i) => !!question.isGap![i])
        : new Array(len).fill(false);
    onChange({
      ...question,
      items: reorderedItems,
      isGap: reorderedIsGap,
      correctOrder: reorderedItems.map((_, i) => i),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...question, text: e.target.value });
  };

  const handleItemChange = (index: number, value: string) => {
    const newItems = [...question.items];
    newItems[index] = value;
    onChange({ ...question, items: newItems });
  };

  const handleAddItem = () => {
    const newItems = [...question.items, ""];
    const newIsGap = question.isGap ? [...question.isGap, false] : undefined;
    setRowIds((prev) => [...prev, makeId()]);
    onChange({
      ...question,
      items: newItems,
      // items are kept in correct sequence — correctOrder is identity.
      correctOrder: newItems.map((_, i) => i),
      isGap: newIsGap,
    });
  };

  const handleRemoveItem = (index: number) => {
    if (question.items.length <= 2) return; // Minimum 2 items
    const newItems = question.items.filter((_, i) => i !== index);
    const newIsGap = question.isGap
      ? question.isGap.filter((_, i) => i !== index)
      : undefined;
    setRowIds((prev) => prev.filter((_, i) => i !== index));
    onChange({
      ...question,
      items: newItems,
      correctOrder: newItems.map((_, i) => i),
      isGap: newIsGap,
    });
  };

  const handleToggleGap = (index: number) => {
    // Initialize isGap array if it doesn't exist
    const currentIsGap = question.isGap || question.items.map(() => false);
    
    const newIsGap = [...currentIsGap];
    newIsGap[index] = !newIsGap[index];
    
    onChange({
      ...question,
      isGap: newIsGap
    });
  };

  const handleReorder = (newRowIds: string[]) => {
    // Use the OLD rowIds → old-index map so we know where each row's
    // text/isGap came from, regardless of duplicate or empty text.
    const oldIndexById = new Map<string, number>();
    rowIds.forEach((id, i) => oldIndexById.set(id, i));
    const newItems = newRowIds.map(
      (id) => question.items[oldIndexById.get(id) ?? 0]
    );
    const newIsGap = question.isGap
      ? newRowIds.map((id) => !!question.isGap![oldIndexById.get(id) ?? 0])
      : undefined;
    setRowIds(newRowIds);
    onChange({
      ...question,
      items: newItems,
      // Items are stored in the editor's display order, which IS the
      // correct sequence — so correctOrder stays identity.
      correctOrder: newItems.map((_, i) => i),
      isGap: newIsGap,
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
      <Card className="mb-4 border-purple-200 dark:border-purple-800">
        <CardHeader className="bg-purple-50 dark:bg-purple-950/20 flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-md font-medium">Horizontale Reihenfolge</CardTitle>
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
              <Label htmlFor={`${uid}-reorder-question-text`}>Fragetext</Label>
              <Input
                id={`${uid}-reorder-question-text`}
                value={question.text}
                onChange={handleTextChange}
                placeholder="Geben Sie hier Ihre Frage ein..."
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Elemente (in korrekter Reihenfolge)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Element hinzufügen
                </Button>
              </div>
              
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  <Reorder.Group
                    axis="y"
                    values={rowIds}
                    onReorder={handleReorder}
                    className="space-y-2"
                  >
                    {rowIds.map((rowId, idx) => (
                      <Reorder.Item
                        key={rowId}
                        value={rowId}
                        className="touch-none"
                      >
                        <motion.div
                          className="flex items-center gap-2"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.2 }}
                          layout
                        >
                          <div className="cursor-grab touch-none">
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            {idx + 1}
                          </Badge>
                          <Input
                            value={question.items[idx] ?? ""}
                            onChange={(e) => handleItemChange(idx, e.target.value)}
                            placeholder={`Element ${idx + 1}`}
                            className="flex-1"
                          />
                          <div className="flex items-center gap-2">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`${uid}-gap-switch-${idx}`}
                                checked={(question.isGap || [])[idx] || false}
                                onCheckedChange={() => handleToggleGap(idx)}
                              />
                              <Label htmlFor={`${uid}-gap-switch-${idx}`} className="text-xs">
                                Lücke
                              </Label>
                            </div>
                            {question.items.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(idx)}
                                aria-label="Element entfernen"
                              >
                                <Trash className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </AnimatePresence>
              </div>
            </div>

            {/* Distraktoren — extra words shown in the student's word bank
                above the exercise. They make the gap-fill harder without
                appearing in the draggable item list, and they never count
                as correct answers. */}
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
                  Distraktoren erscheinen oberhalb der Aufgabe im
                  Wortschatz-Kasten, zählen aber nie als richtige Antwort.
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

            <div className="p-3 bg-muted rounded-md">
              <div className="text-sm font-medium mb-2">Vorschau (Schüleransicht)</div>
              <div className="flex flex-wrap gap-2">
                {question.items.map((item, idx) => (
                  <div 
                    key={`preview-${idx}`}
                    className={`px-3 py-1.5 rounded-md border ${
                      (question.isGap || [])[idx] 
                        ? "border-dashed border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" 
                        : "bg-white dark:bg-gray-800"
                    }`}
                  >
                    {(question.isGap || [])[idx] ? "________" : item}
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

export default HorizontalReorderingEditor;
