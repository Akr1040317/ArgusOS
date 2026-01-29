"use client"

import { X, Command } from "lucide-react"
import { cn } from "@/lib/utils"

interface ShortcutOverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShortcutOverlay({ open, onOpenChange }: ShortcutOverlayProps) {
  if (!open) return null

  const globalShortcuts = [
    { keys: ["⌘", "K"], description: "Open command palette" },
    { keys: ["⌘", "1"], description: "Go to Dashboard" },
    { keys: ["⌘", "2"], description: "Go to Inbox" },
    { keys: ["⌘", "3"], description: "Go to Calendar" },
    { keys: ["⌘", "4"], description: "Go to Chat" },
    { keys: ["⌘", "5"], description: "Go to Tasks" },
    { keys: ["⌘", "6"], description: "Go to Settings" },
    { keys: ["⌘", "F"], description: "Focus search" },
    { keys: ["?"], description: "Show shortcuts" },
    { keys: ["Esc"], description: "Close overlay/palette" },
  ]

  const inboxShortcuts = [
    { keys: ["J"], description: "Next thread" },
    { keys: ["K"], description: "Previous thread" },
    { keys: ["↵"], description: "Open thread" },
    { keys: ["R"], description: "Focus draft editor" },
    { keys: ["⇧", "R"], description: "Regenerate draft" },
    { keys: ["T"], description: "Cycle tone" },
    { keys: ["C"], description: "Copy draft" },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false)
        }
      }}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-50 w-full max-w-3xl rounded-lg border border-border-0 bg-panel shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border-0 px-6 py-4">
          <div className="flex items-center gap-3">
            <Command className="h-5 w-5 text-accentBlue" />
            <h2 className="text-xl font-semibold text-text0">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded p-1 hover:bg-bg1 text-text2 hover:text-text0 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-text0 mb-3">Global Shortcuts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {globalShortcuts.map((shortcut, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg bg-bg1 border border-border-0 p-3"
                >
                  <span className="text-sm text-text1">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, keyIdx) => (
                      <kbd
                        key={keyIdx}
                        className="rounded bg-panel border border-border-0 px-2 py-1 text-xs font-mono text-text0 min-w-[2rem] text-center"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text0 mb-3">Inbox Shortcuts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {inboxShortcuts.map((shortcut, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg bg-bg1 border border-border-0 p-3"
                >
                  <span className="text-sm text-text1">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, keyIdx) => (
                      <kbd
                        key={keyIdx}
                        className="rounded bg-panel border border-border-0 px-2 py-1 text-xs font-mono text-text0 min-w-[2rem] text-center"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border-0 px-6 py-3 bg-bg1">
          <p className="text-xs text-text2 text-center">
            Press <kbd className="rounded bg-panel border border-border-0 px-1.5 py-0.5 font-mono">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}
