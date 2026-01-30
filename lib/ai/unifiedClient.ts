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
  if (!uid) {
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

  if (!providerConfig.enabled || !providerConfig.apiKey) {
    throw new Error(`Provider ${provider} is not configured or enabled`)
  }

  // Use model from preferences or fallback to options
  const model = options.model || modelPref.model || providerConfig.defaultModel

  try {
    const result: ChatCompletionResult = await providerChatCompletion(
      provider,
      providerConfig.apiKey,
      messages,
      {
        ...options,
        model,
      }
    )

    // Track token usage
    await trackTokenUsage(uid, result.usage)

    return result.content
  } catch (error: any) {
    console.error(`AI completion error (${provider}/${model}):`, error)
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
