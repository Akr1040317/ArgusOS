import { adminDb } from "@/lib/firebase/admin"
import { AISettings, AIProvider, AIFeature, AIProviderConfig } from "./providers/types"

const DEFAULT_SETTINGS: AISettings = {
  defaultProvider: "openai",
  providers: {
    openai: {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY || "",
      defaultModel: "gpt-4o-mini",
      enabled: true,
    },
    gemini: {
      provider: "gemini",
      apiKey: "",
      defaultModel: "gemini-pro",
      enabled: false,
    },
    claude: {
      provider: "claude",
      apiKey: "",
      defaultModel: "claude-3-haiku-20240307",
      enabled: false,
    },
    perplexity: {
      provider: "perplexity",
      apiKey: "",
      defaultModel: "llama-3.1-sonar-small-128k-online",
      enabled: false,
    },
  },
  featureToggles: {
    classification: true,
    summarization: true,
    draft_generation: true,
    prep_pack: true,
    chat: true,
    extraction: true,
    follow_up_draft: true,
  },
  featureThrottles: {
    classification: { enabled: false },
    summarization: { enabled: false },
    draft_generation: { enabled: false },
    prep_pack: { enabled: false },
    chat: { enabled: false },
    extraction: { enabled: false },
    follow_up_draft: { enabled: false },
  },
  modelPreferences: {
    classification: { provider: "openai", model: "gpt-4o-mini" },
    summarization: { provider: "openai", model: "gpt-4o-mini" },
    draft_generation: { provider: "openai", model: "gpt-4o-mini" },
    prep_pack: { provider: "openai", model: "gpt-4o-mini" },
    chat: { provider: "openai", model: "gpt-4o-mini" },
    extraction: { provider: "openai", model: "gpt-4o-mini" },
    follow_up_draft: { provider: "openai", model: "gpt-4o-mini" },
  },
}

/**
 * Get AI settings for a user, with defaults
 */
export async function getAISettings(uid: string): Promise<AISettings> {
  try {
    const settingsDoc = await adminDb.collection("users").doc(uid).get()
    const userData = settingsDoc.data()
    const aiSettings = userData?.aiSettings

    if (!aiSettings) {
      // Initialize with defaults
      const defaultSettings = { ...DEFAULT_SETTINGS }
      // Use environment variable if available
      if (process.env.OPENAI_API_KEY) {
        defaultSettings.providers.openai.apiKey = process.env.OPENAI_API_KEY
      }
      await adminDb.collection("users").doc(uid).set(
        { aiSettings: defaultSettings },
        { merge: true }
      )
      return defaultSettings
    }

    // Merge with defaults to ensure all fields exist
    return {
      defaultProvider: aiSettings.defaultProvider || DEFAULT_SETTINGS.defaultProvider,
      providers: {
        ...DEFAULT_SETTINGS.providers,
        ...aiSettings.providers,
      },
      featureToggles: {
        ...DEFAULT_SETTINGS.featureToggles,
        ...aiSettings.featureToggles,
      },
      featureThrottles: {
        ...DEFAULT_SETTINGS.featureThrottles,
        ...aiSettings.featureThrottles,
      },
      modelPreferences: {
        ...DEFAULT_SETTINGS.modelPreferences,
        ...aiSettings.modelPreferences,
      },
    }
  } catch (error) {
    console.error("Error getting AI settings:", error)
    return DEFAULT_SETTINGS
  }
}

/**
 * Update AI settings for a user
 */
export async function updateAISettings(
  uid: string,
  updates: Partial<AISettings>
): Promise<void> {
  const currentSettings = await getAISettings(uid)
  const mergedSettings: AISettings = {
    ...currentSettings,
    ...updates,
    providers: {
      ...currentSettings.providers,
      ...updates.providers,
    },
    featureToggles: {
      ...currentSettings.featureToggles,
      ...updates.featureToggles,
    },
    featureThrottles: {
      ...currentSettings.featureThrottles,
      ...updates.featureThrottles,
    },
    modelPreferences: {
      ...currentSettings.modelPreferences,
      ...updates.modelPreferences,
    },
  }

  await adminDb.collection("users").doc(uid).set(
    { aiSettings: mergedSettings },
    { merge: true }
  )
}

/**
 * Update provider API key
 */
export async function updateProviderKey(
  uid: string,
  provider: AIProvider,
  apiKey: string
): Promise<void> {
  const settings = await getAISettings(uid)
  settings.providers[provider] = {
    ...settings.providers[provider],
    apiKey,
    enabled: apiKey.length > 0,
  }
  await updateAISettings(uid, settings)
}
