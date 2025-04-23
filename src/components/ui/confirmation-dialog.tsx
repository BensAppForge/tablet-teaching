"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  showDontAskAgain?: boolean;
  onDontAskAgainChange?: (checked: boolean) => void;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Bestätigen",
  cancelLabel = "Abbrechen",
  onConfirm,
  showDontAskAgain = false,
  onDontAskAgainChange,
}: ConfirmationDialogProps) {
  const [dontAskAgain, setDontAskAgain] = React.useState(false);

  const handleConfirm = () => {
    onConfirm();
    if (showDontAskAgain && onDontAskAgainChange) {
      onDontAskAgainChange(dontAskAgain);
    }
    onOpenChange(false);
  };

  const handleDontAskAgainChange = (checked: boolean) => {
    setDontAskAgain(checked);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          
          {showDontAskAgain && (
            <div className="flex items-center space-x-2 my-4 py-2 border-t border-b">
              <Checkbox 
                id="dont-ask-again" 
                checked={dontAskAgain} 
                onCheckedChange={handleDontAskAgainChange} 
              />
              <Label 
                htmlFor="dont-ask-again" 
                className="text-sm cursor-pointer"
              >
                Nicht mehr nachfragen
              </Label>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </motion.div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
