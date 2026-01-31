"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Mail, CheckCircle2, Calendar } from "lucide-react"

interface MetricsData {
  emailsProcessedToday: number
  tasksCompleted: number
  eventsToday: number
  eventsTomorrow: number
}

export function Metrics() {
  const [user] = useAuthState(auth)
  const [metrics, setMetrics] = useState<MetricsData>({
    emailsProcessedToday: 0,
    tasksCompleted: 0,
    eventsToday: 0,
    eventsTomorrow: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchMetrics = async () => {
      try {
        const token = await user.getIdToken()
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const dayAfter = new Date(tomorrow)
        dayAfter.setDate(dayAfter.getDate() + 1)

        // Fetch threads from today
        const threadsResponse = await fetch(
          `/api/integrations/gmail/threads?since=${today.toISOString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ).catch(() => null)

        // Fetch tasks
        const tasksResponse = await fetch("/api/tasks", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => null)

        // Fetch events
        const digestResponse = await fetch("/api/digest/compute", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => null)

        let emailsProcessedToday = 0
        let tasksCompleted = 0
        let eventsToday = 0
        let eventsTomorrow = 0

        if (digestResponse?.ok) {
          const digestData = await digestResponse.json()
          const latestDigest = digestData.digests?.[0]
          if (latestDigest) {
            eventsToday = latestDigest.upcomingMeetings?.length || 0
          }
        }

        // Estimate emails processed from digest
        if (digestResponse?.ok) {
          const digestData = await digestResponse.json()
          const latestDigest = digestData.digests?.[0]
          if (latestDigest) {
            emailsProcessedToday =
              (latestDigest.importantNew?.length || 0) +
              (latestDigest.needsReplyOverdue?.length || 0) +
              (latestDigest.followUpsDue?.length || 0)
          }
        }

        setMetrics({
          emailsProcessedToday,
          tasksCompleted,
          eventsToday,
          eventsTomorrow: 0, // Would need separate fetch
        })
      } catch (error) {
        console.error("Error fetching metrics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [user])

  if (loading) {
    return (
      <Card className="bg-panel border-border-0">
        <CardHeader>
          <CardTitle className="text-text0 text-sm">Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text2 text-xs">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-panel border-border-0">
      <CardHeader>
        <CardTitle className="text-text0 text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accentBlue" />
          Today&apos;s Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-text2" />
            <span className="text-xs text-text2">Emails</span>
          </div>
          <span className="text-sm font-semibold text-text0">{metrics.emailsProcessedToday}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-text2" />
            <span className="text-xs text-text2">Tasks</span>
          </div>
          <span className="text-sm font-semibold text-text0">{metrics.tasksCompleted}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-text2" />
            <span className="text-xs text-text2">Events Today</span>
          </div>
          <span className="text-sm font-semibold text-text0">{metrics.eventsToday}</span>
        </div>
      </CardContent>
    </Card>
  )
}
