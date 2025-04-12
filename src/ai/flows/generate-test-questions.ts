// Implemented the Genkit flow to generate test questions from a prompt provided by the teacher.
'use server';
/**
 * @fileOverview Generates test questions from a prompt provided by the teacher.
 *
 * - generateTestQuestions - A function that handles the test question generation process.
 * - GenerateTestQuestionsInput - The input type for the generateTestQuestions function.
 * - GenerateTestQuestionsOutput - The return type for the generateTestQuestions function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateTestQuestionsInputSchema = z.object({
  prompt: z.string().describe('A detailed prompt describing the desired test questions, including topic, language, and format.'),
});
export type GenerateTestQuestionsInput = z.infer<typeof GenerateTestQuestionsInputSchema>;

const GenerateTestQuestionsOutputSchema = z.object({
  questions: z.array(
    z.object({
      type: z.enum(['multiple_choice', 'true_false', 'gap_fill', 'matching', 'reordering']),
      question: z.string(),
      answers: z.array(z.string()),
      correctAnswer: z.union([z.string(), z.array(z.string())]),
      explanation: z.string().optional(),
    })
  ).describe('An array of test questions in JSON format.'),
});
export type GenerateTestQuestionsOutput = z.infer<typeof GenerateTestQuestionsOutputSchema>;

export async function generateTestQuestions(input: GenerateTestQuestionsInput): Promise<GenerateTestQuestionsOutput> {
  return generateTestQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTestQuestionsPrompt',
  input: {
    schema: z.object({
      prompt: z.string().describe('A detailed prompt describing the desired test questions, including topic, language, and format.'),
    }),
  },
  output: {
    schema: z.object({
      questions: z.array(
        z.object({
          type: z.enum(['multiple_choice', 'true_false', 'gap_fill', 'matching', 'reordering']),
          question: z.string(),
          answers: z.array(z.string()),
          correctAnswer: z.union([z.string(), z.array(z.string())]),
          explanation: z.string().optional(),
        })
      ).describe('An array of test questions in JSON format.'),
    }),
  },
  prompt: `You are an AI assistant designed to generate test questions for teachers. The test questions should be formatted as a JSON array.

  Each object in the array represents a question and should have the following keys:
  - type: (string) The type of question. Can be one of the following values: multiple_choice, true_false, gap_fill, matching, reordering.
  - question: (string) The question text.
  - answers: (array of strings) An array of possible answers.
  - correctAnswer: (string | array of strings) The correct answer(s) to the question.
  - explanation: (string, optional) An explanation of why the answer is correct.

  Based on the prompt below, generate a set of test questions that adhere to the specified format. Ensure the questions are relevant, accurate, and appropriate for the target audience. Make sure to include appropriate answers and explanations. The generated questions must be able to be parsed as valid JSON.

  Prompt: {{{prompt}}}
  `,  
});

const generateTestQuestionsFlow = ai.defineFlow<
  typeof GenerateTestQuestionsInputSchema,
  typeof GenerateTestQuestionsOutputSchema
>(
  {
    name: 'generateTestQuestionsFlow',
    inputSchema: GenerateTestQuestionsInputSchema,
    outputSchema: GenerateTestQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

