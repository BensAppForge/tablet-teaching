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
import { Plus, Eye, Trash2, Wand2, Settings, HelpCircle, ClipboardList, Share2, BarChart3 } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useRouter } from 'next/navigation';

const TeacherDashboard: React.FC = () => {
  const router = useRouter();

  return (
    <TooltipProvider>
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Meine Tests */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Meine Tests</CardTitle>
            <CardDescription>Verwalten Sie Ihre vorhandenen Tests.</CardDescription>
          </CardHeader>
          <CardContent>
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
                        <Button size="sm" variant="secondary">
                          <Share2 className="mr-2 h-4 w-4" />
                          Verteilen
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Test verteilen
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm">
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Leaderboard
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Leaderboard anzeigen
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
                        <Button size="sm" variant="secondary">
                          <Share2 className="mr-2 h-4 w-4" />
                          Verteilen
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Test verteilen
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm">
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Leaderboard
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Leaderboard anzeigen
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
          </CardContent>
        </Card>

        {/* Neuen Test */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Neuen Test</CardTitle>
            <CardDescription>Erstellen Sie einen neuen Test manuell oder mit KI-Unterstützung.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button onClick={() => router.push('/create-test')}>
              <Plus className="mr-2 h-4 w-4" />
              Manuell erstellen
            </Button>
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
          </CardContent>
        </Card>

        {/* Hilfe */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Hilfe</CardTitle>
            <CardDescription>In-App Hilfe und Anleitungen.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline">
              <HelpCircle className="mr-2 h-4 w-4" />
              Hilfe anzeigen
            </Button>
          </CardContent>
        </Card>

        {/* Einstellungen */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Einstellungen</CardTitle>
            <CardDescription>Profil, Sound/Konfetti, Premium-Funktionen verwalten.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Einstellungen öffnen
            </Button>
          </CardContent>
        </Card>

        {/* Impressum */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Impressum</CardTitle>
            <CardDescription>Rechtliche Informationen.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost">
              Impressum anzeigen
            </Button>
          </CardContent>
        </Card>

        {/* Datenschutz */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Datenschutz</CardTitle>
            <CardDescription>Datenschutzinformationen.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost">
              Datenschutz anzeigen
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
    </TooltipProvider>
  );
};

export default TeacherDashboard;
