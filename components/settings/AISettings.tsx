"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Save, Eye, EyeOff, Settings2, Zap, BarChart3 } from "lucide-react"
import { AIProvider, AIFeature } from "@/lib/ai/providers/types"

interface AISettings {
  defaultProvider: AIProvider
  providers: Record<AIProvider, {
    provider: AIProvider
    apiKey: string
    defaultModel?: string
    enabled: boolean
  }>
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

const PROVIDER_NAMES: Record<AIProvider, string> = {
  openai: "OpenAI",
  gemini: "Google Gemini",
  claude: "Anthropic Claude",
  perplexity: "Perplexity",
}

const FEATURE_NAMES: Record<AIFeature, string> = {
  classification: "Email Classification",
  summarization: "Thread Summarization",
  draft_generation: "Draft Generation",
  prep_pack: "Meeting Prep Packs",
  chat: "Chat Assistant",
  extraction: "Action Extraction",
  follow_up_draft: "Follow-up Drafts",
}

const DEFAULT_MODELS: Record<AIProvider, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
  gemini: ["gemini-pro", "gemini-pro-vision"],
  claude: ["claude-3-haiku-20240307", "claude-3-sonnet-20240229", "claude-3-opus-20240229"],
  perplexity: ["llama-3.1-sonar-small-128k-online", "llama-3.1-sonar-large-128k-online"],
}

