import { chatCompletion as providerChatCompletion } from "./providers"
import { getAISettings } from "./settings"
import { trackTokenUsage, checkThrottle } from "./tokenTracker"
import { ChatMessage, ChatCompletionOptions, ChatCompletionResult, AIFeature } from "./providers/types"
import OpenAI from "openai"

// Fallback OpenAI client for backward compatibility
let fallbackOpenAI: OpenAI | null = null
if (process.env.OPENAI_API_KEY) {
  fallbackOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

/**
 * Unified AI client that handles settings, throttling, and token tracking
 * If uid is not provided, falls back to environment variables (backward compatibility)
 */
export async function unifiedChatCompletion(
  uid: string | null,
  messages: ChatMessage[],
  options: ChatCompletionOptions
): Promise<string> {
  // Backward compatibility: if no uid, use environment variables
  // NOTE: This path doesn't track tokens since we don't have a uid
  // All new code should provide a uid for proper token tracking
  if (!uid) {
    console.warn(`[UnifiedClient] WARNING: AI call made without uid - token usage will NOT be tracked! Feature: ${options.feature}`)
    if (!fallbackOpenAI) {
      throw new Error("No API key configured and no user ID provided")
    }
    const model = options.model || "gpt-4o-mini"
    const response = await fallbackOpenAI.chat.completions.create({
      model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options.temperature || 0.3,
      max_tokens: options.maxTokens,
    })
    
    // Try to track tokens even without uid (using a system-wide tracking)
    // This is a fallback for legacy code
    if (response.usage) {
      try {
        const usage = {
          promptTokens: response.usage.prompt_tokens || 0,
          completionTokens: response.usage.completion_tokens || 0,
          totalTokens: response.usage.total_tokens || 0,
          feature: options.feature,
          provider: "openai" as const,
          model,
          timestamp: new Date(),
          cost: 0, // Can't calculate cost without proper pricing function
        }
        console.warn(`[UnifiedClient] Token usage (not tracked):`, usage)
      } catch (e) {
        // Ignore tracking errors in fallback path
      }
    }
    
    return response.choices[0]?.message?.content || ""
  }
  const settings = await getAISettings(uid)

  // Check if feature is enabled
  if (!settings.featureToggles[options.feature]) {
    throw new Error(`Feature ${options.feature} is disabled`)
  }

  // Check throttling
  const throttle = settings.featureThrottles[options.feature]
  const throttleCheck = await checkThrottle(uid, options.feature, throttle)
  if (!throttleCheck.allowed) {
    throw new Error(`Feature throttled: ${throttleCheck.reason}`)
  }

  // Get model preferences for this feature
  const modelPref = settings.modelPreferences[options.feature]
  const provider = modelPref.provider
  const providerConfig = settings.providers[provider]

  console.log(`[UnifiedClient] Provider config for ${provider}:`, {
    enabled: providerConfig.enabled,
    hasApiKey: !!providerConfig.apiKey,
    apiKeyLength: providerConfig.apiKey?.length || 0,
    apiKeyPrefix: providerConfig.apiKey?.substring(0, 10) || "none",
  })

  if (!providerConfig.enabled) {
    throw new Error(`Provider ${provider} is not enabled. Please enable it in Settings → AI Settings.`)
  }

  if (!providerConfig.apiKey || providerConfig.apiKey.trim().length === 0) {
    throw new Error(`API key for ${provider} is not configured. Please add your API key in Settings → AI Settings.`)
  }

  // Validate API key format (basic check)
  const trimmedKey = providerConfig.apiKey.trim()
  if (trimmedKey.length < 20) {
    throw new Error(`Invalid API key format for ${provider}. API keys should be longer than 20 characters. Please check your AI settings.`)
  }
  
  // For OpenAI, check if it starts with sk-
  if (provider === "openai" && !trimmedKey.startsWith("sk-")) {
    console.warn(`[UnifiedClient] OpenAI API key doesn't start with 'sk-'. This might be invalid.`)
  }

  // Use model from preferences or fallback to options
  const model = options.model || modelPref.model || providerConfig.defaultModel

  try {
    console.log(`[UnifiedClient] Making AI call for ${uid}:`, {
      feature: options.feature,
      provider,
      model,
      messageCount: messages.length,
    })

    // Trim the API key before using it
    const trimmedApiKey = providerConfig.apiKey.trim()
    
    const result: ChatCompletionResult = await providerChatCompletion(
      provider,
      trimmedApiKey,
      messages,
      {
        ...options,
        model,
      }
    )

    console.log(`[UnifiedClient] AI call completed for ${uid}:`, {
      feature: options.feature,
      tokens: result.usage.totalTokens,
      cost: result.usage.cost,
    })

    // Track token usage
    try {
      await trackTokenUsage(uid, result.usage)
      console.log(`[UnifiedClient] Token usage tracked successfully for ${uid}`)
    } catch (trackError: any) {
      console.error(`[UnifiedClient] Failed to track token usage for ${uid}:`, trackError)
      // Don't throw - token tracking failure shouldn't break the main flow
    }

    return result.content
  } catch (error: any) {
    console.error(`[UnifiedClient] AI completion error (${provider}/${model}):`, error)
    throw error
  }
}

/**
 * Parse JSON response with retry, using unified client
 */
export async function parseJSONResponse<T>(
  uid: string | null,
  content: string,
  feature: AIFeature,
  retryPrompt?: string
): Promise<T> {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || content.match(/(\{[\s\S]*\})/)
  const jsonString = jsonMatch ? jsonMatch[1] : content

  try {
    return JSON.parse(jsonString) as T
  } catch (error) {
    // If retry prompt provided, try once more
    if (retryPrompt) {
      const fixedContent = await unifiedChatCompletion(
        uid,
        [
          { role: "system", content: retryPrompt },
          { role: "user", content: `Fix this JSON:\n${content}` },
        ],
        {
          feature,
          temperature: 0.2,
          maxTokens: 500,
        }
      )
      return parseJSONResponse<T>(uid, fixedContent, feature)
    }
    throw new Error(`Failed to parse JSON: ${error}`)
  }
}

// Re-export types for convenience
export type { ChatMessage, AIFeature, AIProvider } from "./providers/types"
