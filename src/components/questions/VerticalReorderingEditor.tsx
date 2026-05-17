"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash, Plus, GripVertical } from "lucide-react";
import { ReorderingQuestion } from "@/lib/firebase/tests";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface VerticalReorderingEditorProps {
  question: ReorderingQuestion;
  onChange: (question: ReorderingQuestion) => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

const VerticalReorderingEditor: React.FC<VerticalReorderingEditorProps> = ({
  question,
  onChange,
  onDelete,
  showDelete = false,
}) => {
  // Per-instance id prefix — see MultipleChoiceEditor for rationale.
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");

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
    
    // Update correctOrder to include the new item at the end
    const newCorrectOrder = [...(question.correctOrder || []), newItems.length - 1];
    
    // Update isGap array if it exists
    const newIsGap = question.isGap ? [...question.isGap, false] : undefined;
    
    onChange({
      ...question,
      items: newItems,
      correctOrder: newCorrectOrder,
      isGap: newIsGap
    });
  };

  const handleRemoveItem = (index: number) => {
    if (question.items.length <= 2) return; // Minimum 2 items
    
    const newItems = question.items.filter((_, i) => i !== index);
    
    // Update correctOrder to maintain valid indices
    let newCorrectOrder = [...(question.correctOrder || [])];
    
    // Remove the index from correctOrder
    newCorrectOrder = newCorrectOrder.filter(i => i !== index);
    
    // Adjust indices for removed item
    newCorrectOrder = newCorrectOrder.map(i => {
      if (i > index) return i - 1;
      return i;
    });
    
    // Update isGap array if it exists
    const newIsGap = question.isGap 
      ? question.isGap.filter((_, i) => i !== index)
      : undefined;
    
    onChange({
      ...question,
      items: newItems,
      correctOrder: newCorrectOrder,
      isGap: newIsGap
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

  const handleReorder = (newOrder: string[]) => {
    // Map the new order of items to their original indices
    const itemsMap = question.items.reduce((acc, item, index) => {
      acc[item] = index;
      return acc;
    }, {} as Record<string, number>);
    
    // Create new items array based on the reordered items
    const newItems = [...newOrder];
    
    // Update correctOrder to reflect the new order
    const newCorrectOrder = newOrder.map(item => itemsMap[item]);
    
    // Update isGap array if it exists to follow the items
    const newIsGap = question.isGap 
      ? newOrder.map(item => question.isGap![itemsMap[item]])
      : undefined;
    
    onChange({
      ...question,
      items: newItems,
      correctOrder: newCorrectOrder,
      isGap: newIsGap
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
                    values={question.items} 
                    onReorder={handleReorder}
                    className="space-y-2"
                  >
                    {question.items.map((item, idx) => (
                      <Reorder.Item 
                        key={`item-${idx}`}
                        value={item}
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
                            value={item}
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
