"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/client"
import { Mail, Clock, CheckCircle2, AlertCircle, ArrowRight, Search, X, ChevronDown, ChevronUp, Filter } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { format, formatDistanceToNow, isPast, parseISO } from "date-fns"
import Link from "next/link"

interface ReplyTask {
  threadId: string
  subject: string
  participants: Array<{ name: string; email: string }>
  priority: string
  lastInboundAt: string | null
  extractedAsk?: string
  summaryBullets?: string[]
  draftState?: string
}

interface FollowUp {
  threadId: string
  subject: string
  participants: Array<{ name: string; email: string }>
  priority: string
  lastOutboundAt: string | null
  lastInboundAt: string | null
  summaryBullets?: string[]
}

interface Commitment {
  threadId: string
  subject: string
  participants: Array<{ name: string; email: string }>
  task: {
    type: string
    label: string
    dueISO: string | null
    status: string
    confidence: number
  }
  priority: string
}

type TaskType = "all" | "replies" | "followups" | "commitments"
type PriorityFilter = "all" | "P0" | "P1" | "P2"

export default function TasksPage() {
  const [user] = useAuthState(auth)
  const [replyTasks, setReplyTasks] = useState<ReplyTask[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [activeTab, setActiveTab] = useState<TaskType>("all")
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedSections, setExpandedSections] = useState({
    replies: true,
    followups: true,
    commitments: true,
  })

  useEffect(() => {
    if (!user) return

    const fetchTasks = async () => {
      try {
        const token = await user.getIdToken()
        const res = await fetch("/api/tasks", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          const errorText = await res.text()
          console.error("Tasks API error:", res.status, errorText)
          throw new Error(`Failed to fetch tasks: ${res.status}`)
        }

        const data = await res.json()
        setReplyTasks(data.replyTasks || [])
        setFollowUps(data.followUps || [])
        setCommitments(data.commitments || [])
      } catch (error) {
        console.error("Error fetching tasks:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchTasks, 30000)
    return () => clearInterval(interval)
  }, [user])

  // Filter and search logic
  const filteredReplyTasks = useMemo(() => {
    let filtered = replyTasks

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((t) => t.priority === priorityFilter)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.subject?.toLowerCase().includes(query) ||
          t.extractedAsk?.toLowerCase().includes(query) ||
          t.participants.some((p) => 
            p.name?.toLowerCase().includes(query) || 
            p.email?.toLowerCase().includes(query)
          )
      )
    }

    return filtered
  }, [replyTasks, priorityFilter, searchQuery])

  const filteredFollowUps = useMemo(() => {
    let filtered = followUps

    if (priorityFilter !== "all") {
      filtered = filtered.filter((t) => t.priority === priorityFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.subject?.toLowerCase().includes(query) ||
          t.participants.some((p) => 
            p.name?.toLowerCase().includes(query) || 
            p.email?.toLowerCase().includes(query)
          )
      )
    }

    return filtered
  }, [followUps, priorityFilter, searchQuery])

  const filteredCommitments = useMemo(() => {
    let filtered = commitments

    if (priorityFilter !== "all") {
      filtered = filtered.filter((t) => t.priority === priorityFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.subject?.toLowerCase().includes(query) ||
          t.task.label?.toLowerCase().includes(query) ||
          t.task.type?.toLowerCase().includes(query) ||
          t.participants.some((p) => 
            p.name?.toLowerCase().includes(query) || 
            p.email?.toLowerCase().includes(query)
          )
      )
    }

    return filtered
  }, [commitments, priorityFilter, searchQuery])

  // Determine which sections to show based on active tab
  const showReplies = activeTab === "all" || activeTab === "replies"
  const showFollowUps = activeTab === "all" || activeTab === "followups"
  const showCommitments = activeTab === "all" || activeTab === "commitments"

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "P0":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "P1":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case "P2":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      default:
        return "bg-text2/10 text-text2 border-border-0"
    }
  }

  const getParticipantDisplay = (participants: Array<{ name: string; email: string }>) => {
    if (participants.length === 0) return "Unknown"
    const first = participants[0]
    return first.name || first.email || "Unknown"
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text0">Tasks</h1>
          <p className="text-text1 mt-2">Derived tasks from your emails</p>
        </div>
        <Card className="bg-panel border-border-0">
          <CardContent className="p-8 text-center">
            <p className="text-text2">Loading tasks...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalTasks = replyTasks.length + followUps.length + commitments.length
  const totalFiltered = filteredReplyTasks.length + filteredFollowUps.length + filteredCommitments.length

  // Show helpful message if no tasks
  if (totalTasks === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text0">Tasks</h1>
          <p className="text-text1 mt-2">Derived tasks from your emails</p>
        </div>
        <Card className="bg-panel border-border-0">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-text2 text-lg">No tasks found</p>
            <div className="text-sm text-text2 space-y-2 max-w-md mx-auto">
              <p>Tasks are automatically derived from your emails:</p>
              <ul className="list-disc list-inside space-y-1 text-left">
                <li><strong>Reply Tasks:</strong> Emails that need your response</li>
                <li><strong>Follow-ups:</strong> Messages you sent waiting for a reply (72+ hours)</li>
                <li><strong>Commitments:</strong> Tasks and actions extracted from emails</li>
              </ul>
              <p className="mt-4 text-xs">
                Make sure you have emails synced and processed by the AI pipeline.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text0">Tasks</h1>
        <p className="text-text1 mt-2">
          {totalFiltered === totalTasks
            ? `${totalTasks} task${totalTasks !== 1 ? "s" : ""}`
            : `${totalFiltered} of ${totalTasks} tasks`}
        </p>
      </div>

      {/* Filters and Search */}
      <Card className="bg-panel border-border-0">
        <CardContent className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text2" />
            <Input
              type="search"
              placeholder="Search tasks by subject, participant, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-bg1 border-border-0 text-text0 placeholder:text-text2"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text2 hover:text-text0"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Tabs and Priority Filter */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Task Type Tabs */}
            <div className="flex items-center gap-2 bg-bg1 rounded-lg p-1 border border-border-0">
              <button
                onClick={() => setActiveTab("all")}
                className={cn(
                  "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                  activeTab === "all"
                    ? "bg-accentBlue/20 text-accentBlue"
                    : "text-text2 hover:text-text0"
                )}
              >
                All ({totalTasks})
              </button>
              <button
                onClick={() => setActiveTab("replies")}
                className={cn(
                  "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                  activeTab === "replies"
                    ? "bg-accentBlue/20 text-accentBlue"
                    : "text-text2 hover:text-text0"
                )}
              >
                Replies ({replyTasks.length})
              </button>
              <button
                onClick={() => setActiveTab("followups")}
                className={cn(
                  "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                  activeTab === "followups"
                    ? "bg-accentBlue/20 text-accentBlue"
                    : "text-text2 hover:text-text0"
                )}
              >
                Follow-ups ({followUps.length})
              </button>
              <button
                onClick={() => setActiveTab("commitments")}
                className={cn(
                  "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                  activeTab === "commitments"
                    ? "bg-accentBlue/20 text-accentBlue"
                    : "text-text2 hover:text-text0"
                )}
              >
                Commitments ({commitments.length})
              </button>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-text2" />
              <div className="flex items-center gap-1 bg-bg1 rounded-lg p-1 border border-border-0">
                {(["all", "P0", "P1", "P2"] as PriorityFilter[]).map((priority) => (
                  <button
                    key={priority}
                    onClick={() => setPriorityFilter(priority)}
                    className={cn(
                      "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                      priorityFilter === priority
                        ? "bg-accentBlue/20 text-accentBlue"
                        : "text-text2 hover:text-text0"
                    )}
                  >
                    {priority === "all" ? "All Priorities" : priority}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reply Tasks */}
      {showReplies && (
        <Card className="bg-panel border-border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-accentBlue" />
                <div>
                  <CardTitle className="text-text0">Reply Tasks</CardTitle>
                  <CardDescription className="text-text1">
                    Emails waiting for your response
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {filteredReplyTasks.length > 0 && (
                  <span className="px-3 py-1 rounded-full bg-accentBlue/20 text-accentBlue text-sm font-medium">
                    {filteredReplyTasks.length}
                  </span>
                )}
                <button
                  onClick={() => toggleSection("replies")}
                  className="text-text2 hover:text-text0 transition-colors"
                >
                  {expandedSections.replies ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </CardHeader>
          {expandedSections.replies && (
            <CardContent>
              {filteredReplyTasks.length === 0 ? (
                <p className="text-text2 text-sm text-center py-8">
                  {replyTasks.length === 0
                    ? "No reply tasks"
                    : "No reply tasks match your filters"}
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredReplyTasks.map((task) => (
                    <Link
                      key={task.threadId}
                      href={`/dashboard/inbox?thread=${task.threadId}`}
                      className="block"
                    >
                      <div className="p-4 rounded-lg border border-border-0 bg-bg1 hover:bg-bg2 transition-colors cursor-pointer group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-xs font-medium border",
                                  getPriorityColor(task.priority)
                                )}
                              >
                                {task.priority}
                              </span>
                              {task.draftState === "READY" && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                                  Draft Ready
                                </span>
                              )}
                            </div>
                            <h3 className="font-medium text-text0 mb-1 group-hover:text-accentBlue transition-colors">
                              {task.subject || "(No subject)"}
                            </h3>
                            <p className="text-sm text-text1 mb-2">
                              From: {getParticipantDisplay(task.participants)}
                            </p>
                            {task.extractedAsk && (
                              <p className="text-sm text-text2 line-clamp-2">{task.extractedAsk}</p>
                            )}
                            {task.lastInboundAt && (
                              <p className="text-xs text-text2 mt-2">
                                {formatDistanceToNow(new Date(task.lastInboundAt), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="h-5 w-5 text-text2 group-hover:text-accentBlue transition-colors shrink-0" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Follow-ups */}
      {showFollowUps && (
        <Card className="bg-panel border-border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-accentPurple" />
                <div>
                  <CardTitle className="text-text0">Follow-ups</CardTitle>
                  <CardDescription className="text-text1">
                    Waiting on responses (72+ hours)
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {filteredFollowUps.length > 0 && (
                  <span className="px-3 py-1 rounded-full bg-accentPurple/20 text-accentPurple text-sm font-medium">
                    {filteredFollowUps.length}
                  </span>
                )}
                <button
                  onClick={() => toggleSection("followups")}
                  className="text-text2 hover:text-text0 transition-colors"
                >
                  {expandedSections.followups ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </CardHeader>
          {expandedSections.followups && (
            <CardContent>
              {filteredFollowUps.length === 0 ? (
                <p className="text-text2 text-sm text-center py-8">
                  {followUps.length === 0
                    ? "No follow-ups needed"
                    : "No follow-ups match your filters"}
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredFollowUps.map((followUp) => (
                    <Link
                      key={followUp.threadId}
                      href={`/dashboard/inbox?thread=${followUp.threadId}`}
                      className="block"
                    >
                      <div className="p-4 rounded-lg border border-border-0 bg-bg1 hover:bg-bg2 transition-colors cursor-pointer group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-xs font-medium border",
                                  getPriorityColor(followUp.priority)
                                )}
                              >
                                {followUp.priority}
                              </span>
                            </div>
                            <h3 className="font-medium text-text0 mb-1 group-hover:text-accentPurple transition-colors">
                              {followUp.subject || "(No subject)"}
                            </h3>
                            <p className="text-sm text-text1 mb-2">
                              To: {getParticipantDisplay(followUp.participants)}
                            </p>
                            {followUp.lastOutboundAt && (
                              <p className="text-xs text-text2">
                                Sent {formatDistanceToNow(new Date(followUp.lastOutboundAt), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="h-5 w-5 text-text2 group-hover:text-accentPurple transition-colors shrink-0" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Commitments */}
      {showCommitments && (
        <Card className="bg-panel border-border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-accentPink" />
                <div>
                  <CardTitle className="text-text0">Commitments</CardTitle>
                  <CardDescription className="text-text1">
                    Promised actions and tasks
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {filteredCommitments.length > 0 && (
                  <span className="px-3 py-1 rounded-full bg-accentPink/20 text-accentPink text-sm font-medium">
                    {filteredCommitments.length}
                  </span>
                )}
                <button
                  onClick={() => toggleSection("commitments")}
                  className="text-text2 hover:text-text0 transition-colors"
                >
                  {expandedSections.commitments ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </CardHeader>
          {expandedSections.commitments && (
            <CardContent>
              {filteredCommitments.length === 0 ? (
                <p className="text-text2 text-sm text-center py-8">
                  {commitments.length === 0
                    ? "No commitments found"
                    : "No commitments match your filters"}
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredCommitments.map((commitment, idx) => {
                    const isOverdue = commitment.task.dueISO
                      ? isPast(parseISO(commitment.task.dueISO))
                      : false

                    return (
                      <Link
                        key={`${commitment.threadId}-${idx}`}
                        href={`/dashboard/inbox?thread=${commitment.threadId}`}
                        className="block"
                      >
                        <div className="p-4 rounded-lg border border-border-0 bg-bg1 hover:bg-bg2 transition-colors cursor-pointer group">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded text-xs font-medium border",
                                    getPriorityColor(commitment.priority)
                                  )}
                                >
                                  {commitment.priority}
                                </span>
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-accentPink/20 text-accentPink border border-accentPink/30">
                                  {commitment.task.type}
                                </span>
                                {isOverdue && (
                                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Overdue
                                  </span>
                                )}
                              </div>
                              <h3 className="font-medium text-text0 mb-1 group-hover:text-accentPink transition-colors">
                                {commitment.task.label}
                              </h3>
                              <p className="text-sm text-text1 mb-2">
                                From: {commitment.subject || "(No subject)"}
                              </p>
                              <p className="text-sm text-text1 mb-2">
                                {getParticipantDisplay(commitment.participants)}
                              </p>
                              {commitment.task.dueISO && (
                                <p className={cn(
                                  "text-xs mt-2",
                                  isOverdue ? "text-red-400" : "text-text2"
                                )}>
                                  Due: {format(parseISO(commitment.task.dueISO), "MMM d, yyyy 'at' h:mm a")}
                                </p>
                              )}
                            </div>
                            <ArrowRight className="h-5 w-5 text-text2 group-hover:text-accentPink transition-colors shrink-0" />
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
