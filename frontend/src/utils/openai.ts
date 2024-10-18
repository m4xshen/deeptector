import { createOpenAI } from "@ai-sdk/openai"

export const openai = createOpenAI({
  apiKey: process.env.PLASMO_PUBLIC_OPENAI_SECRET_KEY
})
