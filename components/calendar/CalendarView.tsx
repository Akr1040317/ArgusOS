"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/client"
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase/client"
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, startOfDay, startOfMonth, endOfMonth, startOfWeek as startWeek, endOfWeek as endWeek, isSameMonth } from "date-fns"
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Users, Mail, Copy, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface CalendarEvent {
  id: string
  title: string
  description?: string
  startISO: string
  endISO?: string
  location?: string
  attendees: Array<{ email: string; name?: string }>
  organizer?: { email: string; name?: string }
  prepPack?: {
    contextSummary: string
    openLoops: string[]
    suggestedAgenda: string[]
    relatedThreadIds: string[]
  }
  followUpDraft?: {
    subject: string
    text: string
    tone: string
    generatedAt: string
  }
}

export function CalendarView() {
  const [user] = useAuthState(auth)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  useEffect(() => {
    if (!user) return

    const now = new Date()
    // Fetch events from 30 days ago to 60 days ahead (covers month view + some buffer)
    const startRange = addDays(now, -30)
    const endRange = addDays(now, 60)
    const startOfRange = startOfDay(startRange).toISOString()
    const endOfRangeDate = endOfWeek(endRange).toISOString()

    const eventsRef = collection(db, "calendarEvents", user.uid, "events")
    const q = query(
      eventsRef,
      where("startISO", ">=", startOfRange),
      where("startISO", "<=", endOfRangeDate),
      orderBy("startISO", "asc")
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const eventData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as CalendarEvent[]
        setEvents(eventData)
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching events:", error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.startISO)
      return isSameDay(eventDate, day)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text2">Loading calendar...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-0">
        <div className="flex items-center gap-4">
          <Calendar className="h-5 w-5 text-accentBlue" />
          <h1 className="text-2xl font-bold text-text0">Calendar</h1>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("month")}
              className="h-8 text-xs"
            >
              Month
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("week")}
              className="h-8 text-xs"
            >
              Week
            </Button>
            <Button
              variant={viewMode === "day" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("day")}
              className="h-8 text-xs"
            >
              Day
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (viewMode === "month") {
                setCurrentDate(addDays(currentDate, -30))
              } else if (viewMode === "week") {
                setCurrentDate(addDays(currentDate, -7))
              } else {
                setCurrentDate(addDays(currentDate, -1))
              }
            }}
            className="h-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="h-8 text-xs"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (viewMode === "month") {
                setCurrentDate(addDays(currentDate, 30))
              } else if (viewMode === "week") {
                setCurrentDate(addDays(currentDate, 7))
              } else {
                setCurrentDate(addDays(currentDate, 1))
              }
            }}
            className="h-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden flex">
        {viewMode === "month" ? (
          <>
            {/* Month View */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Month Header */}
              <div className="p-4 border-b border-border-0">
                <h2 className="text-xl font-semibold text-text0">
                  {format(currentDate, "MMMM yyyy")}
                </h2>
              </div>
              
              {/* Day Headers */}
              <div className="grid grid-cols-7 border-b border-border-0">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="p-2 text-center text-xs font-semibold text-text2 border-r border-border-0 last:border-r-0"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Month Grid */}
              <div className="flex-1 grid grid-cols-7 overflow-y-auto">
                {(() => {
                  const monthStart = startOfMonth(currentDate)
                  const monthEnd = endOfMonth(currentDate)
                  const calendarStart = startWeek(monthStart, { weekStartsOn: 0 })
                  const calendarEnd = endWeek(monthEnd, { weekStartsOn: 0 })
                  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

                  return monthDays.map((day, idx) => {
                    const dayEvents = getEventsForDay(day)
                    const isToday = isSameDay(day, new Date())
                    const isPast = day < startOfDay(new Date())
                    const isCurrentMonth = isSameMonth(day, currentDate)
                    
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "border-r border-b border-border-0 p-1.5 min-h-[120px] flex flex-col",
                          idx % 7 === 0 && "border-l",
                          !isCurrentMonth && "bg-bg1/30"
                        )}
                      >
                        <div
                          className={cn(
                            "text-xs font-semibold mb-1",
                            isToday
                              ? "text-accentBlue font-bold"
                              : isPast
                              ? "text-text2/50"
                              : isCurrentMonth
                              ? "text-text2"
                              : "text-text2/30"
                          )}
                        >
                          {format(day, "d")}
                        </div>
                        <div className="flex-1 space-y-0.5 overflow-hidden">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className="p-1 rounded text-[10px] bg-accentBlue/10 border border-accentBlue/20 cursor-pointer hover:bg-accentBlue/20 transition-colors truncate"
                              title={event.title}
                            >
                              <div className="font-medium text-text0 truncate">{event.title}</div>
                              {event.startISO && (
                                <div className="text-text2 text-[9px] truncate">
                                  {format(new Date(event.startISO), "h:mm a")}
                                </div>
                              )}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div
                              onClick={() => {
                                // Switch to day view for this day
                                setCurrentDate(day)
                                setViewMode("day")
                              }}
                              className="text-[10px] text-text2 hover:text-accentBlue cursor-pointer p-0.5"
                            >
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          </>
        ) : viewMode === "week" ? (
          <>
            {/* Week View */}
            <div className="flex-1 grid grid-cols-7 overflow-y-auto">
              {weekDays.map((day, idx) => {
                const dayEvents = getEventsForDay(day)
                const isToday = isSameDay(day, new Date())
                const isPast = day < startOfDay(new Date())
                return (
                  <div
                    key={idx}
                    className={cn(
                      "border-r border-border-0 p-2 min-h-[200px]",
                      idx === 0 && "border-l"
                    )}
                  >
                    <div
                      className={cn(
                        "text-xs font-semibold mb-2",
                        isToday ? "text-accentBlue" : isPast ? "text-text2/50" : "text-text2"
                      )}
                    >
                      {format(day, "EEE M/d")}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 5).map((event) => (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className="p-1.5 rounded text-xs bg-accentBlue/10 border border-accentBlue/20 cursor-pointer hover:bg-accentBlue/20 transition-colors"
                        >
                          <div className="font-medium text-text0 truncate">{event.title}</div>
                          {event.startISO && (
                            <div className="text-text2 text-xs">
                              {format(new Date(event.startISO), "h:mm a")}
                            </div>
                          )}
                        </div>
                      ))}
                      {dayEvents.length > 5 && (
                        <div className="text-xs text-text2 p-1">
                          +{dayEvents.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <>
            {/* Day View */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-text0">
                  {format(currentDate, "EEEE, MMMM d, yyyy")}
                </h2>
              </div>
              <div className="space-y-3">
                {getEventsForDay(currentDate).map((event) => (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="p-4 rounded-lg border border-border-0 bg-bg1 cursor-pointer hover:bg-bg0 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-text0">{event.title}</h3>
                      {event.startISO && (
                        <div className="flex items-center gap-1 text-xs text-text2">
                          <Clock className="h-3 w-3" />
                          {format(new Date(event.startISO), "h:mm a")}
                          {event.endISO && ` - ${format(new Date(event.endISO), "h:mm a")}`}
                        </div>
                      )}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1 text-xs text-text2 mb-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </div>
                    )}
                    {event.attendees.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-text2">
                        <Users className="h-3 w-3" />
                        {event.attendees.slice(0, 3).map((a) => a.name || a.email).join(", ")}
                        {event.attendees.length > 3 && ` +${event.attendees.length - 3} more`}
                      </div>
                    )}
                  </div>
                ))}
                {getEventsForDay(currentDate).length === 0 && (
                  <div className="text-center text-text2 py-8">No events scheduled</div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Event Detail Panel */}
        {selectedEvent && (
          <div className="w-96 border-l border-border-0 bg-panel overflow-y-auto">
            <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
          </div>
        )}
      </div>
    </div>
  )
}

function EventDetailPanel({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const [user] = useAuthState(auth)
  const [generatingPrepPack, setGeneratingPrepPack] = useState(false)
  const [generatingFollowUp, setGeneratingFollowUp] = useState(false)

  const handleGeneratePrepPack = async () => {
    if (!user || generatingPrepPack) return

    setGeneratingPrepPack(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/calendar/prep-pack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid: user.uid,
          eventId: event.id,
        }),
      })

      const data = await response.json()
      if (!data.success) {
        console.error("Failed to generate prep pack:", data.error)
        alert(`Failed to generate prep pack: ${data.error}`)
      } else {
        // Reload page to show updated prep pack
        window.location.reload()
      }
    } catch (error: any) {
      console.error("Error generating prep pack:", error)
      alert(`Error: ${error.message}`)
    } finally {
      setGeneratingPrepPack(false)
    }
  }

  const handleGenerateFollowUp = async () => {
    if (!user || generatingFollowUp) return

    setGeneratingFollowUp(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/calendar/follow-up-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid: user.uid,
          eventId: event.id,
        }),
      })

      const data = await response.json()
      if (!data.success) {
        console.error("Failed to generate follow-up draft:", data.error)
        alert(`Failed to generate follow-up draft: ${data.error}`)
      } else {
        // Reload page to show updated draft
        window.location.reload()
      }
    } catch (error: any) {
      console.error("Error generating follow-up draft:", error)
      alert(`Error: ${error.message}`)
    } finally {
      setGeneratingFollowUp(false)
    }
  }

  const handleCopyFollowUp = () => {
    if (!event.followUpDraft) return
    const draftText = `Subject: ${event.followUpDraft.subject}\n\n${event.followUpDraft.text}`
    navigator.clipboard.writeText(draftText)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-text0">{event.title}</h2>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
          ×
        </Button>
      </div>

      <div className="space-y-4">
        {event.startISO && (
          <div>
            <div className="flex items-center gap-2 text-sm text-text2 mb-1">
              <Clock className="h-4 w-4" />
              <span>
                {format(new Date(event.startISO), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                {event.endISO && ` - ${format(new Date(event.endISO), "h:mm a")}`}
              </span>
            </div>
          </div>
        )}

        {event.location && (
          <div>
            <div className="flex items-center gap-2 text-sm text-text2">
              <MapPin className="h-4 w-4" />
              <span>{event.location}</span>
            </div>
          </div>
        )}

        {event.attendees.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-text0 mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Attendees
            </h3>
            <div className="space-y-1">
              {event.attendees.map((attendee, idx) => (
                <div key={idx} className="text-sm text-text1">
                  {attendee.name || attendee.email}
                </div>
              ))}
            </div>
          </div>
        )}

        {event.description && (
          <div>
            <h3 className="text-sm font-semibold text-text0 mb-2">Description</h3>
            <p className="text-sm text-text1 whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {/* Prep Pack Section */}
        <div className="border-t border-border-0 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text0">Prep Pack</h3>
            {!event.prepPack && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGeneratePrepPack}
                disabled={generatingPrepPack}
                className="h-7 text-xs"
              >
                {generatingPrepPack ? "Generating..." : "Generate"}
              </Button>
            )}
          </div>

          {event.prepPack ? (
            <div className="space-y-3">
              {event.prepPack.contextSummary && (
                <div>
                  <h4 className="text-xs font-semibold text-text0 mb-1">Context</h4>
                  <p className="text-xs text-text1">{event.prepPack.contextSummary}</p>
                </div>
              )}

              {event.prepPack.openLoops.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-text0 mb-1">Open Loops</h4>
                  <ul className="space-y-1 text-xs text-text1">
                    {event.prepPack.openLoops.map((loop, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-orange-400 mt-1">•</span>
                        <span>{loop}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {event.prepPack.suggestedAgenda.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-text0 mb-1">Suggested Agenda</h4>
                  <ul className="space-y-1 text-xs text-text1">
                    {event.prepPack.suggestedAgenda.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-accentBlue mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {event.prepPack.relatedThreadIds.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-text0 mb-1">
                    Related Threads ({event.prepPack.relatedThreadIds.length})
                  </h4>
                  <p className="text-xs text-text2">
                    {event.prepPack.relatedThreadIds.length} email thread{event.prepPack.relatedThreadIds.length !== 1 ? "s" : ""} found
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-text2">No prep pack generated yet. Click Generate to create one.</p>
          )}
        </div>

        {/* Follow-up Draft Section */}
        <div className="border-t border-border-0 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text0">Follow-up Email</h3>
            {!event.followUpDraft && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateFollowUp}
                disabled={generatingFollowUp}
                className="h-7 text-xs"
              >
                {generatingFollowUp ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Mail className="h-3 w-3 mr-1" />
                    Generate Draft
                  </>
                )}
              </Button>
            )}
          </div>

          {event.followUpDraft ? (
            <div className="space-y-2">
              <div className="text-xs text-text2">
                <span className="font-semibold">Subject: </span>
                {event.followUpDraft.subject}
              </div>
              <div className="p-3 rounded-lg bg-bg1 border border-border-0 text-sm text-text1 whitespace-pre-wrap">
                {event.followUpDraft.text}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyFollowUp}
                  className="h-7 text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateFollowUp}
                  disabled={generatingFollowUp}
                  className="h-7 text-xs"
                >
                  {generatingFollowUp ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Mail className="h-3 w-3 mr-1" />
                      Regenerate
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-text2">
              Generate a follow-up email draft to send after the meeting.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
