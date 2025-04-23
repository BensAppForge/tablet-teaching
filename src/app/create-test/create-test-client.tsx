"use client";

import TestBuilder from "@/components/TestBuilder";
import AuthRequired from "@/components/AuthRequired";
import { motion } from "framer-motion";

const CreateTestClient = () => {
  return (
    <AuthRequired>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="container mx-auto py-8 px-4"
      >
        <TestBuilder />
      </motion.div>
    </AuthRequired>
  );
};

export default CreateTestClient;
