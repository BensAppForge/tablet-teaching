"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

const CreateTestPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Neuen Test erstellen</CardTitle>
          <CardDescription>Erstellen Sie einen neuen Test manuell.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="test-title">Testtitel</Label>
            <Input type="text" id="test-title" placeholder="Geben Sie den Testtitel ein" />

            <Label htmlFor="test-description">Testbeschreibung</Label>
            <Textarea id="test-description" placeholder="Geben Sie die Testbeschreibung ein" />

            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Test erstellen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTestPage;
