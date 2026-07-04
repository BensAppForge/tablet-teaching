"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash, Plus, GripVertical } from "lucide-react";
import { ReorderingQuestion } from "@/lib/firebase/tests";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import SortableWord from "@/components/SortableWord";

interface VerticalReorderingEditorProps {
  question: ReorderingQuestion;
  onChange: (question: ReorderingQuestion) => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

// Inline restrictToVerticalAxis modifier — see views for rationale.
const restrictToVerticalAxis = ({
  transform,
}: {
  transform: { x: number; y: number; scaleX: number; scaleY: number };
}) => ({ ...transform, x: 0 });

const VerticalReorderingEditor: React.FC<VerticalReorderingEditorProps> = ({
  question,
  onChange,
  onDelete,
  showDelete = false,
}) => {
  // Per-instance id prefix — see MultipleChoiceEditor for rationale.
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");

  // Stable opaque id per row. See HorizontalReorderingEditor for the
  // full rationale — short version: dnd-kit uses the sortable id as
  // identity, so duplicate or empty item strings would otherwise
  // collide and break drag-and-drop.
  const idCounterRef = useRef(0);
  const makeId = () => `r${idCounterRef.current++}`;
  const [rowIds, setRowIds] = useState<string[]>(() =>
    question.items.map(() => `r${idCounterRef.current++}`)
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setRowIds(question.items.map(() => makeId()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  useEffect(() => {
    if (rowIds.length === question.items.length) return;
    setRowIds((prev) => {
      const next = prev.slice(0, question.items.length);
      while (next.length < question.items.length) next.push(makeId());
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.items.length]);

  // One-time per question: normalise non-identity correctOrder so
  // items are stored in correct sequence with correctOrder = identity.
  useEffect(() => {
    const len = question.items.length;
    const co = question.correctOrder ?? [];
    const isIdentity =
      co.length === len && co.every((v, i) => v === i);
    if (isIdentity || len === 0) return;
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = rowIds.indexOf(active.id as string);
    const newIdx = rowIds.indexOf(over.id as string);
    if (oldIdx < 0 || newIdx < 0) return;
    const newRowIds = arrayMove(rowIds, oldIdx, newIdx);
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
      <Card className="mb-4 border-red-200 dark:border-red-800">
        <CardHeader className="bg-red-50 dark:bg-red-950/20 flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-md font-medium">Vertikale Reihenfolge</CardTitle>
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

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={rowIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {rowIds.map((rowId, idx) => (
                      <SortableWord key={rowId} id={rowId}>
                        {({ attributes, listeners }) => (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              {...attributes}
                              {...listeners}
                              aria-label="Element verschieben"
                              className="cursor-grab touch-none p-1 -m-1 text-muted-foreground hover:text-foreground"
                            >
                              <GripVertical className="h-5 w-5" />
                            </button>
                            <Badge variant="outline" className="shrink-0">
                              {idx + 1}
                            </Badge>
                            <Input
                              value={question.items[idx] ?? ""}
                              onChange={(e) =>
                                handleItemChange(idx, e.target.value)
                              }
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
                                <Label
                                  htmlFor={`${uid}-gap-switch-${idx}`}
                                  className="text-xs"
                                >
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
                          </div>
                        )}
                      </SortableWord>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {/* Distraktoren — see HorizontalReorderingEditor for rationale. */}
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
              <div className="flex flex-col gap-2">
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

export default VerticalReorderingEditor;
