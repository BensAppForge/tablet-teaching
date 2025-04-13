"use client";

import Link from 'next/link';
import React from 'react';

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold tracking-tight text-center mb-8">
        Sprachenlernen testen. Einfach. Digital. Sicher.
      </h1>
      <div className="flex flex-col md:flex-row gap-4">
        <Link href="/teacher">
          <Card className="w-80 h-48 flex flex-col items-center justify-center p-4 hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Ich bin Lehrkraft</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Als Lehrkraft Tests erstellen und verteilen.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
        <Card className="w-80 h-48 flex flex-col items-center justify-center p-4 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Ich bin Schüler*in</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              Als Schüler*in an Tests teilnehmen.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LandingPage;
