import { useEffect, useRef } from "react"

interface InboxShortcutsOptions {
  onRegenerateDraft?: () => void
  onCopyDraft?: () => void
  onCycleTone?: () => void
  draftText?: string
  selectedTone?: string
  setSelectedTone?: (tone: string) => void
}

/**
 * Hook for inbox-specific keyboard shortcuts
 */
export function useInboxShortcuts({
  onRegenerateDraft,
  onCopyDraft,
  onCycleTone,
  draftText,
  selectedTone,
  setSelectedTone,
}: InboxShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in input/textarea (except for R which focuses draft)
      const target = e.target as HTMLElement
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

      // R: Focus draft editor
      if ((e.key === "r" || e.key === "R") && !e.shiftKey && !isTyping) {
        e.preventDefault()
        const draftTextarea = (window as any).__draftTextareaRef as HTMLTextAreaElement
        draftTextarea?.focus()
        return
      }

      // Shift+R: Regenerate draft
      if ((e.key === "r" || e.key === "R") && e.shiftKey && !isTyping && onRegenerateDraft) {
        e.preventDefault()
        onRegenerateDraft()
        return
      }

      // T: Cycle tone
      if ((e.key === "t" || e.key === "T") && !isTyping && setSelectedTone) {
        e.preventDefault()
        const tones = ["concise", "warm", "assertive", "formal"]
        const currentIndex = tones.indexOf(selectedTone || "concise")
        const nextIndex = (currentIndex + 1) % tones.length
        setSelectedTone(tones[nextIndex])
        onCycleTone?.()
        return
      }

      // C: Copy draft
      if ((e.key === "c" || e.key === "C") && !isTyping && onCopyDraft && draftText) {
        e.preventDefault()
        onCopyDraft()
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onRegenerateDraft, onCopyDraft, onCycleTone, draftText, selectedTone, setSelectedTone])
}
