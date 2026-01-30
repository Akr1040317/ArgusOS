import { adminDb } from "@/lib/firebase/admin"
import { TokenUsage, AIFeature } from "./providers/types"
import { FieldValue } from "firebase-admin/firestore"

/**
 * Track token usage for a specific feature
 */
export async function trackTokenUsage(
  uid: string,
  usage: TokenUsage
): Promise<void> {
  try {
    // Store individual usage record
    await adminDb
      .collection("tokenUsage")
      .doc(uid)
      .collection("records")
      .add({
        ...usage,
        timestamp: FieldValue.serverTimestamp(),
      })

    // Update daily aggregate
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayKey = today.toISOString().split("T")[0]

    const dailyRef = adminDb
      .collection("tokenUsage")
      .doc(uid)
      .collection("daily")
      .doc(todayKey)

    const dailyDoc = await dailyRef.get()
    const dailyData = dailyDoc.data() || {
      date: todayKey,
      totalTokens: 0,
      totalCost: 0,
      byFeature: {} as Record<AIFeature, { tokens: number; cost: number; count: number }>,
      byProvider: {} as Record<string, { tokens: number; cost: number; count: number }>,
    }

    // Update totals
    dailyData.totalTokens = (dailyData.totalTokens || 0) + usage.totalTokens
    dailyData.totalCost = (dailyData.totalCost || 0) + (usage.cost || 0)

    // Update by feature
    if (!dailyData.byFeature[usage.feature]) {
      dailyData.byFeature[usage.feature] = { tokens: 0, cost: 0, count: 0 }
    }
    dailyData.byFeature[usage.feature].tokens += usage.totalTokens
    dailyData.byFeature[usage.feature].cost += usage.cost || 0
    dailyData.byFeature[usage.feature].count += 1

    // Update by provider
    const providerKey = `${usage.provider}:${usage.model}`
    if (!dailyData.byProvider[providerKey]) {
      dailyData.byProvider[providerKey] = { tokens: 0, cost: 0, count: 0 }
    }
    dailyData.byProvider[providerKey].tokens += usage.totalTokens
    dailyData.byProvider[providerKey].cost += usage.cost || 0
    dailyData.byProvider[providerKey].count += 1

    await dailyRef.set(dailyData, { merge: true })
  } catch (error) {
    console.error("Error tracking token usage:", error)
    // Don't throw - token tracking shouldn't break the main flow
  }
}

/**
 * Get token usage for a date range
 */
export async function getTokenUsage(
  uid: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalTokens: number
  totalCost: number
  byFeature: Record<AIFeature, { tokens: number; cost: number; count: number }>
  byProvider: Record<string, { tokens: number; cost: number; count: number }>
  dailyBreakdown: Array<{
    date: string
    tokens: number
    cost: number
  }>
}> {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  const dailyDocs = await adminDb
    .collection("tokenUsage")
    .doc(uid)
    .collection("daily")
    .where("date", ">=", start.toISOString().split("T")[0])
    .where("date", "<=", end.toISOString().split("T")[0])
    .get()

  let totalTokens = 0
  let totalCost = 0
  const byFeature: Record<string, { tokens: number; cost: number; count: number }> = {}
  const byProvider: Record<string, { tokens: number; cost: number; count: number }> = {}
  const dailyBreakdown: Array<{ date: string; tokens: number; cost: number }> = []

  dailyDocs.forEach((doc) => {
    const data = doc.data()
    totalTokens += data.totalTokens || 0
    totalCost += data.totalCost || 0

    dailyBreakdown.push({
      date: data.date,
      tokens: data.totalTokens || 0,
      cost: data.totalCost || 0,
    })

    // Aggregate by feature
    Object.entries(data.byFeature || {}).forEach(([feature, stats]: [string, any]) => {
      if (!byFeature[feature]) {
        byFeature[feature] = { tokens: 0, cost: 0, count: 0 }
      }
      byFeature[feature].tokens += stats.tokens || 0
      byFeature[feature].cost += stats.cost || 0
      byFeature[feature].count += stats.count || 0
    })

    // Aggregate by provider
    Object.entries(data.byProvider || {}).forEach(([provider, stats]: [string, any]) => {
      if (!byProvider[provider]) {
        byProvider[provider] = { tokens: 0, cost: 0, count: 0 }
      }
      byProvider[provider].tokens += stats.tokens || 0
      byProvider[provider].cost += stats.cost || 0
      byProvider[provider].count += stats.count || 0
    })
  })

  return {
    totalTokens,
    totalCost,
    byFeature: byFeature as Record<AIFeature, { tokens: number; cost: number; count: number }>,
    byProvider,
    dailyBreakdown: dailyBreakdown.sort((a, b) => a.date.localeCompare(b.date)),
  }
}

/**
 * Check if feature should be throttled
 */
export async function checkThrottle(
  uid: string,
  feature: AIFeature,
  throttleConfig: { enabled: boolean; maxTokensPerDay?: number; maxTokensPerHour?: number }
): Promise<{ allowed: boolean; reason?: string }> {
  if (!throttleConfig.enabled) {
    return { allowed: true }
  }

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const hourStart = new Date(now)
  hourStart.setMinutes(0, 0, 0)

  // Check daily limit
  if (throttleConfig.maxTokensPerDay) {
    const todayUsage = await getTokenUsage(uid, todayStart, now)
    const featureUsage = todayUsage.byFeature[feature]?.tokens || 0
    if (featureUsage >= throttleConfig.maxTokensPerDay) {
      return {
        allowed: false,
        reason: `Daily limit reached (${featureUsage}/${throttleConfig.maxTokensPerDay} tokens)`,
      }
    }
  }

  // Check hourly limit
  if (throttleConfig.maxTokensPerHour) {
    const hourUsage = await getTokenUsage(uid, hourStart, now)
    const featureUsage = hourUsage.byFeature[feature]?.tokens || 0
    if (featureUsage >= throttleConfig.maxTokensPerHour) {
      return {
        allowed: false,
        reason: `Hourly limit reached (${featureUsage}/${throttleConfig.maxTokensPerHour} tokens)`,
      }
    }
  }

  return { allowed: true }
}
