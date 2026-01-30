"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Command } from "cmdk"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/client"
import {
  Inbox,
  Calendar,
  MessageSquare,
  Settings,
  Home,
  Search,
  Play,
  Sparkles,
  X,
  CheckSquare,
  Mail,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user] = useAuthState(auth)
  const [search, setSearch] = useState("")

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false)
      }
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [open, onOpenChange])

  // Reset search when closing
  useEffect(() => {
    if (!open) {
      setSearch("")
    }
  }, [open])

  const handleSelect = (action: () => void) => {
    action()
    onOpenChange(false)
    setSearch("")
  }

  const navigationCommands = [
    {
      id: "go-home",
      label: "Go to Dashboard",
      icon: Home,
      keywords: ["home", "dashboard", "command center"],
      action: () => router.push("/dashboard"),
    },
    {
      id: "go-inbox",
      label: "Go to Inbox",
      icon: Inbox,
      keywords: ["inbox", "email", "messages"],
      action: () => router.push("/dashboard/inbox"),
    },
    {
      id: "go-calendar",
      label: "Go to Calendar",
      icon: Calendar,
      keywords: ["calendar", "events", "meetings"],
      action: () => router.push("/dashboard/calendar"),
    },
    {
      id: "go-chat",
      label: "Go to Chat",
      icon: MessageSquare,
      keywords: ["chat", "ask", "query"],
      action: () => router.push("/dashboard/chat"),
    },
    {
      id: "go-tasks",
      label: "Go to Tasks",
      icon: CheckSquare,
      keywords: ["tasks", "todo", "commitments", "follow-ups"],
      action: () => router.push("/dashboard/tasks"),
    },
    {
      id: "go-settings",
      label: "Go to Settings",
      icon: Settings,
      keywords: ["settings", "preferences", "config"],
      action: () => router.push("/dashboard/settings"),
    },
  ]

  const actionCommands = [
    {
      id: "compose-email",
      label: "Compose Email",
      icon: Mail,
      keywords: ["compose", "email", "send", "write", "new email"],
      action: () => {
        router.push("/dashboard/inbox?compose=true")
      },
    },
    {
      id: "create-event",
      label: "Create Event",
      icon: Plus,
      keywords: ["create", "event", "calendar", "meeting", "new event", "schedule"],
      action: () => {
        router.push("/dashboard/calendar?create=true")
      },
    },
    {
      id: "run-agent",
      label: "Run Agent Now",
      icon: Play,
      keywords: ["agent", "digest", "process"],
      action: async () => {
        if (!user) return
        try {
          const token = await user.getIdToken()
          await fetch("/api/digest/compute", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ uid: user.uid }),
          })
          // Could show a toast notification here
        } catch (error) {
          console.error("Error running agent:", error)
        }
      },
    },
  ]

  const allCommands = [...navigationCommands, ...actionCommands]

  // Filter commands based on search
  const filteredCommands = allCommands.filter((cmd) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      cmd.label.toLowerCase().includes(searchLower) ||
      cmd.keywords.some((kw) => kw.includes(searchLower))
    )
  })

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false)
        }
      }}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <Command
        className={cn(
          "relative z-50 w-full max-w-2xl rounded-lg border border-border-0 bg-panel shadow-2xl",
          "overflow-hidden"
        )}
        shouldFilter={false}
      >
        <div className="flex items-center border-b border-border-0 px-4">
          <Search className="mr-2 h-4 w-4 shrink-0 text-text2" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Type a command or search..."
            className="flex h-12 w-full bg-transparent text-text0 placeholder:text-text2 outline-none"
            autoFocus
          />
          <button
            onClick={() => onOpenChange(false)}
            className="ml-2 rounded p-1 hover:bg-bg1 text-text2 hover:text-text0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <Command.List className="max-h-[400px] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-text2">
            No commands found.
          </Command.Empty>
          {filteredCommands.length > 0 && (
            <Command.Group heading="Commands" className="px-2 py-1.5 text-xs font-semibold text-text2">
              {filteredCommands.map((cmd) => {
                const Icon = cmd.icon
                return (
                  <Command.Item
                    key={cmd.id}
                    onSelect={() => handleSelect(cmd.action)}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text0 hover:bg-bg1 cursor-pointer aria-selected:bg-accentBlue/20 aria-selected:text-accentBlue"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{cmd.label}</span>
                  </Command.Item>
                )
              })}
            </Command.Group>
          )}
        </Command.List>
        <div className="flex items-center gap-4 border-t border-border-0 px-4 py-2 text-xs text-text2">
          <div className="flex items-center gap-2">
            <kbd className="rounded bg-bg1 px-1.5 py-0.5 font-mono">↑↓</kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="rounded bg-bg1 px-1.5 py-0.5 font-mono">↵</kbd>
            <span>Select</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="rounded bg-bg1 px-1.5 py-0.5 font-mono">Esc</kbd>
            <span>Close</span>
          </div>
        </div>
      </Command>
    </div>
  )
}
