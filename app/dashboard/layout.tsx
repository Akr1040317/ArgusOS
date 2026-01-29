"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/client"
import { Sidebar } from "@/components/shell/Sidebar"
import { Topbar } from "@/components/shell/Topbar"
import { CommandPalette } from "@/components/shell/CommandPalette"
import { ShortcutOverlay } from "@/components/shell/ShortcutOverlay"
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, loading] = useAuthState(auth)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutOverlayOpen, setShortcutOverlayOpen] = useState(false)

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    onCommandPaletteOpen: () => setCommandPaletteOpen(true),
    onShortcutOverlayOpen: () => setShortcutOverlayOpen(true),
    onSearchFocus: () => {
      // Focus search input in topbar
      const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement
      searchInput?.focus()
    },
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg0 flex items-center justify-center">
        <div className="text-text1">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-bg0">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onCommandPaletteOpen={() => setCommandPaletteOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <ShortcutOverlay open={shortcutOverlayOpen} onOpenChange={setShortcutOverlayOpen} />
    </div>
  )
}
