"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table"
import { Plus, Eye, Trash2, Wand2 } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const TeacherDashboard: React.FC = () => {
  return (
    <TooltipProvider>
    <div className="container mx-auto p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Lehrer-Dashboard</CardTitle>
          <CardDescription>Hier können Sie Ihre Tests und Quiz verwalten.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {/* Test Creation Section */}
            <div className="border rounded-md p-4">
              <h3 className="text-lg font-semibold mb-2">Neuen Test erstellen</h3>
              <div className="grid gap-2">
                <Label htmlFor="test-title">Testtitel</Label>
                <Input type="text" id="test-title" placeholder="Geben Sie den Testtitel ein" />

                <Label htmlFor="test-description">Testbeschreibung</Label>
                <Textarea id="test-description" placeholder="Geben Sie die Testbeschreibung ein" />

                <Button>Test erstellen</Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary">
                      <Wand2 className="mr-2 h-4 w-4" />
                      KI-gestützte Testerstellung
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Erstellen Sie Tests mit Hilfe von künstlicher Intelligenz.
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Test Management Section */}
            <div className="border rounded-md p-4">
              <h3 className="text-lg font-semibold mb-2">Vorhandene Tests verwalten</h3>
              <Table>
                <TableCaption>Eine Liste Ihrer Quiz.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Code</TableHead>
                    <TableHead>Titel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">INV941</TableCell>
                    <TableCell>Algebra Grundlagen</TableCell>
                    <TableCell>Aktiv</TableCell>
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            Anzeigen
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Test anzeigen
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Löschen
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Test löschen
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">INV941</TableCell>
                    <TableCell>Geometrie</TableCell>
                    <TableCell>Abgelaufen</TableCell>
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            Anzeigen
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Test anzeigen
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Löschen
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Test löschen
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
};

export default TeacherDashboard;

    