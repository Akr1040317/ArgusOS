import { ChatMessage, ChatCompletionOptions, ChatCompletionResult, TokenUsage } from "./types"

// Lazy import to avoid errors if package not installed
let Anthropic: any = null
try {
  Anthropic = require("@anthropic-ai/sdk").default
} catch {
  // Package not installed
}

export function createClaudeClient(apiKey: string): any {
  if (!Anthropic) {
    throw new Error("@anthropic-ai/sdk package not installed. Run: npm install @anthropic-ai/sdk")
  }
  return new Anthropic({ apiKey })
}

export async function claudeCompletion(
  client: Anthropic,
  messages: ChatMessage[],
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const {
    model = "claude-3-haiku-20240307",
    temperature = 0.3,
    maxTokens = 1024,
    timeout = 30000,
    feature,
  } = options

  // Convert messages to Claude format
  // Claude uses a system message separately
  let systemMessage = ""
  const claudeMessages: Array<{ role: "user" | "assistant"; content: string }> = []

  for (const msg of messages) {
    if (msg.role === "system") {
      systemMessage += msg.content + "\n\n"
    } else {
      claudeMessages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      })
    }
  }

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Claude API request timed out")), timeout)
  })

  // Race between API call and timeout
  const response = await Promise.race([
    client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemMessage || undefined,
      messages: claudeMessages,
    }),
    timeoutPromise,
  ])

  const content = response.content[0]?.type === "text" ? response.content[0].text : ""
  if (!content) {
    throw new Error("No content in Claude response")
  }

  const tokenUsage: TokenUsage = {
    promptTokens: response.usage.input_tokens,
    completionTokens: response.usage.output_tokens,
    totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    feature,
    provider: "claude",
    model,
    timestamp: new Date(),
    cost: calculateClaudeCost(model, response.usage.input_tokens, response.usage.output_tokens),
  }

  return { content, usage: tokenUsage }
}

function calculateClaudeCost(model: string, promptTokens: number, completionTokens: number): number {
  // Claude pricing as of 2024 (approximate)
  const pricing: Record<string, { prompt: number; completion: number }> = {
    "claude-3-haiku-20240307": { prompt: 0.25 / 1_000_000, completion: 1.25 / 1_000_000 },
    "claude-3-sonnet-20240229": { prompt: 3 / 1_000_000, completion: 15 / 1_000_000 },
    "claude-3-opus-20240229": { prompt: 15 / 1_000_000, completion: 75 / 1_000_000 },
  }

  const modelPricing = pricing[model] || pricing["claude-3-haiku-20240307"]
  return promptTokens * modelPricing.prompt + completionTokens * modelPricing.completion
}
