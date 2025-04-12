// Use server directive is required for Genkit Flows.
'use server';

/**
 * @fileOverview Explains the answer to a question to a student.
 *
 * - explainAnswer - A function that explains the answer to a question.
 * - ExplainAnswerInput - The input type for the explainAnswer function.
 * - ExplainAnswerOutput - The return type for the explainAnswer function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const ExplainAnswerInputSchema = z.object({
  question: z.string().describe('The question that was asked.'),
  studentAnswer: z.string().describe('The student\s answer to the question.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  explanation: z.string().describe('The explanation of the correct answer.'),
});

export type ExplainAnswerInput = z.infer<typeof ExplainAnswerInputSchema>;

const ExplainAnswerOutputSchema = z.object({
  explanationForStudent: z.string().describe('The explanation of the correct answer tailored for the student, explaining why their answer was wrong.'),
});

export type ExplainAnswerOutput = z.infer<typeof ExplainAnswerOutputSchema>;

export async function explainAnswer(input: ExplainAnswerInput): Promise<ExplainAnswerOutput> {
  return explainAnswerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainAnswerPrompt',
  input: {
    schema: z.object({
      question: z.string().describe('The question that was asked.'),
      studentAnswer: z.string().describe('The student\'s answer to the question.'),
      correctAnswer: z.string().describe('The correct answer to the question.'),
      explanation: z.string().describe('The explanation of the correct answer.'),
    }),
  },
  output: {
    schema: z.object({
      explanationForStudent: z.string().describe('The explanation of the correct answer tailored for the student, explaining why their answer was wrong.'),
    }),
  },
  prompt: `You are a tutor explaining the correct answer to a student.\n\nQuestion: {{{question}}}\nStudent's Answer: {{{studentAnswer}}}\nCorrect Answer: {{{correctAnswer}}}\nExplanation: {{{explanation}}}\n\nExplain to the student why their answer was wrong and why the correct answer is correct. Tailor the explanation to the student's answer. Be friendly and encouraging.`,
});

const explainAnswerFlow = ai.defineFlow<
  typeof ExplainAnswerInputSchema,
  typeof ExplainAnswerOutputSchema
>({
  name: 'explainAnswerFlow',
  inputSchema: ExplainAnswerInputSchema,
  outputSchema: ExplainAnswerOutputSchema,
}, async input => {
  const {output} = await prompt(input);
  return output!;
});
