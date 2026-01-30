import OpenAI from "openai"
import { ChatMessage, ChatCompletionOptions, ChatCompletionResult, TokenUsage } from "./types"

export async function createOpenAIClient(apiKey: string): Promise<OpenAI> {
  const trimmedKey = apiKey.trim()
  if (!trimmedKey || trimmedKey.length < 20) {
    throw new Error("Invalid OpenAI API key format")
  }
  return new OpenAI({ apiKey: trimmedKey })
}

export async function openaiCompletion(
  client: OpenAI,
  messages: ChatMessage[],
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const {
    model = "gpt-4o-mini",
    temperature = 0.3,
    maxTokens,
    timeout = 30000,
    feature,
  } = options

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("OpenAI API request timed out")), timeout)
  })

  // Race between API call and timeout
  let response
  try {
    response = await Promise.race([
      client.chat.completions.create({
        model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature,
        max_tokens: maxTokens,
      }),
      timeoutPromise,
    ])
  } catch (apiError: any) {
    // Check for API key errors
    if (apiError?.status === 401 || apiError?.message?.includes("API key") || apiError?.message?.includes("Incorrect API key")) {
      throw new Error(`Invalid OpenAI API key. Please check your AI settings and ensure your API key is correct.`)
    }
    throw apiError
  }

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error("No content in OpenAI response")
  }

  // Extract token usage
  const usage = response.usage
  const tokenUsage: TokenUsage = {
    promptTokens: usage?.prompt_tokens || 0,
    completionTokens: usage?.completion_tokens || 0,
    totalTokens: usage?.total_tokens || 0,
    feature,
    provider: "openai",
    model,
    timestamp: new Date(),
    cost: calculateOpenAICost(model, usage?.prompt_tokens || 0, usage?.completion_tokens || 0),
  }

  return { content, usage: tokenUsage }
}

function calculateOpenAICost(model: string, promptTokens: number, completionTokens: number): number {
  // Pricing as of 2024 (approximate, update as needed)
  const pricing: Record<string, { prompt: number; completion: number }> = {
    "gpt-4o-mini": { prompt: 0.15 / 1_000_000, completion: 0.6 / 1_000_000 },
    "gpt-4o": { prompt: 2.5 / 1_000_000, completion: 10 / 1_000_000 },
    "gpt-4-turbo": { prompt: 10 / 1_000_000, completion: 30 / 1_000_000 },
    "gpt-3.5-turbo": { prompt: 0.5 / 1_000_000, completion: 1.5 / 1_000_000 },
  }

  const modelPricing = pricing[model] || pricing["gpt-4o-mini"]
  return promptTokens * modelPricing.prompt + completionTokens * modelPricing.completion
}
