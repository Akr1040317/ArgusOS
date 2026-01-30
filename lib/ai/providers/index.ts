import { AIProvider, ChatMessage, ChatCompletionOptions, ChatCompletionResult } from "./types"
import { createOpenAIClient, openaiCompletion } from "./openai"
import { createGeminiClient, geminiCompletion } from "./gemini"
import { createClaudeClient, claudeCompletion } from "./claude"
import { createPerplexityClient, perplexityCompletion } from "./perplexity"
import OpenAI from "openai"

type ProviderClient = OpenAI | GoogleGenerativeAI | Anthropic | { apiKey: string }

const clients: Map<string, ProviderClient> = new Map()

function getClientKey(provider: AIProvider, apiKey: string): string {
  return `${provider}:${apiKey.substring(0, 10)}`
}

export async function getProviderClient(
  provider: AIProvider,
  apiKey: string
): Promise<ProviderClient> {
  const key = getClientKey(provider, apiKey)
  
  if (clients.has(key)) {
    return clients.get(key)!
  }

  let client: ProviderClient
  switch (provider) {
    case "openai":
      client = await createOpenAIClient(apiKey)
      break
    case "gemini":
      client = createGeminiClient(apiKey)
      break
    case "claude":
      client = createClaudeClient(apiKey)
      break
    case "perplexity":
      client = createPerplexityClient(apiKey)
      break
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }

  clients.set(key, client)
  return client
}

export async function chatCompletion(
  provider: AIProvider,
  apiKey: string,
  messages: ChatMessage[],
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const client = await getProviderClient(provider, apiKey)

  switch (provider) {
    case "openai":
      return openaiCompletion(client as OpenAI, messages, options)
    case "gemini":
      return geminiCompletion(client, messages, options)
    case "claude":
      return claudeCompletion(client, messages, options)
    case "perplexity":
      return perplexityCompletion(client as { apiKey: string }, messages, options)
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}
