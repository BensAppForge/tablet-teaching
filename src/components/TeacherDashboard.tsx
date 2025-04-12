"use client";

import React from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Eye, Wand2, Settings, HelpCircle, Share2, Plus, ClipboardList, ShieldCheck
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Define a color palette for the dashboard tiles
const tileColors = [
  "bg-orange-100 dark:bg-orange-900",
  "bg-green-100 dark:bg-green-900",
  "bg-blue-100 dark:bg-blue-900",
  "bg-red-100 dark:bg-red-900",
  "bg-purple-100 dark:bg-purple-900",
  "bg-yellow-100 dark:bg-yellow-900",
];

// Interface for the DashboardTile component props
interface DashboardTileProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  colorIndex: number; // Index to select a color from the tileColors array
}

// DashboardTile component with colorIndex prop
const DashboardTile: React.FC<DashboardTileProps> = ({ title, description, icon, href, colorIndex }) => {
  const tileColor = tileColors[colorIndex % tileColors.length]; // Cycle through colors

  return (
    <Link href={href}>
      <Card className={cn(
        "w-full  flex flex-col items-center justify-center p-2 hover:shadow-md transition-shadow rounded-xl",
        tileColor,
        "border-none" // Resets any borders
      )}>
        <CardContent className="flex-1 flex items-center justify-center">
          {icon}
        </CardContent>
        <CardFooter className="text-center p-1">
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardFooter>
      </Card>
    </Link>
  );
};

const TeacherDashboard: React.FC = () => {
  const router = useRouter();

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {/* Meine Tests */}
          <DashboardTile
            title="Meine Tests"
            description="Verwalten Sie Ihre vorhandenen Tests."
            icon={<ClipboardList className="h-8 w-8" />}
            href="/tests"
            colorIndex={0}
          />

          {/* Neuen Test */}
          <DashboardTile
            title="Neuen Test"
            description="Erstellen Sie einen neuen Test manuell oder mit KI-Unterstützung."
            icon={<Plus className="h-8 w-8" />}
            href="/create-test"
            colorIndex={1}
          />

          {/* Hilfe */}
          <DashboardTile
            title="Hilfe"
            description="In-App Hilfe und Anleitungen."
            icon={<HelpCircle className="h-8 w-8" />}
            href="/help"
            colorIndex={2}
          />

          {/* Einstellungen */}
          <DashboardTile
            title="Einstellungen"
            description="Profil, Sound/Konfetti, Premium-Funktionen verwalten."
            icon={<Settings className="h-8 w-8" />}
            href="/settings"
            colorIndex={3}
          />

          {/* Impressum */}
          <DashboardTile
            title="Impressum"
            description="Rechtliche Informationen."
            icon={<Eye className="h-8 w-8" />}
            href="/impressum"
            colorIndex={4}
          />

          {/* Datenschutz */}
          <DashboardTile
            title="Datenschutz"
            description="Datenschutzinformationen."
            icon={<ShieldCheck className="h-8 w-8" />}
            href="/datenschutz"
            colorIndex={5}
          />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TeacherDashboard;
