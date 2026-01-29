"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Mail, CheckCircle2, Loader2, X, RefreshCw, Calendar } from "lucide-react"
import { useRouter } from "next/navigation"

interface GmailAccount {
  accountId: string
  email: string
  status: string
  connectedAt: string
}

interface CalendarAccount {
  accountId: string
  email: string
  status: string
  connectedAt: string
}

export default function SettingsPage() {
  const [user] = useAuthState(auth)
  const router = useRouter()
  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([])
  const [calendarAccounts, setCalendarAccounts] = useState<CalendarAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingCalendarAccounts, setLoadingCalendarAccounts] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [syncingCalendar, setSyncingCalendar] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)

  useEffect(() => {
    // Check URL params for OAuth callback status
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const connected = params.get("connected")
      const error = params.get("error")
      
      if (connected === "gmail") {
        setSyncStatus("Gmail and Calendar connected successfully!")
        // Refresh accounts list
        fetchGmailAccounts()
        fetchCalendarAccounts()
        // Clean URL
        router.replace("/dashboard/settings")
      }
      if (error) {
        const details = params.get("details")
        const errorMsg = details ? decodeURIComponent(details) : error
        setSyncStatus(`Error: ${errorMsg}`)
        console.error("OAuth error:", error, details)
        router.replace("/dashboard/settings")
      }
    }
  }, [router])

  const fetchGmailAccounts = async () => {
    if (!user) return

    try {
      setLoadingAccounts(true)
      const token = await user.getIdToken()
      const response = await fetch("/api/integrations/gmail/accounts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.accounts) {
        setGmailAccounts(data.accounts)
      }
    } catch (error) {
      console.error("Error fetching Gmail accounts:", error)
    } finally {
      setLoadingAccounts(false)
    }
  }

  const fetchCalendarAccounts = async () => {
    if (!user) return

    try {
      setLoadingCalendarAccounts(true)
      const token = await user.getIdToken()
      const response = await fetch("/api/integrations/calendar/accounts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.accounts) {
        setCalendarAccounts(data.accounts)
      }
    } catch (error) {
      console.error("Error fetching Calendar accounts:", error)
    } finally {
      setLoadingCalendarAccounts(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchGmailAccounts()
      fetchCalendarAccounts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleConnectGmail = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/integrations/google/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error("Error connecting Gmail:", error)
      setSyncStatus("Failed to initiate Gmail connection")
    }
  }

  const handleSyncGmail = async (accountId: string) => {
    if (!user) return

    setSyncing(accountId)
    setSyncStatus(`Syncing ${accountId}...`)

    try {
      const token = await user.getIdToken()

      const response = await fetch("/api/gmail/sync-initial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId,
          days: 7,
          maxThreads: 500,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setSyncStatus(`Synced ${data.synced} threads from ${accountId} successfully!`)
        // Optionally start watch after sync
        // await handleStartWatch(accountId)
      } else {
        setSyncStatus(`Sync failed: ${data.error}`)
      }
    } catch (error: any) {
      console.error("Error syncing Gmail:", error)
      setSyncStatus(`Sync error: ${error.message}`)
    } finally {
      setSyncing(null)
    }
  }

  const handleStartWatch = async (accountId: string) => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      // Use the same topic for all accounts (they all push to the same webhook)
      // The webhook will identify the account from the emailAddress in the message
      const topicName = "gmail-watch-notifications"

      const response = await fetch("/api/gmail/watch/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId,
          topicName,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setSyncStatus(`Watch started for ${accountId}. New emails will appear automatically.`)
        fetchGmailAccounts() // Refresh to show watch status
      } else {
        setSyncStatus(`Failed to start watch: ${data.error}`)
      }
    } catch (error: any) {
      console.error("Error starting watch:", error)
      setSyncStatus(`Watch error: ${error.message}`)
    }
  }

  const handleDisconnectAccount = async (accountId: string) => {
    if (!user) return

    if (!confirm(`Are you sure you want to disconnect ${accountId}?`)) {
      return
    }

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/integrations/gmail/accounts?accountId=${encodeURIComponent(accountId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setSyncStatus(`Disconnected ${accountId}`)
        fetchGmailAccounts()
        fetchCalendarAccounts() // Calendar uses same account
      } else {
        setSyncStatus(`Failed to disconnect: ${data.error}`)
      }
    } catch (error: any) {
      console.error("Error disconnecting account:", error)
      setSyncStatus(`Error: ${error.message}`)
    }
  }

  const handleSyncCalendar = async (accountId: string) => {
    if (!user) return

    setSyncingCalendar(accountId)
    setSyncStatus(`Syncing calendar for ${accountId}...`)

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId,
          daysAhead: 14,
          maxEvents: 500,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setSyncStatus(`Synced ${data.synced} calendar events from ${accountId} successfully!`)
      } else {
        setSyncStatus(`Sync failed: ${data.error}`)
      }
    } catch (error: any) {
      console.error("Error syncing calendar:", error)
      setSyncStatus(`Sync error: ${error.message}`)
    } finally {
      setSyncingCalendar(null)
    }
  }

  const handleDisconnectCalendar = async (accountId: string) => {
    if (!user) return

    if (!confirm(`Are you sure you want to disconnect calendar for ${accountId}?`)) {
      return
    }

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/integrations/calendar/accounts?accountId=${encodeURIComponent(accountId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setSyncStatus(`Disconnected calendar for ${accountId}`)
        fetchCalendarAccounts()
      } else {
        setSyncStatus(`Failed to disconnect: ${data.error}`)
      }
    } catch (error: any) {
      console.error("Error disconnecting calendar account:", error)
      setSyncStatus(`Error: ${error.message}`)
    }
  }

  const handleRunAgent = async () => {
    if (!user || processingAI) return

    setProcessingAI(true)
    setSyncStatus("Running digest agent...")

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/digest/compute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: user.uid }),
      })

      const data = await response.json()
      if (data.success) {
        setSyncStatus(
          `Digest generated! Found: ${data.summary.importantNew} new important, ${data.summary.needsReplyOverdue} overdue, ${data.summary.followUpsDue} follow-ups, ${data.summary.upcomingMeetings} meetings, ${data.summary.prepGaps} prep gaps`
        )
      } else {
        setSyncStatus(`Error: ${data.error}`)
      }
    } catch (error: any) {
      console.error("Error running agent:", error)
      setSyncStatus(`Error: ${error.message}`)
    } finally {
      setProcessingAI(false)
    }
  }

  const [processingAI, setProcessingAI] = useState(false)
  const [aiStatus, setAiStatus] = useState<string | null>(null)

  const handleBulkProcessAI = async () => {
    if (!user) return

    if (!confirm("This will run AI classification on all emails from today. This may take a few minutes. Continue?")) {
      return
    }

    setProcessingAI(true)
    setAiStatus("Processing today's emails...")

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/ai/bulk-process-today", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: user.uid }),
      })

      const data = await response.json()
      if (data.success) {
        setAiStatus(data.message || "Processing complete!")
      } else {
        setAiStatus(`Error: ${data.error}`)
      }
    } catch (error: any) {
      console.error("Error processing AI:", error)
      setAiStatus(`Error: ${error.message}`)
    } finally {
      setProcessingAI(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text0">Settings</h1>
        <p className="text-text1 mt-2">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-panel border-border-0">
          <CardHeader>
            <CardTitle className="text-text0">Profile</CardTitle>
            <CardDescription className="text-text1">Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-text2">Email</p>
              <p className="text-text0">{user?.email || "Not available"}</p>
            </div>
            <div>
              <p className="text-sm text-text2">User ID</p>
              <p className="text-text0 font-mono text-xs">{user?.uid || "Not available"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-panel border-border-0">
          <CardHeader>
            <CardTitle className="text-text0 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Gmail Integration
            </CardTitle>
            <CardDescription className="text-text1">Connect and sync your Gmail accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingAccounts ? (
              <div className="text-text2 text-sm">Loading accounts...</div>
            ) : gmailAccounts.length === 0 ? (
              <div className="space-y-3">
                <p className="text-text2 text-sm">No Gmail accounts connected yet.</p>
                <Button
                  onClick={handleConnectGmail}
                  className="bg-accentBlue hover:bg-accentBlue/90 text-bg0"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Connect Gmail Account
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  {gmailAccounts.map((account) => (
                    <div
                      key={account.accountId}
                      className="flex items-center justify-between p-3 rounded-lg border border-border-0 bg-bg1"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-accentBlue" />
                        <div>
                          <p className="text-text0 font-medium text-sm">{account.email}</p>
                          <p className="text-text2 text-xs">
                            Connected {account.connectedAt ? new Date(account.connectedAt).toLocaleDateString() : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleSyncGmail(account.accountId)}
                          disabled={syncing === account.accountId}
                          variant="outline"
                          size="sm"
                          className="border-accentPurple text-accentPurple hover:bg-accentPurple/10"
                        >
                          {syncing === account.accountId ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Syncing
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Sync
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleStartWatch(account.accountId)}
                          variant="outline"
                          size="sm"
                          className="border-accentBlue text-accentBlue hover:bg-accentBlue/10"
                          title="Start real-time watch (requires Pub/Sub setup)"
                        >
                          Watch
                        </Button>
                        <Button
                          onClick={() => handleDisconnectAccount(account.accountId)}
                          variant="ghost"
                          size="sm"
                          className="text-text2 hover:text-red-400 hover:bg-red-400/10"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleConnectGmail}
                  variant="outline"
                  className="w-full border-accentBlue text-accentBlue hover:bg-accentBlue/10"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Add Another Account
                </Button>
              </div>
            )}
            {syncStatus && (
              <p className={`text-sm ${syncStatus.includes("Error") || syncStatus.includes("Failed") ? "text-red-400" : "text-text1"}`}>
                {syncStatus}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-panel border-border-0">
          <CardHeader>
            <CardTitle className="text-text0 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar Integration
            </CardTitle>
            <CardDescription className="text-text1">Connect and sync your Google Calendar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingCalendarAccounts ? (
              <div className="text-text2 text-sm">Loading calendar accounts...</div>
            ) : calendarAccounts.length === 0 ? (
              <div className="space-y-3">
                <p className="text-text2 text-sm">No calendar accounts connected yet.</p>
                <p className="text-text2 text-xs">
                  Calendar uses the same OAuth as Gmail. Connect Gmail to enable Calendar sync.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {calendarAccounts.map((account) => (
                  <div
                    key={account.accountId}
                    className="flex items-center justify-between p-3 rounded-lg border border-border-0 bg-bg1"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-accentPurple" />
                      <div>
                        <p className="text-text0 font-medium text-sm">{account.email}</p>
                        <p className="text-text2 text-xs">
                          Connected {account.connectedAt ? new Date(account.connectedAt).toLocaleDateString() : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleSyncCalendar(account.accountId)}
                        disabled={syncingCalendar === account.accountId}
                        variant="outline"
                        size="sm"
                        className="border-accentPurple text-accentPurple hover:bg-accentPurple/10"
                      >
                        {syncingCalendar === account.accountId ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Syncing
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Sync
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleDisconnectCalendar(account.accountId)}
                        variant="ghost"
                        size="sm"
                        className="text-text2 hover:text-red-400 hover:bg-red-400/10"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {syncStatus && syncStatus.includes("calendar") && (
              <p className={`text-sm ${syncStatus.includes("Error") || syncStatus.includes("Failed") ? "text-red-400" : "text-text1"}`}>
                {syncStatus}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-panel border-border-0">
          <CardHeader>
            <CardTitle className="text-text0">AI Processing</CardTitle>
            <CardDescription className="text-text1">Run AI pipeline on existing emails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleBulkProcessAI}
              disabled={processingAI}
              className="bg-accentPurple hover:bg-accentPurple/90 text-bg0"
            >
              {processingAI ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Process Today's Emails
                </>
              )}
            </Button>
            {aiStatus && (
              <p className={`text-sm ${aiStatus.includes("Error") ? "text-red-400" : "text-text1"}`}>
                {aiStatus}
              </p>
            )}
            <p className="text-text2 text-xs">
              Runs AI classification, summarization, and extraction on all emails from today. Useful for processing existing emails after Phase 3 implementation.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-panel border-border-0">
          <CardHeader>
            <CardTitle className="text-text0">Agent</CardTitle>
            <CardDescription className="text-text1">Manual agent triggers</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleRunAgent}
              disabled={processingAI}
              className="bg-accentBlue hover:bg-accentBlue/90 text-bg0"
            >
              {processingAI ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run agent now
                </>
              )}
            </Button>
            <p className="text-text2 text-sm mt-4">
              Manually trigger the hourly digest agent. Computes new important emails, overdue replies, follow-ups, and prep gaps.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
