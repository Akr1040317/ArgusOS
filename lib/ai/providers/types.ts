export type AIProvider = "openai" | "gemini" | "claude" | "perplexity"

export type AIFeature = 
  | "classification" 
  | "summarization" 
  | "draft_generation" 
  | "prep_pack" 
  | "chat" 
  | "extraction"
  | "follow_up_draft"

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  feature: AIFeature
  provider: AIProvider
  model: string
  timestamp: Date
  cost?: number // Estimated cost in USD
}

export interface AIProviderConfig {
  provider: AIProvider
  apiKey: string
  defaultModel?: string
  enabled: boolean
}

export interface AISettings {
  defaultProvider: AIProvider
  providers: Record<AIProvider, AIProviderConfig>
  featureToggles: Record<AIFeature, boolean>
  featureThrottles: Record<AIFeature, {
    enabled: boolean
    maxTokensPerDay?: number
    maxTokensPerHour?: number
  }>
  modelPreferences: Record<AIFeature, {
    provider: AIProvider
    model: string
  }>
}

export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface ChatCompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  timeout?: number
  feature: AIFeature
}

export interface ChatCompletionResult {
  content: string
  usage: TokenUsage
}