export function AISettings() {
  const [user] = useAuthState(auth)
  const [settings, setSettings] = useState<AISettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showKeys, setShowKeys] = useState<Record<AIProvider, boolean>>({
    openai: false,
    gemini: false,
    claude: false,
    perplexity: false,
  })
  const [tokenUsage, setTokenUsage] = useState<any>(null)
  const [usageLoading, setUsageLoading] = useState(false)
  const [tokenUsageDays, setTokenUsageDays] = useState(7)

  useEffect(() => {
    if (user) {
      fetchSettings()
      fetchTokenUsage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchSettings = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/ai/settings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTokenUsage = async (days: number = 7) => {
    if (!user) return

    setUsageLoading(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/ai/token-usage?days=${days}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        console.log("[AISettings] Token usage fetched:", data.usage)
        setTokenUsage(data.usage)
      } else {
        console.error("[AISettings] Failed to fetch token usage:", data.error)
      }
    } catch (error: any) {
      console.error("[AISettings] Error fetching token usage:", error)
    } finally {
      setUsageLoading(false)
    }
  }

  const updateProviderKey = async (provider: AIProvider, apiKey: string) => {
    if (!user) return

    const trimmedKey = apiKey.trim()
    if (trimmedKey.length === 0) {
      console.warn(`[AISettings] Empty API key provided for ${provider}`)
      return
    }

    console.log(`[AISettings] Updating ${provider} API key, length: ${trimmedKey.length}, starts with: ${trimmedKey.substring(0, 5)}`)

    setSaving(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/ai/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider,
          apiKey: trimmedKey,
        }),
      })

      const data = await response.json()
      if (data.success) {
        console.log(`[AISettings] Successfully updated ${provider} API key`)
        await fetchSettings()
      } else {
        console.error(`[AISettings] Failed to update API key:`, data.error)
        alert(`Failed to save API key: ${data.error || "Unknown error"}`)
      }
    } catch (error: any) {
      console.error("Error updating API key:", error)
      alert(`Error saving API key: ${error.message || "Unknown error"}`)
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = async (updates: Partial<AISettings>) => {
    if (!user || !settings) return

    setSaving(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/ai/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updates }),
      })

      const data = await response.json()
      if (data.success) {
        await fetchSettings()
      }
    } catch (error) {
      console.error("Error updating settings:", error)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-text2" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Token Usage Dashboard */}
      <Card className="bg-panel border-border-0">
        <CardHeader>
          <CardTitle className="text-text0 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Token Usage
          </CardTitle>
          <CardDescription className="text-text1">
            Track your AI token consumption and costs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {usageLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-text2" />
            </div>
          ) : tokenUsage ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-text2 text-sm">Last {tokenUsageDays} days</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTokenUsage(tokenUsageDays)}
                  className="h-7 text-xs"
                >
                  Refresh
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-border-0 bg-bg1">
                  <p className="text-text2 text-sm">Total Tokens</p>
                  <p className="text-text0 text-2xl font-bold">
                    {tokenUsage.totalTokens.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-border-0 bg-bg1">
                  <p className="text-text2 text-sm">Estimated Cost</p>
                  <p className="text-text0 text-2xl font-bold">
                    ${tokenUsage.totalCost.toFixed(4)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-text0 font-medium mb-2">By Feature</h4>
                <div className="space-y-2">
                  {Object.entries(tokenUsage.byFeature || {}).map(([feature, stats]: [string, any]) => (
                    <div
                      key={feature}
                      className="flex items-center justify-between p-3 rounded-lg border border-border-0 bg-bg1"
                    >
                      <div>
                        <p className="text-text0 text-sm font-medium">
                          {FEATURE_NAMES[feature as AIFeature] || feature}
                        </p>
                        <p className="text-text2 text-xs">
                          {stats.count} requests
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-text0 text-sm font-medium">
                          {stats.tokens.toLocaleString()} tokens
                        </p>
                        <p className="text-text2 text-xs">
                          ${stats.cost.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-text0 font-medium mb-2">By Provider</h4>
                <div className="space-y-2">
                  {Object.entries(tokenUsage.byProvider || {}).map(([provider, stats]: [string, any]) => (
                    <div
                      key={provider}
                      className="flex items-center justify-between p-3 rounded-lg border border-border-0 bg-bg1"
                    >
                      <p className="text-text0 text-sm font-medium">{provider}</p>
                      <div className="text-right">
                        <p className="text-text0 text-sm font-medium">
                          {stats.tokens.toLocaleString()} tokens
                        </p>
                        <p className="text-text2 text-xs">
                          ${stats.cost.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-text2 text-sm">No usage data available</p>
          )}
        </CardContent>
      </Card>

      {/* Provider Configuration */}
      <Card className="bg-panel border-border-0">
        <CardHeader>
          <CardTitle className="text-text0 flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            AI Provider Configuration
          </CardTitle>
          <CardDescription className="text-text1">
            Configure API keys and models for different AI providers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(Object.keys(PROVIDER_NAMES) as AIProvider[]).map((provider) => {
            const providerConfig = settings.providers[provider]
            const hasKey = providerConfig.apiKey && providerConfig.apiKey !== "***" && providerConfig.apiKey.length > 0

            return (
              <div key={provider} className="space-y-3 p-4 rounded-lg border border-border-0 bg-bg1">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-text0 font-medium">{PROVIDER_NAMES[provider]}</h4>
                    <p className="text-text2 text-xs">
                      {providerConfig.enabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={providerConfig.enabled}
                      onChange={(e) => {
                        const newSettings = {
                          ...settings,
                          providers: {
                            ...settings.providers,
                            [provider]: {
                              ...providerConfig,
                              enabled: e.target.checked,
                            },
                          },
                        }
                        setSettings(newSettings)
                        updateSettings(newSettings)
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-border-0 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accentBlue"></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-text1 text-sm">API Key</label>
                  <div className="flex gap-2">
                    <Input
                      type={showKeys[provider] ? "text" : "password"}
                      defaultValue=""
                      placeholder={hasKey ? "Paste new API key to update" : `Enter ${PROVIDER_NAMES[provider]} API key`}
                      onBlur={(e) => {
                        const input = e.target as HTMLInputElement
                        const newKey = input?.value?.trim() || ""
                        if (newKey.length > 0) {
                          console.log(`[AISettings] Updating ${provider} API key, length: ${newKey.length}`)
                          updateProviderKey(provider, newKey)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur()
                        }
                      }}
                      onChange={(e) => {
                        // Handle changes - save on blur or Enter
                        // The actual save happens in onBlur
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setShowKeys({ ...showKeys, [provider]: !showKeys[provider] })
                      }
                    >
                      {showKeys[provider] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {hasKey && (
                    <p className="text-xs text-text2">
                      API key is configured. Paste a new key above to update it.
                    </p>
                  )}
                </div>

                {providerConfig.defaultModel && (
                  <div className="space-y-2">
                    <label className="text-text1 text-sm">Default Model</label>
                    <select
                      value={providerConfig.defaultModel}
                      onChange={(e) => {
                        const newSettings = {
                          ...settings,
                          providers: {
                            ...settings.providers,
                            [provider]: {
                              ...providerConfig,
                              defaultModel: e.target.value,
                            },
                          },
                        }
                        setSettings(newSettings)
                        updateSettings(newSettings)
                      }}
                      className="w-full h-10 rounded-md border border-border-0 bg-bg0 px-3 text-text0 text-sm focus:outline-none focus:ring-2 focus:ring-accentBlue"
                    >
                      {DEFAULT_MODELS[provider].map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card className="bg-panel border-border-0">
        <CardHeader>
          <CardTitle className="text-text0 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Feature Toggles
          </CardTitle>
          <CardDescription className="text-text1">
            Enable or disable specific AI features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(FEATURE_NAMES) as AIFeature[]).map((feature) => (
            <div
              key={feature}
              className="flex items-center justify-between p-3 rounded-lg border border-border-0 bg-bg1"
            >
              <div>
                <p className="text-text0 text-sm font-medium">{FEATURE_NAMES[feature]}</p>
                <p className="text-text2 text-xs">
                  {settings.modelPreferences[feature]?.provider} / {settings.modelPreferences[feature]?.model}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.featureToggles[feature]}
                  onChange={(e) => {
                    const newSettings = {
                      ...settings,
                      featureToggles: {
                        ...settings.featureToggles,
                        [feature]: e.target.checked,
                      },
                    }
                    setSettings(newSettings)
                    updateSettings(newSettings)
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-border-0 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accentBlue"></div>
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Feature Throttling */}
      <Card className="bg-panel border-border-0">
        <CardHeader>
          <CardTitle className="text-text0">Feature Throttling</CardTitle>
          <CardDescription className="text-text1">
            Set token limits per feature to control costs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(Object.keys(FEATURE_NAMES) as AIFeature[]).map((feature) => {
            const throttle = settings.featureThrottles[feature]

            return (
              <div
                key={feature}
                className="p-4 rounded-lg border border-border-0 bg-bg1 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-text0 text-sm font-medium">{FEATURE_NAMES[feature]}</p>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={throttle.enabled}
                      onChange={(e) => {
                        const newSettings = {
                          ...settings,
                          featureThrottles: {
                            ...settings.featureThrottles,
                            [feature]: {
                              ...throttle,
                              enabled: e.target.checked,
                            },
                          },
                        }
                        setSettings(newSettings)
                        updateSettings(newSettings)
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-border-0 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accentBlue"></div>
                  </label>
                </div>

                {throttle.enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-text1 text-xs block mb-1">Max Tokens/Day</label>
                      <Input
                        type="number"
                        value={throttle.maxTokensPerDay || ""}
                        placeholder="Unlimited"
                        onChange={(e) => {
                          const newSettings = {
                            ...settings,
                            featureThrottles: {
                              ...settings.featureThrottles,
                              [feature]: {
                                ...throttle,
                                maxTokensPerDay: e.target.value ? parseInt(e.target.value, 10) : undefined,
                              },
                            },
                          }
                          setSettings(newSettings)
                          updateSettings(newSettings)
                        }}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-text1 text-xs block mb-1">Max Tokens/Hour</label>
                      <Input
                        type="number"
                        value={throttle.maxTokensPerHour || ""}
                        placeholder="Unlimited"
                        onChange={(e) => {
                          const newSettings = {
                            ...settings,
                            featureThrottles: {
                              ...settings.featureThrottles,
                              [feature]: {
                                ...throttle,
                                maxTokensPerHour: e.target.value ? parseInt(e.target.value, 10) : undefined,
                              },
                            },
                          }
                          setSettings(newSettings)
                          updateSettings(newSettings)
                        }}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
