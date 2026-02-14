import { GoogleGenerativeAI } from "@google/generative-ai"

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI features will not work.")
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

export function getGeminiModel() {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured")
  }
  return genAI.getGenerativeModel({ model: "gemini-2.5-pro" })
}

export { genAI }
