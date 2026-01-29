"use client"

import { formatDistanceToNow } from "date-fns"
import { Mail, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { getAccountColor, getAccountDisplayName } from "@/lib/utils/accountColors"

interface Thread {
  id: string
  subject: string
  snippet: string
  lastMessageAt: string
  accountId?: string
  status?: string
  split?: string
  priority?: string
  draftState?: string
}

interface ThreadRowProps {
  thread: Thread
  isSelected: boolean
  onClick: () => void
}

export function ThreadRow({ thread, isSelected, onClick }: ThreadRowProps) {
  const timeAgo = thread.lastMessageAt
    ? formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })
    : ""

  const getPriorityColor = (priority?: string) => {
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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "NEEDS_REPLY":
        return "bg-accentBlue/20 text-accentBlue border-accentBlue/30"
      case "WAITING":
        return "bg-accentPurple/20 text-accentPurple border-accentPurple/30"
      default:
        return "bg-text2/10 text-text2 border-border-0"
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 md:p-4 border-b border-border-0 cursor-pointer transition-colors",
        isSelected ? "bg-accentBlue/10 border-l-2 border-l-accentBlue" : "hover:bg-bg1"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
        <h3 className="font-medium text-text0 text-sm line-clamp-1 flex-1 min-w-0 break-words">{thread.subject || "(No Subject)"}</h3>
        {thread.draftState === "READY" && (
          <Mail className="h-4 w-4 text-accentPurple flex-shrink-0" />
        )}
      </div>

      <p className="text-text2 text-xs line-clamp-2 mb-2 break-words">{thread.snippet}</p>

      <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
        {thread.accountId && (() => {
          const accountColor = getAccountColor(thread.accountId)
          return (
            <span className={cn(
              "px-1.5 md:px-2 py-0.5 rounded text-xs border font-mono truncate max-w-[80px] md:max-w-none",
              accountColor.bg,
              accountColor.text,
              accountColor.border
            )}>
              {getAccountDisplayName(thread.accountId)}
            </span>
          )
        })()}
        {thread.priority && (
          <span className={cn("px-1.5 md:px-2 py-0.5 rounded text-xs border flex-shrink-0", getPriorityColor(thread.priority))}>
            {thread.priority}
          </span>
        )}
        {thread.status && (
          <span className={cn("px-1.5 md:px-2 py-0.5 rounded text-xs border flex-shrink-0", getStatusColor(thread.status))}>
            <span className="hidden md:inline">{thread.status.replace("_", " ")}</span>
            <span className="md:hidden">{thread.status.replace("_", " ").split(" ")[0]}</span>
          </span>
        )}
        {thread.split && thread.split !== "OTHER" && (
          <span className="px-1.5 md:px-2 py-0.5 rounded text-xs bg-text2/10 text-text2 border border-border-0 flex-shrink-0">
            {thread.split}
          </span>
        )}
        {timeAgo && (
          <span className="text-text2 text-xs flex items-center gap-1 flex-shrink-0">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span className="hidden md:inline">{timeAgo}</span>
            <span className="md:hidden">{timeAgo.split(" ")[0]}</span>
          </span>
        )}
      </div>
    </div>
  )
}
