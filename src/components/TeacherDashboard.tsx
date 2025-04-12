"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Eye, Trash2, Wand2, Settings, HelpCircle, Share2, BarChart3, Plus, ClipboardList, Shield
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const DashboardTile = ({ title, description, icon, href }: { title: string; description: string; icon: React.ReactNode; href: string }) => (
  <Link href={href}>
    <Card className="w-full h-64 flex flex-col items-center justify-center p-4 hover:shadow-md transition-shadow">
      <CardContent className="flex-1 flex items-center justify-center">
        {icon}
      </CardContent>
      <CardFooter className="text-center p-2">
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardFooter>
    </Card>
  </Link>
);

const TeacherDashboard: React.FC = () => {
  const router = useRouter();

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Meine Tests */}
          <DashboardTile
            title="Meine Tests"
            description="Verwalten Sie Ihre vorhandenen Tests."
            icon={<ClipboardList className="h-12 w-12" />}
            href="/tests"
          />

          {/* Neuen Test */}
          <DashboardTile
            title="Neuen Test"
            description="Erstellen Sie einen neuen Test manuell oder mit KI-Unterstützung."
            icon={<Plus className="h-12 w-12" />}
            href="/create-test"
          />

          {/* Hilfe */}
          <DashboardTile
            title="Hilfe"
            description="In-App Hilfe und Anleitungen."
            icon={<HelpCircle className="h-12 w-12" />}
            href="/help"
          />

          {/* Einstellungen */}
          <DashboardTile
            title="Einstellungen"
            description="Profil, Sound/Konfetti, Premium-Funktionen verwalten."
            icon={<Settings className="h-12 w-12" />}
            href="/settings"
          />

          {/* Impressum */}
          <DashboardTile
            title="Impressum"
            description="Rechtliche Informationen."
            icon={<Eye className="h-12 w-12" />}
            href="/impressum"
          />

          {/* Datenschutz */}
          <DashboardTile
            title="Datenschutz"
            description="Datenschutzinformationen."
            icon={<Shield className="h-12 w-12" />}
            href="/datenschutz"
          />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TeacherDashboard;
