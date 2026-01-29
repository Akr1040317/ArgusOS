import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

interface KeyboardShortcutsOptions {
  onCommandPaletteOpen: () => void
  onShortcutOverlayOpen: () => void
  onSearchFocus?: () => void
}

/**
 * Hook to handle global keyboard shortcuts
 */
export function useKeyboardShortcuts({
  onCommandPaletteOpen,
  onShortcutOverlayOpen,
  onSearchFocus,
}: KeyboardShortcutsOptions) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Cmd+K and ? even when typing
        if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          onCommandPaletteOpen()
          return
        }
        if (e.key === "?") {
          e.preventDefault()
          onShortcutOverlayOpen()
          return
        }
        return
      }

      // Command palette: Cmd+K or Ctrl+K
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onCommandPaletteOpen()
        return
      }

      // Shortcut overlay: ?
      if (e.key === "?") {
        e.preventDefault()
        onShortcutOverlayOpen()
        return
      }

      // Tab navigation: Cmd+1-7
      if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "7") {
        e.preventDefault()
        const tabNumber = parseInt(e.key)
        const routes = [
          "/dashboard", // 1
          "/dashboard/inbox", // 2
          "/dashboard/calendar", // 3
          "/dashboard/chat", // 4
          "/dashboard/tasks", // 5
          "/dashboard/settings", // 6
          // 7 reserved for future
        ]
        if (routes[tabNumber - 1]) {
          router.push(routes[tabNumber - 1])
        }
        return
      }

      // Focus search: Cmd+F or Ctrl+F
      if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onSearchFocus?.()
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [router, onCommandPaletteOpen, onShortcutOverlayOpen, onSearchFocus])
}
