"use client"

import { useEffect, useState } from "react"
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase/client"
import { ThreadRow } from "./ThreadRow"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/client"

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

interface ThreadListProps {
  onThreadSelect: (threadId: string) => void
  selectedThreadId?: string
  accountIdFilter?: string | null // null = all accounts
  splitFilter?: string | null // null = all splits, otherwise filter by split value
}

export function ThreadList({ onThreadSelect, selectedThreadId, accountIdFilter, splitFilter }: ThreadListProps) {
  const [user] = useAuthState(auth)
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return

    const threadsRef = collection(db, "emailThreads", user.uid, "threads")
    const q = query(threadsRef, orderBy("lastMessageAt", "desc"), limit(100))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let threadData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Thread[]
        
        // Filter by accountId if specified
        if (accountIdFilter !== null && accountIdFilter !== undefined) {
          threadData = threadData.filter((t) => t.accountId === accountIdFilter)
        }
        
        // Filter by split if specified
        if (splitFilter !== null && splitFilter !== undefined) {
          if (splitFilter === "NEEDS_REPLY") {
            // Filter by status for "Needs Reply"
            threadData = threadData.filter((t) => t.status === "NEEDS_REPLY")
          } else if (splitFilter === "WAITING") {
            // Filter by status for "Waiting on Them"
            threadData = threadData.filter((t) => t.status === "WAITING")
          } else {
            // Filter by split value for other splits
            threadData = threadData.filter((t) => t.split === splitFilter)
          }
        }
        
        setThreads(threadData)
        setLoading(false)
        
        // Set focused index to selected thread or first thread
        if (threadData.length > 0) {
          if (selectedThreadId) {
            const selectedIndex = threadData.findIndex((t) => t.id === selectedThreadId)
            setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0)
          } else {
            setFocusedIndex(0)
          }
        }
      },
      (error) => {
        console.error("Error fetching threads:", error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user, accountIdFilter, splitFilter, selectedThreadId])

  // J/K navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return
      }

      if (e.key === "j" || e.key === "J") {
        e.preventDefault()
        if (threads.length > 0 && focusedIndex !== null) {
          const nextIndex = focusedIndex < threads.length - 1 ? focusedIndex + 1 : 0
          setFocusedIndex(nextIndex)
          // Scroll into view
          const element = document.getElementById(`thread-${threads[nextIndex].id}`)
          element?.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault()
        if (threads.length > 0 && focusedIndex !== null) {
          const prevIndex = focusedIndex > 0 ? focusedIndex - 1 : threads.length - 1
          setFocusedIndex(prevIndex)
          // Scroll into view
          setTimeout(() => {
            const element = document.getElementById(`thread-${threads[prevIndex].id}`)
            element?.scrollIntoView({ behavior: "smooth", block: "nearest" })
          }, 0)
        }
      } else if (e.key === "Enter" && focusedIndex !== null && threads[focusedIndex]) {
        e.preventDefault()
        onThreadSelect(threads[focusedIndex].id)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [threads, focusedIndex, onThreadSelect])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text2">Loading threads...</div>
      </div>
    )
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-text2 mb-2">No threads yet</div>
        <div className="text-text2 text-sm">Connect Gmail and sync to see your emails</div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {threads.map((thread, index) => (
        <div key={thread.id} id={`thread-${thread.id}`}>
          <ThreadRow
            thread={thread}
            isSelected={selectedThreadId === thread.id}
            isFocused={focusedIndex === index}
            onClick={() => {
              setFocusedIndex(index)
              onThreadSelect(thread.id)
            }}
          />
        </div>
      ))}
    </div>
  )
}
