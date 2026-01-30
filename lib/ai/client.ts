// Legacy exports for backward compatibility
// New code should use lib/ai/unifiedClient.ts directly
export { unifiedChatCompletion as chatCompletion, parseJSONResponse, type ChatMessage } from "./unifiedClient"

// For backward compatibility, we need a version that doesn't require uid
// This will use environment variables as fallback
import OpenAI from "openai"

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY not set. AI features will not work.")
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
