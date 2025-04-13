"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock } from "lucide-react";

const TeacherLoginPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4 flex items-center justify-center h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Lehrer Anmeldung</CardTitle>
          <CardDescription>Melden Sie sich mit Ihrem Lehrer-Konto an.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-2.5 h-5 w-5 text-muted-foreground peer-focus:text-primary" />
              <Input type="email" id="email" placeholder="name@example.com" className="pl-10" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Passwort</Label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-2.5 h-5 w-5 text-muted-foreground peer-focus:text-primary" />
              <Input type="password" id="password" placeholder="Passwort" className="pl-10" />
            </div>
          </div>
          <Button>
            Anmelden
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            Noch kein Konto? <a href="#" className="text-primary hover:underline">Registrieren</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherLoginPage;
