"use client";

import React, { useState } from "react";
import MatchingEditor from "./MatchingEditor";
import { MatchingQuestion } from "@/lib/firebase/tests";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

const MatchingEditorTest: React.FC = () => {
  const [question, setQuestion] = useState<MatchingQuestion>({
    type: "matching",
    text: "Match the items on the left with their corresponding items on the right",
    leftItems: ["Item 1", "Item 2", "Item 3"],
    rightItems: ["Match 1", "Match 2", "Match 3"],
    correctMatches: [0, 1, 2],
    distractors: ["Distractor 1"],
    timeLimit: 60,
    points: 10,
    multiplier: 1
  });

  const handleChange = (updatedQuestion: MatchingQuestion) => {
    setQuestion(updatedQuestion);
    console.log("Updated question:", updatedQuestion);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Matching Editor Test</h1>
      
      <div className="mb-8">
        <MatchingEditor 
          question={question} 
          onChange={handleChange}
          showDelete={true}
          onDelete={() => console.log("Delete clicked")}
        />
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">Current Question Data:</h2>
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(question, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchingEditorTest;
