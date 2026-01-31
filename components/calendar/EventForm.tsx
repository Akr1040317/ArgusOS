"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Save, Trash2, Loader2, Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"

interface CalendarAccount {
  accountId: string
  email: string
}

interface Calendar {
  id: string
  summary: string
  primary?: boolean
}

interface EventFormProps {
  open: boolean
  onClose: () => void
  eventId?: string
  initialData?: {
    title: string
    description?: string
    startISO: string
    endISO: string
    location?: string
    attendees: Array<{ email: string; name?: string }>
  }
  initialAccountId?: string
  initialCalendarId?: string
  onSaved?: () => void
  onDeleted?: () => void
}

export function EventForm({
  open,
  onClose,
  eventId,
  initialData,
  initialAccountId,
  initialCalendarId,
  onSaved,
  onDeleted,
}: EventFormProps) {
  const [user] = useAuthState(auth)
  const [calendarAccounts, setCalendarAccounts] = useState<CalendarAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>(initialAccountId || "")
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>(initialCalendarId || "primary")
  const [title, setTitle] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [startDate, setStartDate] = useState<string>("")
  const [startTime, setStartTime] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [endTime, setEndTime] = useState<string>("")
  const [allDay, setAllDay] = useState<boolean>(false)
  const [location, setLocation] = useState<string>("")
  const [attendees, setAttendees] = useState<Array<{ email: string; name?: string }>>([])
  const [attendeeInput, setAttendeeInput] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (open && user) {
      fetchCalendarAccounts()
      if (initialData) {
        setTitle(initialData.title)
        setDescription(initialData.description || "")
        setLocation(initialData.location || "")
        setAttendees(initialData.attendees || [])

        const start = new Date(initialData.startISO)
        const end = new Date(initialData.endISO)
        setStartDate(format(start, "yyyy-MM-dd"))
        setStartTime(format(start, "HH:mm"))
        setEndDate(format(end, "yyyy-MM-dd"))
        setEndTime(format(end, "HH:mm"))
        setAllDay(initialData.startISO.includes("T") === false)
      } else {
        // Default to today, 1 hour duration
        const now = new Date()
        const end = new Date(now.getTime() + 60 * 60 * 1000)
        setStartDate(format(now, "yyyy-MM-dd"))
        setStartTime(format(now, "HH:mm"))
        setEndDate(format(end, "yyyy-MM-dd"))
        setEndTime(format(end, "HH:mm"))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, initialData])

  const fetchCalendarAccounts = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/integrations/calendar/accounts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.accounts && data.accounts.length > 0) {
        setCalendarAccounts(data.accounts)
        setSelectedAccount(data.accounts[0].accountId)
        // Fetch calendars for the selected account
        await fetchCalendars(data.accounts[0].accountId)
      }
    } catch (error) {
      console.error("Error fetching calendar accounts:", error)
    }
  }

  const fetchCalendars = async (accountId: string) => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/calendar/calendars?accountId=${accountId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.calendars) {
        setCalendars(data.calendars)
        // Use initialCalendarId if provided, otherwise use primary calendar
        if (initialCalendarId && data.calendars.find((c: Calendar) => c.id === initialCalendarId)) {
          setSelectedCalendarId(initialCalendarId)
        } else {
          const primary = data.calendars.find((c: Calendar) => c.primary)
          if (primary) {
            setSelectedCalendarId(primary.id)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching calendars:", error)
    }
  }

  useEffect(() => {
    if (selectedAccount) {
      fetchCalendars(selectedAccount)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount])

  const addAttendee = () => {
    const trimmed = attendeeInput.trim()
    if (trimmed && !attendees.some((a) => a.email === trimmed)) {
      setAttendees([...attendees, { email: trimmed }])
      setAttendeeInput("")
    }
  }

  const removeAttendee = (email: string) => {
    setAttendees(attendees.filter((a) => a.email !== email))
  }

  const handleSave = async () => {
    if (!user || !selectedAccount || !title.trim()) {
      alert("Please fill in the title")
      return
    }

    if (!startDate || !endDate) {
      alert("Please select start and end dates")
      return
    }

    setSaving(true)
    try {
      const startISO = allDay
        ? new Date(startDate).toISOString()
        : new Date(`${startDate}T${startTime}`).toISOString()
      const endISO = allDay
        ? new Date(endDate).toISOString()
        : new Date(`${endDate}T${endTime}`).toISOString()

      const token = await user.getIdToken()
      const url = eventId ? "/api/calendar/events/update" : "/api/calendar/events/create"
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId: selectedAccount,
          calendarId: selectedCalendarId,
          eventId: eventId,
          title,
          description: description || undefined,
          startISO,
          endISO,
          location: location || undefined,
          attendees: attendees.length > 0 ? attendees : undefined,
          allDay,
        }),
      })

      const data = await response.json()
      if (data.success) {
        onSaved?.()
        onClose()
      } else {
        throw new Error(data.error || "Failed to save event")
      }
    } catch (error: any) {
      console.error("Error saving event:", error)
      alert(`Error saving event: ${error.message || "Unknown error"}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user || !selectedAccount || !eventId) return

    if (!confirm("Are you sure you want to delete this event?")) {
      return
    }

    setDeleting(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/calendar/events/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId: selectedAccount,
          calendarId: selectedCalendarId,
          eventId,
        }),
      })

      const data = await response.json()
      if (data.success) {
        onDeleted?.()
        onClose()
      } else {
        throw new Error(data.error || "Failed to delete event")
      }
    } catch (error: any) {
      console.error("Error deleting event:", error)
      alert(`Error deleting event: ${error.message || "Unknown error"}`)
    } finally {
      setDeleting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] bg-panel border border-border-0 rounded-lg shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-0">
          <h2 className="text-lg font-semibold text-text0">
            {eventId ? "Edit Event" : "New Event"}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Account Selection */}
          {calendarAccounts.length > 1 && (
            <div>
              <label className="text-xs text-text2 mb-1 block">Account</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full h-9 rounded-md border border-border-0 bg-bg0 px-3 text-text0 text-sm focus:outline-none focus:ring-2 focus:ring-accentBlue"
              >
                {calendarAccounts.map((account) => (
                  <option key={account.accountId} value={account.accountId}>
                    {account.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Calendar Selection */}
          {calendars.length > 1 && (
            <div>
              <label className="text-xs text-text2 mb-1 block">Calendar</label>
              <select
                value={selectedCalendarId}
                onChange={(e) => setSelectedCalendarId(e.target.value)}
                className="w-full h-9 rounded-md border border-border-0 bg-bg0 px-3 text-text0 text-sm focus:outline-none focus:ring-2 focus:ring-accentBlue"
              >
                {calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.summary}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-xs text-text2 mb-1 block">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="bg-bg0 border-border-0 text-text0"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-text2 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event description"
              rows={4}
              className="w-full rounded-md border border-border-0 bg-bg0 px-3 py-2 text-text0 text-sm focus:outline-none focus:ring-2 focus:ring-accentBlue resize-none"
            />
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded border-border-0"
            />
            <label htmlFor="allDay" className="text-sm text-text1">
              All day
            </label>
          </div>

          {/* Start Date/Time */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text2 mb-1 block">Start Date *</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-bg0 border-border-0 text-text0"
              />
            </div>
            {!allDay && (
              <div>
                <label className="text-xs text-text2 mb-1 block">Start Time</label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-bg0 border-border-0 text-text0"
                />
              </div>
            )}
          </div>

          {/* End Date/Time */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text2 mb-1 block">End Date *</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-bg0 border-border-0 text-text0"
              />
            </div>
            {!allDay && (
              <div>
                <label className="text-xs text-text2 mb-1 block">End Time</label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-bg0 border-border-0 text-text0"
                />
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="text-xs text-text2 mb-1 block">Location</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Event location"
              className="bg-bg0 border-border-0 text-text0"
            />
          </div>

          {/* Attendees */}
          <div>
            <label className="text-xs text-text2 mb-1 block">Attendees</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {attendees.map((attendee) => (
                <span
                  key={attendee.email}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-accentPurple/10 text-accentPurple text-sm"
                >
                  {attendee.name || attendee.email}
                  <button
                    onClick={() => removeAttendee(attendee.email)}
                    className="hover:text-accentPurple/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Attendee email (press Enter to add)"
                value={attendeeInput}
                onChange={(e) => setAttendeeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addAttendee()
                  }
                }}
                className="bg-bg0 border-border-0 text-text0"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addAttendee}
                className="border-border-0 text-text1"
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border-0">
          {eventId && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="border-red-400/50 text-red-400 hover:bg-red-400/10"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" onClick={onClose} className="border-border-0 text-text1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || deleting}
              className="bg-accentBlue hover:bg-accentBlue/90 text-bg0"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
