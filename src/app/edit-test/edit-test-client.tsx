"use client";

import { useSearchParams } from "next/navigation";
import TestBuilder from "@/components/TestBuilder";
import AuthRequired from "@/components/AuthRequired";
import { motion } from "framer-motion";

/**
 * Client component for editing tests
 * Uses query parameters (?id=xyz) to get the test ID
 */
const EditTestClient = () => {
  const searchParams = useSearchParams();
  const testId = searchParams.get("id");

  return (
    <AuthRequired>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.3,
          type: "spring", 
          stiffness: 300, 
          damping: 30 
        }}
        className="container mx-auto py-8 px-4"
      >
        {testId ? (
          <TestBuilder testId={testId} />
        ) : (
          <motion.div 
            className="p-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-semibold mb-4">Fehler</h2>
            <p>Keine Test-ID gefunden. Bitte wählen Sie einen Test aus der Übersicht.</p>
          </motion.div>
        )}
      </motion.div>
    </AuthRequired>
  );
};

export default EditTestClient;
