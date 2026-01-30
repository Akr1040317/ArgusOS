import { ChatMessage, ChatCompletionOptions, ChatCompletionResult, TokenUsage } from "./types"

export function createPerplexityClient(apiKey: string): { apiKey: string } {
  return { apiKey }
}

export async function perplexityCompletion(
  client: { apiKey: string },
  messages: ChatMessage[],
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const {
    model = "llama-3.1-sonar-small-128k-online",
    temperature = 0.3,
    maxTokens = 1024,
    timeout = 30000,
    feature,
  } = options

  // Perplexity uses OpenAI-compatible API
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${client.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(`Perplexity API error: ${error.error?.message || error.error || "Unknown error"}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content
  if (!content) {
    throw new Error("No content in Perplexity response")
  }

  const usage = data.usage || {}
  const tokenUsage: TokenUsage = {
    promptTokens: usage.prompt_tokens || 0,
    completionTokens: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    feature,
    provider: "perplexity",
    model,
    timestamp: new Date(),
    // Perplexity pricing varies, estimate
    cost: (usage.total_tokens || 0) * 0.2 / 1_000_000, // Rough estimate
  }

  return { content, usage: tokenUsage }
}
