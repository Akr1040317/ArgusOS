"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, RefreshCw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function AIBrief() {
  const [user] = useAuthState(auth)
  const [brief, setBrief] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBrief = async (isRefresh = false) => {
    if (!user) return

    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/dashboard/brief", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setBrief(data.brief)
        // Cache in localStorage for 15 minutes
        localStorage.setItem(
          "dashboard-brief",
          JSON.stringify({
            brief: data.brief,
            timestamp: Date.now(),
          })
        )
      } else {
        // Check if it's an API key error
        const errorMsg = data.error || "Failed to generate brief"
        if (errorMsg.includes("API key") || errorMsg.includes("401")) {
          throw new Error("Invalid API key. Please check your AI settings and ensure your OpenAI API key is correct.")
        }
        throw new Error(errorMsg)
      }
    } catch (err: any) {
      console.error("Error fetching brief:", err)
      setError(err.message || "Failed to load brief")
      // Try to use cached brief if available
      const cached = localStorage.getItem("dashboard-brief")
      if (cached) {
        try {
          const cachedData = JSON.parse(cached)
          // Use cache if less than 30 minutes old
          if (Date.now() - cachedData.timestamp < 30 * 60 * 1000) {
            setBrief(cachedData.brief)
            setError(null)
          }
        } catch (e) {
          // Ignore cache parse errors
        }
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!user) return
    
    // Check for cached brief first
    const cached = localStorage.getItem("dashboard-brief")
    if (cached) {
      try {
        const cachedData = JSON.parse(cached)
        // Use cache if less than 15 minutes old
        if (Date.now() - cachedData.timestamp < 15 * 60 * 1000) {
          setBrief(cachedData.brief)
          setLoading(false)
          // Still fetch fresh in background
          fetchBrief(false)
          return
        }
      } catch (e) {
        // Ignore cache parse errors
      }
    }

    fetchBrief(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (loading && !brief) {
    return (
      <Card className="bg-gradient-to-br from-accentBlue/10 via-accentPurple/5 to-transparent border-accentBlue/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-accentBlue" />
            <p className="text-text2 text-sm">Generating your personalized brief...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !brief) {
    return (
      <Card className="bg-panel border-border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-text2 text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchBrief(true)}
              className="h-8"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-accentBlue/10 via-accentPurple/5 to-transparent border-accentBlue/20 shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-accentBlue/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-accentBlue" />
              </div>
              <h3 className="text-lg font-semibold text-text0">Your Brief</h3>
            </div>
            {brief ? (
              <p className="text-text1 text-base leading-relaxed whitespace-pre-wrap">{brief}</p>
            ) : (
              <p className="text-text2 text-sm">No brief available</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchBrief(true)}
            disabled={refreshing}
            className="h-8 w-8 p-0 flex-shrink-0"
            title="Refresh brief"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin text-text2" />
            ) : (
              <RefreshCw className="h-4 w-4 text-text2" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
