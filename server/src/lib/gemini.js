import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("⚠️ [GEMINI] GEMINI_API_KEY is not set in server environment. Production extraction will require a valid key.");
}

export const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * Returns true if Gemini client is configured
 */
export function isGeminiConfigured() {
  return Boolean(genAI);
}
