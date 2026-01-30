"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Mail, Calendar, Clock, ArrowRight, FileText } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface UrgentThread {
  threadId: string
  subject: string
  priority: string
  lastInboundAt: string | null
  extractedAsk?: string
  summaryBullets?: string[]
}

interface UpcomingEvent {
  eventId: string
  title: string
  startISO: string
  hasPrepPack: boolean
}

export function TodaysFocus() {
  const [user] = useAuthState(auth)
  const router = useRouter()
  const [urgentThreads, setUrgentThreads] = useState<UrgentThread[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchFocusItems = async () => {
      try {
        const token = await user.getIdToken()

        // Fetch tasks to get urgent threads
        const tasksResponse = await fetch("/api/tasks", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json()
          // Filter for P0/P1 reply tasks
          const urgent = (tasksData.replyTasks || [])
            .filter((t: any) => t.priority === "P0" || t.priority === "P1")
            .slice(0, 5)
            .map((t: any) => ({
              threadId: t.threadId,
              subject: t.subject,
              priority: t.priority,
              lastInboundAt: t.lastInboundAt,
              extractedAsk: t.extractedAsk,
              summaryBullets: t.summaryBullets,
            }))
          setUrgentThreads(urgent)
        }

        // Fetch upcoming events from digest
        const digestResponse = await fetch("/api/digest/compute", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (digestResponse.ok) {
          const digestData = await digestResponse.json()
          const events = (digestData.digests?.[0]?.upcomingMeetings || [])
            .slice(0, 3)
            .map((item: any) => ({
              eventId: item.eventId,
              title: item.blurb.split(" - ")[0] || "Meeting",
              startISO: item.startISO || "",
              hasPrepPack: false, // Would need to check event directly
            }))
          setUpcomingEvents(events)
        }
      } catch (error) {
        console.error("Error fetching focus items:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFocusItems()
  }, [user])

  if (loading) {
    return (
      <Card className="bg-panel border-border-0">
        <CardHeader>
          <CardTitle className="text-text0">Today's Focus</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text2 text-sm">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  const hasItems = urgentThreads.length > 0 || upcomingEvents.length > 0

  if (!hasItems) {
    return (
      <Card className="bg-panel border-border-0">
        <CardHeader>
          <CardTitle className="text-text0">Today's Focus</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
              <ArrowRight className="h-6 w-6 text-green-400" />
            </div>
            <p className="text-text1 text-sm mb-1">All clear!</p>
            <p className="text-text2 text-xs">No urgent items requiring immediate attention.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-panel border-border-0">
      <CardHeader>
        <CardTitle className="text-text0 flex items-center gap-2">
          <Clock className="h-5 w-5 text-accentBlue" />
          Today's Focus
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Urgent Threads */}
        {urgentThreads.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text0 mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              Urgent Replies Needed ({urgentThreads.length})
            </h4>
            <div className="space-y-2">
              {urgentThreads.map((thread) => {
                const hoursAgo = thread.lastInboundAt
                  ? Math.floor(
                      (Date.now() - new Date(thread.lastInboundAt).getTime()) / (1000 * 60 * 60)
                    )
                  : 0

                return (
                  <Link
                    key={thread.threadId}
                    href={`/dashboard/inbox?thread=${thread.threadId}`}
                    className="block p-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-xs font-medium",
                              thread.priority === "P0"
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                            )}
                          >
                            {thread.priority}
                          </span>
                          <span className="text-xs text-text2">{hoursAgo}h ago</span>
                        </div>
                        <p className="text-sm text-text1 font-medium line-clamp-1 group-hover:text-text0">
                          {thread.subject}
                        </p>
                        {thread.extractedAsk && (
                          <p className="text-xs text-text2 mt-1 line-clamp-1">{thread.extractedAsk}</p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-text2 group-hover:text-accentBlue flex-shrink-0 mt-1" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text0 mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accentPurple" />
              Upcoming Today ({upcomingEvents.length})
            </h4>
            <div className="space-y-2">
              {upcomingEvents.map((event) => (
                <Link
                  key={event.eventId}
                  href={`/dashboard/calendar?event=${event.eventId}`}
                  className="block p-3 rounded-lg bg-bg1 border border-border-0 hover:bg-bg0 hover:border-accentPurple/30 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {event.hasPrepPack ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Prep Ready
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                            Needs Prep
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text1 font-medium line-clamp-1 group-hover:text-text0">
                        {event.title}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-text2 group-hover:text-accentPurple flex-shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
