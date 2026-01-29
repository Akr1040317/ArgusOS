"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/client"
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase/client"
import { AlertCircle, Mail, Clock, Calendar, FileText, CheckCircle2, TrendingUp, ArrowRight, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import Link from "next/link"

interface DigestItem {
  threadId?: string
  eventId?: string
  blurb: string
}

interface Digest {
  id: string
  runAt: { seconds: number; nanoseconds: number }
  importantNew: DigestItem[]
  needsReplyOverdue: DigestItem[]
  followUpsDue: DigestItem[]
  upcomingMeetings: DigestItem[]
  prepGaps: DigestItem[]
  fullText: string
}

export function CommandCenter() {
  const [user] = useAuthState(auth)
  const [latestDigest, setLatestDigest] = useState<Digest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const digestsRef = collection(db, "digests", user.uid, "runs")
    const q = query(digestsRef, orderBy("runAt", "desc"), limit(1))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.docs.length > 0) {
          const doc = snapshot.docs[0]
          setLatestDigest({
            id: doc.id,
            ...doc.data(),
          } as Digest)
        } else {
          setLatestDigest(null)
        }
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching digest:", error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  if (loading) {
    return (
      <Card className="bg-panel border-border-0">
        <CardContent className="p-6">
          <div className="text-text2">Loading digest...</div>
        </CardContent>
      </Card>
    )
  }

  if (!latestDigest) {
    return (
      <Card className="bg-panel border-border-0">
        <CardHeader>
          <CardTitle className="text-text0">Command Center</CardTitle>
          <CardDescription className="text-text1">No digest available yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-text2 text-sm">
            Digests are generated hourly. The first digest will appear after the next hourly run.
          </p>
        </CardContent>
      </Card>
    )
  }

  const runAt = latestDigest.runAt?.seconds
    ? new Date(latestDigest.runAt.seconds * 1000)
    : new Date()

  const hasUrgentItems =
    latestDigest.needsReplyOverdue.length > 0 ||
    latestDigest.followUpsDue.length > 0 ||
    latestDigest.prepGaps.length > 0

  const totalItems =
    latestDigest.importantNew.length +
    latestDigest.needsReplyOverdue.length +
    latestDigest.followUpsDue.length +
    latestDigest.upcomingMeetings.length +
    latestDigest.prepGaps.length

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-accentBlue/20 to-accentBlue/5 border-accentBlue/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text2 mb-1">New Important</p>
                <p className="text-3xl font-bold text-text0">{latestDigest.importantNew.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-accentBlue/20 flex items-center justify-center">
                <Mail className="h-6 w-6 text-accentBlue" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/20 to-red-500/5 border-red-500/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text2 mb-1">Overdue Replies</p>
                <p className="text-3xl font-bold text-text0">{latestDigest.needsReplyOverdue.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-orange-500/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text2 mb-1">Follow-ups Due</p>
                <p className="text-3xl font-bold text-text0">{latestDigest.followUpsDue.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accentPurple/20 to-accentPurple/5 border-accentPurple/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text2 mb-1">Upcoming Meetings</p>
                <p className="text-3xl font-bold text-text0">{latestDigest.upcomingMeetings.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-accentPurple/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-accentPurple" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attention Banner */}
      {hasUrgentItems && (
        <Card className={cn("bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border-red-500/30 shadow-lg")}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-text0 mb-1">
                  {latestDigest.needsReplyOverdue.length + latestDigest.followUpsDue.length + latestDigest.prepGaps.length} Urgent Item{latestDigest.needsReplyOverdue.length + latestDigest.followUpsDue.length + latestDigest.prepGaps.length !== 1 ? "s" : ""} Need Attention
                </p>
                <div className="flex flex-wrap gap-3 mt-2">
                  {latestDigest.needsReplyOverdue.length > 0 && (
                    <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-medium border border-red-500/30">
                      {latestDigest.needsReplyOverdue.length} Overdue Reply{latestDigest.needsReplyOverdue.length !== 1 ? "ies" : ""}
                    </span>
                  )}
                  {latestDigest.followUpsDue.length > 0 && (
                    <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-medium border border-orange-500/30">
                      {latestDigest.followUpsDue.length} Follow-up{latestDigest.followUpsDue.length !== 1 ? "s" : ""} Due
                    </span>
                  )}
                  {latestDigest.prepGaps.length > 0 && (
                    <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-medium border border-yellow-500/30">
                      {latestDigest.prepGaps.length} Prep Gap{latestDigest.prepGaps.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <Link href="/dashboard/inbox">
                <Button variant="outline" size="sm" className="border-red-500/30 text-red-300 hover:bg-red-500/20">
                  View Inbox
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Digest Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Important Emails */}
        {latestDigest.importantNew.length > 0 && (
          <Card className="bg-panel border-border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-accentBlue/20 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-accentBlue" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-text0">New Important Emails</CardTitle>
                    <CardDescription className="text-xs">{latestDigest.importantNew.length} new</CardDescription>
                  </div>
                </div>
                <Link href="/dashboard/inbox">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    View All
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {latestDigest.importantNew.slice(0, 4).map((item, idx) => (
                <Link
                  key={idx}
                  href={`/dashboard/inbox?thread=${item.threadId}`}
                  className="block p-3 rounded-lg bg-bg1 border border-border-0 hover:bg-bg0 hover:border-accentBlue/30 transition-all group"
                >
                  <p className="text-sm text-text1 line-clamp-2 group-hover:text-text0">{item.blurb}</p>
                </Link>
              ))}
              {latestDigest.importantNew.length > 4 && (
                <Link href="/dashboard/inbox">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-text2">
                    +{latestDigest.importantNew.length - 4} more
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Overdue Replies */}
        {latestDigest.needsReplyOverdue.length > 0 && (
          <Card className="bg-panel border-red-500/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-red-400">Overdue Replies</CardTitle>
                    <CardDescription className="text-xs">{latestDigest.needsReplyOverdue.length} overdue</CardDescription>
                  </div>
                </div>
                <Link href="/dashboard/inbox?filter=overdue">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-red-300 hover:text-red-200">
                    View All
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {latestDigest.needsReplyOverdue.slice(0, 4).map((item, idx) => (
                <Link
                  key={idx}
                  href={`/dashboard/inbox?thread=${item.threadId}`}
                  className="block p-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-all group"
                >
                  <p className="text-sm text-text1 line-clamp-2 group-hover:text-text0">{item.blurb}</p>
                </Link>
              ))}
              {latestDigest.needsReplyOverdue.length > 4 && (
                <Link href="/dashboard/inbox?filter=overdue">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-red-300">
                    +{latestDigest.needsReplyOverdue.length - 4} more
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Follow-ups Due */}
        {latestDigest.followUpsDue.length > 0 && (
          <Card className="bg-panel border-orange-500/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-orange-400">Follow-ups Due</CardTitle>
                    <CardDescription className="text-xs">{latestDigest.followUpsDue.length} pending</CardDescription>
                  </div>
                </div>
                <Link href="/dashboard/inbox?filter=followup">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-orange-300 hover:text-orange-200">
                    View All
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {latestDigest.followUpsDue.slice(0, 4).map((item, idx) => (
                <Link
                  key={idx}
                  href={`/dashboard/inbox?thread=${item.threadId}`}
                  className="block p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/15 transition-all group"
                >
                  <p className="text-sm text-text1 line-clamp-2 group-hover:text-text0">{item.blurb}</p>
                </Link>
              ))}
              {latestDigest.followUpsDue.length > 4 && (
                <Link href="/dashboard/inbox?filter=followup">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-orange-300">
                    +{latestDigest.followUpsDue.length - 4} more
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Meetings */}
        {latestDigest.upcomingMeetings.length > 0 && (
          <Card className="bg-panel border-accentPurple/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-accentPurple/20 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-accentPurple" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-text0">Upcoming Meetings</CardTitle>
                    <CardDescription className="text-xs">Next 24 hours</CardDescription>
                  </div>
                </div>
                <Link href="/dashboard/calendar">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    View Calendar
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {latestDigest.upcomingMeetings.slice(0, 4).map((item, idx) => (
                <Link
                  key={idx}
                  href={`/dashboard/calendar?event=${item.eventId}`}
                  className="block p-3 rounded-lg bg-bg1 border border-border-0 hover:bg-bg0 hover:border-accentPurple/30 transition-all group"
                >
                  <p className="text-sm text-text1 line-clamp-2 group-hover:text-text0">{item.blurb}</p>
                </Link>
              ))}
              {latestDigest.upcomingMeetings.length > 4 && (
                <Link href="/dashboard/calendar">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-text2">
                    +{latestDigest.upcomingMeetings.length - 4} more
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Prep Gaps */}
        {latestDigest.prepGaps.length > 0 && (
          <Card className="bg-panel border-yellow-500/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-yellow-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-yellow-400">Prep Gaps</CardTitle>
                    <CardDescription className="text-xs">{latestDigest.prepGaps.length} missing prep</CardDescription>
                  </div>
                </div>
                <Link href="/dashboard/calendar">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-yellow-300 hover:text-yellow-200">
                    View Calendar
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {latestDigest.prepGaps.slice(0, 4).map((item, idx) => (
                <Link
                  key={idx}
                  href={`/dashboard/calendar?event=${item.eventId}`}
                  className="block p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/15 transition-all group"
                >
                  <p className="text-sm text-text1 line-clamp-2 group-hover:text-text0">{item.blurb}</p>
                </Link>
              ))}
              {latestDigest.prepGaps.length > 4 && (
                <Link href="/dashboard/calendar">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-yellow-300">
                    +{latestDigest.prepGaps.length - 4} more
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* All Clear State */}
      {totalItems === 0 && (
        <Card className="bg-panel border-border-0">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-text0 mb-2">All Clear!</h3>
              <p className="text-text2 text-sm mb-4">No urgent items at this time.</p>
              <div className="flex items-center justify-center gap-2 text-xs text-text2">
                <Sparkles className="h-4 w-4" />
                <span>Last updated: {format(runAt, "MMM d, yyyy 'at' h:mm a")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer with last update time */}
      {totalItems > 0 && (
        <div className="text-center text-xs text-text2 flex items-center justify-center gap-2">
          <Clock className="h-3 w-3" />
          <span>Last updated: {format(runAt, "MMM d, yyyy 'at' h:mm a")}</span>
        </div>
      )}
    </div>
  )
}
