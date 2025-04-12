
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

const TeacherDashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Teacher Dashboard</CardTitle>
          <CardDescription>Manage your tests and quizzes here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {/* Test Creation Section */}
            <div className="border rounded-md p-4">
              <h3 className="text-lg font-semibold mb-2">Create a New Test</h3>
              <div className="grid gap-2">
                <Label htmlFor="test-title">Test Title</Label>
                <Input type="text" id="test-title" placeholder="Enter test title" />

                <Label htmlFor="test-description">Test Description</Label>
                <Textarea id="test-description" placeholder="Enter test description" />

                <Button>Create Test</Button>
                <Button variant="secondary">AI-Assisted Test Creation</Button>
              </div>
            </div>

            {/* Test Management Section */}
            <div className="border rounded-md p-4">
              <h3 className="text-lg font-semibold mb-2">Manage Existing Tests</h3>
              <Table>
                <TableCaption>A list of your quizzes.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Code</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">INV941</TableCell>
                    <TableCell>Algebra Basics</TableCell>
                    <TableCell>Active</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm">View</Button>
                      <Button size="sm" variant="destructive">Delete</Button>
                    </TableCell>
                  </TableRow>
                    <TableRow>
                    <TableCell className="font-medium">INV941</TableCell>
                    <TableCell>Geometry</TableCell>
                    <TableCell>Expired</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm">View</Button>
                      <Button size="sm" variant="destructive">Delete</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherDashboard;
