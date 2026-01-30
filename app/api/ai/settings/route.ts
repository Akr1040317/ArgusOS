import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { getAISettings, updateAISettings, updateProviderKey } from "@/lib/ai/settings"
import { AISettings, AIProvider } from "@/lib/ai/providers/types"

/**
 * GET /api/ai/settings - Get AI settings for current user
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const settings = await getAISettings(uid)

    // Don't expose API keys in response - only show if they're set
    const safeSettings = {
      ...settings,
      providers: Object.entries(settings.providers).reduce((acc, [key, config]) => {
        acc[key] = {
          ...config,
          apiKey: config.apiKey ? "***" : "", // Mask API keys
        }
        return acc
      }, {} as Record<string, any>),
    }

    return NextResponse.json({ success: true, settings: safeSettings })
  } catch (error: any) {
    console.error("Error getting AI settings:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/ai/settings - Update AI settings
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const body = await request.json()
    const { updates, provider, apiKey } = body

    if (provider && apiKey !== undefined) {
      // Update provider API key
      await updateProviderKey(uid, provider as AIProvider, apiKey)
      return NextResponse.json({ success: true })
    }

    if (updates) {
      // Update settings
      await updateAISettings(uid, updates as Partial<AISettings>)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  } catch (error: any) {
    console.error("Error updating AI settings:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
