import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

export function buildAi(apiKey: string) {
	return genkit({
		plugins: [googleAI({ apiKey })],
		model: "googleai/gemini-2.5-flash",
	});
}
