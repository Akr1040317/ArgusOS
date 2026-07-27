import { GoogleGenerativeAI } from "@google/generative-ai"
import { ChatMessage, ChatCompletionOptions, ChatCompletionResult, TokenUsage } from "./types"

let geminiClient: GoogleGenerativeAI | null = null

export function createGeminiClient(apiKey: string): GoogleGenerativeAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(apiKey)
  }
  return geminiClient
}

export async function geminiCompletion(
  client: GoogleGenerativeAI,
  messages: ChatMessage[],
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const {
    model = "gemini-pro",
    temperature = 0.3,
    maxTokens,
    feature,
  } = options

  // Convert messages to Gemini format
  // Gemini doesn't have system messages, so we prepend system messages to the first user message
  const geminiMessages: Array<{ role: string; parts: Array<{ text: string }> }> = []
  
  let systemContent = ""
  for (const msg of messages) {
    if (msg.role === "system") {
      systemContent += msg.content + "\n\n"
    } else {
      const text = systemContent + msg.content
      geminiMessages.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text }],
      })
      systemContent = "" // Only prepend to first message
    }
  }

  const genModel = client.getGenerativeModel({ model, generationConfig: { temperature, maxOutputTokens: maxTokens } })
  
  // Start chat or continue conversation
  const chat = genModel.startChat({
    history: geminiMessages.slice(0, -1).map((msg) => ({
      role: msg.role as "user" | "model",
      parts: msg.parts,
    })),
  })

  const lastMessage = geminiMessages[geminiMessages.length - 1]
  const result = await chat.sendMessage(lastMessage.parts[0].text)
  const response = result.response
  const content = response.text()

  // Estimate token usage (Gemini API doesn't always return usage in free tier)
  const estimatedTokens = Math.ceil(content.length / 4) // Rough estimate: ~4 chars per token
  const promptTokens = Math.ceil(messages.map(m => m.content).join("").length / 4)

  const tokenUsage: TokenUsage = {
    promptTokens,
    completionTokens: estimatedTokens,
    totalTokens: promptTokens + estimatedTokens,
    feature,
    provider: "gemini",
    model,
    timestamp: new Date(),
    // Gemini pricing varies, estimate based on model
    cost: model.includes("pro") ? (promptTokens + estimatedTokens) * 0.5 / 1_000_000 : 0, // Free tier for some models
  }

  return { content, usage: tokenUsage }
}
