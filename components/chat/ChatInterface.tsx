"use client"

import { useState, useEffect, useRef } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/client"
import { collection, query, orderBy, limit, onSnapshot, addDoc, doc, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase/client"
import { Send, Loader2, Plus, Trash2, ExternalLink, Mail, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { format } from "date-fns"
import { parseFirestoreTimestamp } from "@/lib/utils/firestore"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: Array<{ type: "thread" | "event"; id: string; reason: string }>
  actions?: Array<{ label: string; type: string; targetId: string | null }>
  createdAt?: { seconds: number; nanoseconds: number } | Date | string | any
}

interface Session {
  id: string
  title: string
  createdAt?: { seconds: number; nanoseconds: number } | Date | string | any
  updatedAt?: { seconds: number; nanoseconds: number } | Date | string | any
}

export function ChatInterface() {
  const [user] = useAuthState(auth)
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [creatingSession, setCreatingSession] = useState(false)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Load sessions
  useEffect(() => {
    if (!user) return

    const loadSessions = async () => {
      try {
        const token = await user.getIdToken()
        const response = await fetch("/api/chat/sessions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await response.json()
        if (data.sessions) {
          setSessions(data.sessions)
          // Auto-select first session or create new one
          if (data.sessions.length > 0 && !currentSessionId) {
            setCurrentSessionId(data.sessions[0].id)
          } else if (data.sessions.length === 0) {
            createNewSession()
          }
        }
      } catch (error) {
        console.error("Error loading sessions:", error)
      }
    }

    loadSessions()
  }, [user])

  // Load messages for current session
  useEffect(() => {
    if (!user || !currentSessionId) return

    const loadMessages = async () => {
      try {
        const token = await user.getIdToken()
        const response = await fetch(`/api/chat/messages?sessionId=${currentSessionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await response.json()
        if (data.messages) {
          setMessages(data.messages)
        }
      } catch (error) {
        console.error("Error loading messages:", error)
      }
    }

    loadMessages()
  }, [user, currentSessionId])

  const createNewSession = async () => {
    if (!user || creatingSession) return

    setCreatingSession(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setCurrentSessionId(data.sessionId)
        setMessages([])
        // Reload sessions
        const sessionsResponse = await fetch("/api/chat/sessions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const sessionsData = await sessionsResponse.json()
        if (sessionsData.sessions) {
          setSessions(sessionsData.sessions)
        }
      }
    } catch (error) {
      console.error("Error creating session:", error)
    } finally {
      setCreatingSession(false)
    }
  }

  const handleSend = async () => {
    if (!user || !input.trim() || !currentSessionId || loading) return

    const userMessage = input.trim()
    setInput("")
    setLoading(true)

    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
    }
    setMessages((prev) => [...prev, tempUserMessage])

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/chat/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          query: userMessage,
        }),
      })

      const data = await response.json()
      if (data.success) {
        // Reload messages to get the stored ones
        const messagesResponse = await fetch(`/api/chat/messages?sessionId=${currentSessionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const messagesData = await messagesResponse.json()
        if (messagesData.messages) {
          setMessages(messagesData.messages)
        }
      } else {
        throw new Error(data.error || "Failed to process query")
      }
    } catch (error: any) {
      console.error("Error sending message:", error)
      // Remove temp message and add error message
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id))
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Error: ${error.message || "Failed to process your query. Please try again."}`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleAction = (action: { label: string; type: string; targetId: string | null }) => {
    if (action.type === "OPEN_THREAD" && action.targetId) {
      window.location.href = `/dashboard/inbox?thread=${action.targetId}`
    } else if (action.type === "OPEN_EVENT" && action.targetId) {
      window.location.href = `/dashboard/calendar?event=${action.targetId}`
    }
    // Other actions can be implemented later
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent selecting the session when clicking delete

    if (!user || !confirm("Are you sure you want to delete this chat session?")) {
      return
    }

    setDeletingSessionId(sessionId)

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/chat/sessions?sessionId=${sessionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        // If deleted session was current, clear it
        if (currentSessionId === sessionId) {
          setCurrentSessionId(null)
          setMessages([])
        }

        // Reload sessions
        const sessionsResponse = await fetch("/api/chat/sessions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const sessionsData = await sessionsResponse.json()
        if (sessionsData.sessions) {
          setSessions(sessionsData.sessions)
          // Auto-select first session if available
          if (sessionsData.sessions.length > 0 && currentSessionId === sessionId) {
            setCurrentSessionId(sessionsData.sessions[0].id)
          }
        }
      } else {
        throw new Error(data.error || "Failed to delete session")
      }
    } catch (error: any) {
      console.error("Error deleting session:", error)
      alert(`Error deleting session: ${error.message}`)
    } finally {
      setDeletingSessionId(null)
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col -m-6">
      <div className="flex flex-1 overflow-hidden">
        {/* Sessions Sidebar */}
        <div className="w-64 border-r border-border-0 bg-panel flex flex-col">
          <div className="p-4 border-b border-border-0">
            <Button
              onClick={createNewSession}
              disabled={creatingSession}
              className="w-full bg-accentBlue hover:bg-accentBlue/90 text-bg0"
              size="sm"
            >
              {creatingSession ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </>
              )}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "group flex items-center gap-2 border-b border-border-0 hover:bg-bg1 transition-colors",
                  currentSessionId === session.id && "bg-accentBlue/10 border-l-2 border-l-accentBlue"
                )}
              >
                <button
                  onClick={() => setCurrentSessionId(session.id)}
                  className="flex-1 text-left p-3 min-w-0"
                >
                  <p className="text-sm font-medium text-text0 truncate">{session.title}</p>
                  {(() => {
                    const date = parseFirestoreTimestamp(session.updatedAt)
                    if (date) {
                      return (
                        <p className="text-xs text-text2 mt-1">
                          {format(date, "MMM d, h:mm a")}
                        </p>
                      )
                    }
                    return null
                  })()}
                </button>
                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  disabled={deletingSessionId === session.id}
                  className={cn(
                    "p-2 mr-2 opacity-0 group-hover:opacity-100 transition-opacity text-text2 hover:text-red-400 disabled:opacity-50",
                    deletingSessionId === session.id && "opacity-100"
                  )}
                  title="Delete session"
                >
                  {deletingSessionId === session.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <h3 className="text-xl font-semibold text-text0 mb-2">Start a conversation</h3>
                  <p className="text-text2 text-sm mb-4">
                    Ask questions about your emails and calendar. Try: "What did I miss today?" or "Show me my upcoming meetings"
                  </p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-4",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="h-8 w-8 rounded-full bg-accentBlue/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-accentBlue text-sm font-bold">A</span>
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg p-4",
                    message.role === "user"
                      ? "bg-accentBlue/10 border border-accentBlue/20"
                      : "bg-bg1 border border-border-0"
                  )}
                >
                  <p className="text-text1 whitespace-pre-wrap">{message.content}</p>

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border-0">
                      <p className="text-xs font-semibold text-text2 mb-2">Sources:</p>
                      <div className="space-y-1">
                        {message.sources.map((source, idx) => (
                          <Link
                            key={idx}
                            href={
                              source.type === "thread"
                                ? `/dashboard/inbox?thread=${source.id}`
                                : `/dashboard/calendar?event=${source.id}`
                            }
                            className="flex items-center gap-2 text-xs text-accentBlue hover:text-accentBlue/80 transition-colors"
                          >
                            {source.type === "thread" ? (
                              <Mail className="h-3 w-3" />
                            ) : (
                              <Calendar className="h-3 w-3" />
                            )}
                            <span className="truncate">{source.reason}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border-0">
                      <div className="flex flex-wrap gap-2">
                        {message.actions.map((action, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(action)}
                            className="h-7 text-xs"
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="h-8 w-8 rounded-full bg-accentPurple/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-accentPurple text-sm font-bold">U</span>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-4 justify-start">
                <div className="h-8 w-8 rounded-full bg-accentBlue/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-accentBlue text-sm font-bold">A</span>
                </div>
                <div className="bg-bg1 border border-border-0 rounded-lg p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-text2" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border-0 bg-panel">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Ask about your emails and calendar..."
                className="flex-1"
                disabled={loading || !currentSessionId}
              />
              <Button
                onClick={handleSend}
                disabled={loading || !input.trim() || !currentSessionId}
                className="bg-accentBlue hover:bg-accentBlue/90 text-bg0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
