"use client"

import { useEffect, useState } from "react"
import { doc, collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase/client"
import { useAuthState } from "react-firebase-hooks/auth"
import { useInboxShortcuts } from "@/lib/hooks/useInboxShortcuts"
import { auth } from "@/lib/firebase/client"
import { format } from "date-fns"
import { Mail, User, Clock, Copy, RefreshCw, Loader2, Send, Reply } from "lucide-react"
import { EmailComposer } from "@/components/email/EmailComposer"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { getAccountColor, getAccountDisplayName } from "@/lib/utils/accountColors"

// DOMPurify is browser-only, so we need to import it conditionally
let DOMPurify: any = null
if (typeof window !== "undefined") {
  DOMPurify = require("dompurify")
}

interface Message {
  id: string
  direction: "INBOUND" | "OUTBOUND"
  from: { name: string; email: string }
  to: Array<{ name: string; email: string }>
  cc?: Array<{ name: string; email: string }>
  dateISO: string
  bodyText: string
  bodyHtml?: string | null
  snippet: string
}

interface Thread {
  id: string
  subject: string
  snippet: string
  accountId?: string
  participants: Array<{ name: string; email: string }>
  summaryBullets?: string[]
  extractedAsk?: string
  openLoops?: string[]
  deadlines?: Array<{ label: string; dateISO: string | null; confidence: number }>
  tasks?: Array<{ type: string; label: string; dueISO: string | null; status: string; confidence: number }>
  status?: string
  priority?: string
  split?: string
  importanceReasons?: string[]
  draftReply?: {
    subject: string
    text: string
    tone: string
    generatedAt: string
    model: string
  }
  draftState?: "READY" | "FAILED" | "NONE"
  draftError?: string
}

export function ThreadViewer({ threadId }: { threadId: string | null }) {
  const [user] = useAuthState(auth)
  const [thread, setThread] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [selectedTone, setSelectedTone] = useState<string>("concise")
  const [activeTab, setActiveTab] = useState<"summary" | "ask-actions" | "draft" | "raw">("summary")
  const [showComposer, setShowComposer] = useState(false)
  const [composerMode, setComposerMode] = useState<"compose" | "reply">("compose")
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null)

  // Set up inbox shortcuts
  const handleRegenerateDraft = async () => {
    if (!user || !threadId || regenerating) return
    setRegenerating(true)
    try {
      const token = await user.getIdToken()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 35000)
      const response = await fetch("/api/drafts/regenerate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid: user.uid,
          threadId,
          tone: selectedTone,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to regenerate draft")
      }
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "Failed to regenerate draft")
      }
    } catch (error: any) {
      console.error("Error regenerating draft:", error)
      if (error.name !== "AbortError") {
        alert(`Error regenerating draft: ${error.message || "Unknown error"}`)
      }
    } finally {
      setRegenerating(false)
    }
  }

  const handleCopyDraft = () => {
    if (!thread?.draftReply) return
    const draftText = `Subject: ${thread.draftReply.subject}\n\n${thread.draftReply.text}`
    navigator.clipboard.writeText(draftText)
  }

  useInboxShortcuts({
    onRegenerateDraft: thread?.draftState === "READY" ? handleRegenerateDraft : undefined,
    onCopyDraft: thread?.draftReply ? handleCopyDraft : undefined,
    onCycleTone: () => {
      // Tone cycling is handled by setSelectedTone
    },
    draftText: thread?.draftReply?.text,
    selectedTone,
    setSelectedTone,
  })

  useEffect(() => {
    if (!user || !threadId) {
      setThread(null)
      setMessages([])
      setLoading(false)
      return
    }

    // Listen to thread
    const threadRef = doc(db, "emailThreads", user.uid, "threads", threadId)
    const unsubscribeThread = onSnapshot(
      threadRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setThread({ id: snapshot.id, ...snapshot.data() } as Thread)
        }
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching thread:", error)
        setLoading(false)
      }
    )

    // Listen to messages
    const messagesRef = collection(db, "emailThreads", user.uid, "threads", threadId, "messages")
    const messagesQuery = query(messagesRef, orderBy("dateISO", "asc"))
    const unsubscribeMessages = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messageData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[]
        setMessages(messageData)
      },
      (error) => {
        console.error("Error fetching messages:", error)
      }
    )

    return () => {
      unsubscribeThread()
      unsubscribeMessages()
    }
  }, [user, threadId])
  
  // Reset to summary tab when thread changes
  useEffect(() => {
    if (threadId) {
      setActiveTab("summary")
    }
  }, [threadId])

  if (!threadId) {
    return (
      <div className="h-full flex items-center justify-center bg-panel border-l border-border-0">
        <div className="text-center text-text2">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a thread to view</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-panel border-l border-border-0">
        <div className="text-text2">Loading thread...</div>
      </div>
    )
  }

  if (!thread) {
    return (
      <div className="h-full flex items-center justify-center bg-panel border-l border-border-0">
        <div className="text-center text-text2">
          <p>Thread not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-panel border-l border-border-0 min-w-0 overflow-hidden">
      {/* Thread Header - Fixed at top */}
      <div className="p-3 md:p-4 border-b border-border-0 flex-shrink-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h2 className="text-base md:text-lg font-semibold text-text0 break-words flex-1">{thread.subject || "(No Subject)"}</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setComposerMode("compose")
              setReplyingToMessage(null)
              setShowComposer(true)
            }}
            className="h-7 text-xs flex-shrink-0"
          >
            <Mail className="h-3 w-3 mr-1" />
            Compose
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-text2 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0">
            <User className="h-3 w-3 flex-shrink-0" />
            <span className="truncate text-xs">{thread.participants.map((p) => p.name || p.email).join(", ")}</span>
          </div>
          {thread.accountId && (() => {
            const accountColor = getAccountColor(thread.accountId)
            return (
              <span className={cn(
                "px-1.5 py-0.5 rounded text-xs border font-mono truncate max-w-[100px]",
                accountColor.bg,
                accountColor.text,
                accountColor.border
              )}>
                {getAccountDisplayName(thread.accountId)}
              </span>
            )
          })()}
          {thread.priority && (
            <span className={cn(
              "px-1.5 py-0.5 rounded text-xs border flex-shrink-0",
              thread.priority === "P0" && "bg-red-500/20 text-red-400 border-red-500/30",
              thread.priority === "P1" && "bg-orange-500/20 text-orange-400 border-orange-500/30",
              thread.priority === "P2" && "bg-blue-500/20 text-blue-400 border-blue-500/30"
            )}>
              {thread.priority}
            </span>
          )}
          {thread.status && (
            <span className={cn(
              "px-1.5 py-0.5 rounded text-xs border flex-shrink-0",
              thread.status === "NEEDS_REPLY" && "bg-accentBlue/20 text-accentBlue border-accentBlue/30",
              thread.status === "WAITING" && "bg-accentPurple/20 text-accentPurple border-accentPurple/30",
              thread.status === "FYI" && "bg-text2/10 text-text2 border-border-0"
            )}>
              {thread.status.replace("_", " ")}
            </span>
          )}
          {thread.split && thread.split !== "OTHER" && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-text2/10 text-text2 border border-border-0">
              {thread.split}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border-0 bg-bg1 px-2 flex-shrink-0">
        <button
          onClick={() => setActiveTab("summary")}
          className={cn(
            "px-3 py-2 text-sm font-medium transition-colors border-b-2",
            activeTab === "summary"
              ? "text-accentBlue border-accentBlue"
              : "text-text2 border-transparent hover:text-text0"
          )}
        >
          Summary
        </button>
        {(thread.extractedAsk || thread.tasks?.length > 0 || thread.deadlines?.length > 0) && (
          <button
            onClick={() => setActiveTab("ask-actions")}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors border-b-2",
              activeTab === "ask-actions"
                ? "text-accentBlue border-accentBlue"
                : "text-text2 border-transparent hover:text-text0"
            )}
          >
            Ask & Actions
          </button>
        )}
        <button
          onClick={() => setActiveTab("draft")}
          className={cn(
            "px-3 py-2 text-sm font-medium transition-colors border-b-2",
            activeTab === "draft"
              ? "text-accentBlue border-accentBlue"
              : "text-text2 border-transparent hover:text-text0"
          )}
        >
          Draft
        </button>
        <button
          onClick={() => setActiveTab("raw")}
          className={cn(
            "px-3 py-2 text-sm font-medium transition-colors border-b-2",
            activeTab === "raw"
              ? "text-accentBlue border-accentBlue"
              : "text-text2 border-transparent hover:text-text0"
          )}
        >
          Raw
        </button>
      </div>

      {/* Scrollable Content Area - Tab Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Summary Tab */}
        {activeTab === "summary" && (
          <div className="p-4 md:p-6 space-y-4">
            {thread.summaryBullets && thread.summaryBullets.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text0 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accentBlue"></span>
                  Summary
                </h3>
                <ul className="space-y-2 text-sm text-text1 ml-5">
                  {thread.summaryBullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-accentBlue mt-1.5">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {thread.importanceReasons && thread.importanceReasons.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text0 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                  Why Important
                </h3>
                <div className="flex flex-wrap gap-2 ml-5">
                  {thread.importanceReasons.map((reason, idx) => (
                    <span key={idx} className="px-2 py-1 rounded text-sm bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(!thread.summaryBullets || thread.summaryBullets.length === 0) && 
             (!thread.importanceReasons || thread.importanceReasons.length === 0) && (
              <div className="text-center text-text2 py-8">
                <p>No summary available</p>
                <p className="text-xs mt-2">AI summary will appear here once processed</p>
              </div>
            )}
          </div>
        )}

        {/* Ask & Actions Tab */}
        {activeTab === "ask-actions" && (
          <div className="p-4 md:p-6 space-y-4">
            {thread.extractedAsk && (
              <div>
                <h3 className="text-sm font-semibold text-text0 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accentPurple"></span>
                  Extracted Ask
                </h3>
                <p className="text-sm text-text1 ml-5">{thread.extractedAsk}</p>
              </div>
            )}

            {thread.openLoops && thread.openLoops.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text0 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                  Open Loops
                </h3>
                <ul className="space-y-2 text-sm text-text1 ml-5">
                  {thread.openLoops.map((loop, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1.5">•</span>
                      <span>{loop}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {thread.deadlines && thread.deadlines.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text0 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                  Deadlines
                </h3>
                <ul className="space-y-2 text-sm text-text1 ml-5">
                  {thread.deadlines.map((deadline, idx) => (
                    <li key={idx} className="flex items-center gap-2 flex-wrap">
                      <span className="text-red-400">•</span>
                      <span>{deadline.label}</span>
                      {deadline.dateISO && (
                        <span className="px-2 py-0.5 rounded text-xs bg-red-400/20 text-red-300 border border-red-400/30">
                          {format(new Date(deadline.dateISO), "MMM d, yyyy")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {thread.tasks && thread.tasks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text0 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                  Tasks
                </h3>
                <ul className="space-y-2 text-sm text-text1 ml-5">
                  {thread.tasks.map((task, idx) => {
                    const taskTypeColors: Record<string, string> = {
                      REPLY: "bg-blue-400/20 text-blue-300 border-blue-400/30",
                      FOLLOW_UP: "bg-purple-400/20 text-purple-300 border-purple-400/30",
                      SEND_DOC: "bg-yellow-400/20 text-yellow-300 border-yellow-400/30",
                      SCHEDULE: "bg-pink-400/20 text-pink-300 border-pink-400/30",
                      REVIEW: "bg-cyan-400/20 text-cyan-300 border-cyan-400/30",
                      PAY: "bg-green-400/20 text-green-300 border-green-400/30",
                      DECIDE: "bg-orange-400/20 text-orange-300 border-orange-400/30",
                      OTHER: "bg-gray-400/20 text-gray-300 border-gray-400/30",
                    }
                    const taskColor = taskTypeColors[task.type] || taskTypeColors.OTHER
                    return (
                      <li key={idx} className="flex items-center gap-2 flex-wrap">
                        <span className="text-green-400">•</span>
                        <span className={`px-2 py-0.5 rounded text-xs border ${taskColor}`}>
                          {task.type}
                        </span>
                        <span>{task.label}</span>
                        {task.dueISO && (
                          <span className="px-2 py-0.5 rounded text-xs bg-red-400/20 text-red-300 border border-red-400/30">
                            Due: {format(new Date(task.dueISO), "MMM d")}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {!thread.extractedAsk && 
             (!thread.tasks || thread.tasks.length === 0) && 
             (!thread.deadlines || thread.deadlines.length === 0) && 
             (!thread.openLoops || thread.openLoops.length === 0) && (
              <div className="text-center text-text2 py-8">
                <p>No asks or actions extracted</p>
                <p className="text-xs mt-2">AI will extract asks, tasks, and deadlines here</p>
              </div>
            )}
          </div>
        )}

        {/* Draft Tab */}
        {activeTab === "draft" && (
          <div className="p-4 md:p-6">
            {thread.draftState === "READY" && thread.draftReply ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text0 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-accentBlue" />
                    Draft Reply
                  </h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTone}
                      onChange={(e) => setSelectedTone(e.target.value)}
                      className="text-xs px-2 py-1 rounded bg-bg1 border border-border-0 text-text0"
                      disabled={regenerating}
                    >
                      <option value="concise">Concise</option>
                      <option value="warm">Warm</option>
                      <option value="assertive">Assertive</option>
                      <option value="formal">Formal</option>
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerateDraft}
                      disabled={regenerating || thread.draftReply?.tone === selectedTone}
                      className="h-7 text-xs"
                    >
                      {regenerating ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Regenerate
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyDraft}
                      className="h-7 text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setComposerMode("reply")
                        setShowComposer(true)
                      }}
                      className="h-7 text-xs border-accentBlue text-accentBlue hover:bg-accentBlue/10"
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      Reply
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!user || !thread?.draftReply || !thread.accountId) return
                        try {
                          const token = await user.getIdToken()
                          // Get all participants except the current user
                          const recipients = thread.participants
                            .filter((p) => {
                              // Filter out current user's email
                              const userEmail = user.email?.toLowerCase()
                              const participantEmail = p.email?.toLowerCase()
                              return participantEmail !== userEmail
                            })
                            .map((p) => p.email)
                          
                          if (recipients.length === 0) {
                            alert("No recipients found")
                            return
                          }

                          const response = await fetch("/api/email/send", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                              accountId: thread.accountId,
                              to: recipients,
                              subject: thread.draftReply.subject,
                              body: thread.draftReply.text,
                              threadId: threadId || undefined,
                            }),
                          })
                          const data = await response.json()
                          if (data.success) {
                            alert("Email sent successfully!")
                            // Refresh thread to show sent message
                            window.location.reload()
                          } else {
                            throw new Error(data.error || "Failed to send email")
                          }
                        } catch (error: any) {
                          console.error("Error sending email:", error)
                          alert(`Error sending email: ${error.message || "Unknown error"}`)
                        }
                      }}
                      className="h-7 text-xs bg-accentBlue hover:bg-accentBlue/90 text-bg0"
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Send
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-text2">
                    <span className="font-semibold">Subject: </span>
                    {thread.draftReply.subject}
                  </div>
                  <div className="p-4 rounded-lg bg-bg1 border border-border-0 text-sm text-text1 whitespace-pre-wrap min-h-[200px]">
                    {thread.draftReply.text}
                  </div>
                  <textarea
                    readOnly
                    value={thread.draftReply.text}
                    className="sr-only"
                    ref={(el) => {
                      if (el) {
                        (window as any).__draftTextareaRef = el
                      }
                    }}
                  />
                </div>
              </div>
            ) : (thread.draftState === "NONE" || !thread.draftState) && thread.status === "NEEDS_REPLY" ? (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <p className="text-text2 mb-4">No draft generated yet</p>
                  <p className="text-xs text-text2 mb-4">Generate an AI draft reply for this thread</p>
                  <div className="flex items-center justify-center gap-2">
                    <select
                      value={selectedTone}
                      onChange={(e) => setSelectedTone(e.target.value)}
                      className="text-xs px-2 py-1 rounded bg-bg0 border border-border-0 text-text0"
                      disabled={regenerating}
                    >
                      <option value="concise">Concise</option>
                      <option value="warm">Warm</option>
                      <option value="assertive">Assertive</option>
                      <option value="formal">Formal</option>
                    </select>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleRegenerateDraft}
                      disabled={regenerating}
                      className="h-7 text-xs bg-accentBlue hover:bg-accentBlue/90 text-bg0"
                    >
                      {regenerating ? (
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
                  </div>
                </div>
              </div>
            ) : thread.draftState === "FAILED" ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-red-400">Draft Generation Failed</p>
                      {thread.draftError && (
                        <p className="text-xs text-text2 mt-1">{thread.draftError}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerateDraft}
                      disabled={regenerating}
                      className="h-7 text-xs"
                    >
                      {regenerating ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-text2 py-8">
                <p>No draft available</p>
                <p className="text-xs mt-2">This thread doesn&apos;t need a reply or draft generation is not applicable</p>
              </div>
            )}
          </div>
        )}

        {/* Raw Tab - Messages */}
        {activeTab === "raw" && (
          <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            {messages.length === 0 ? (
              <div className="text-center text-text2 py-8">
                <p>No messages found</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={message.direction === "OUTBOUND" ? "ml-auto max-w-[85%] md:max-w-[80%]" : "mr-auto max-w-[85%] md:max-w-[80%]"}
                >
                  <div
                    className={cn(
                      message.direction === "OUTBOUND" ? "bg-accentBlue/10 border border-accentBlue/20" : "bg-bg1 border border-border-0",
                      "rounded-lg overflow-hidden"
                    )}
                  >
                    <div className="p-3 md:p-4">
                      <div className="flex items-start justify-between mb-2 gap-2 flex-wrap">
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-text0 text-xs md:text-sm truncate">
                              {message.from.name || message.from.email}
                            </span>
                            {message.direction === "OUTBOUND" && (
                              <span className="text-xs text-accentBlue flex-shrink-0">(You)</span>
                            )}
                          </div>
                          {message.from.email && message.from.name && (
                            <span className="text-xs text-text2 truncate">{message.from.email}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 md:gap-2 text-xs text-text2 flex-shrink-0">
                          {message.direction === "INBOUND" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setReplyingToMessage(message)
                                setComposerMode("reply")
                                setShowComposer(true)
                              }}
                              className="h-6 px-2 text-xs"
                            >
                              <Reply className="h-3 w-3 mr-1" />
                              Reply
                            </Button>
                          )}
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="hidden md:inline">{format(new Date(message.dateISO), "MMM d, yyyy h:mm a")}</span>
                          <span className="md:hidden">{format(new Date(message.dateISO), "MMM d, h:mm a")}</span>
                        </div>
                      </div>
                      {message.to.length > 0 && (
                        <div className="text-xs text-text2 mb-2 break-words">
                          To: {message.to.map((t) => t.name || t.email).join(", ")}
                        </div>
                      )}
                      {message.cc && message.cc.length > 0 && (
                        <div className="text-xs text-text2 mb-2 break-words">
                          Cc: {message.cc.map((c) => c.name || c.email).join(", ")}
                        </div>
                      )}
                      {message.bodyHtml && DOMPurify ? (
                        <div 
                          className="email-html-content text-text1 text-xs md:text-sm break-words"
                          dangerouslySetInnerHTML={{ 
                            __html: DOMPurify.sanitize(message.bodyHtml, {
                              ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'img', 'div', 'span', 'table', 'thead', 'tbody', 'tr', 'td', 'th'],
                              ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style'],
                              ALLOW_DATA_ATTR: false,
                            })
                          }}
                          style={{
                            color: 'inherit',
                          }}
                        />
                      ) : (
                        <div className="text-text1 text-xs md:text-sm whitespace-pre-wrap break-words">{message.bodyText || message.snippet}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Email Composer */}
      <EmailComposer
        open={showComposer}
        onClose={() => {
          setShowComposer(false)
          setReplyingToMessage(null)
        }}
        threadId={composerMode === "reply" && threadId ? threadId : undefined}
        initialTo={
          composerMode === "reply" && replyingToMessage
            ? [replyingToMessage.from.email]
            : composerMode === "reply" && thread
            ? thread.participants
                .filter((p) => {
                  const userEmail = user?.email?.toLowerCase()
                  return p.email?.toLowerCase() !== userEmail
                })
                .map((p) => p.email)
            : []
        }
        initialSubject={
          composerMode === "reply" && thread
            ? thread.subject.startsWith("Re:") ? thread.subject : `Re: ${thread.subject}`
            : ""
        }
        initialBody={
          composerMode === "reply" && replyingToMessage
            ? `\n\n---\nOn ${format(new Date(replyingToMessage.dateISO), "MMM d, yyyy 'at' h:mm a")}, ${replyingToMessage.from.name || replyingToMessage.from.email} wrote:\n\n${replyingToMessage.bodyText}`
            : ""
        }
        onSent={() => {
          setShowComposer(false)
          setReplyingToMessage(null)
          // Thread will auto-refresh via Firestore listener
        }}
        onDraftSaved={() => {
          setShowComposer(false)
          setReplyingToMessage(null)
        }}
      />
    </div>
  )
}
