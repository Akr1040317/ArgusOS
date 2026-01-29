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
}

export function ThreadList({ onThreadSelect, selectedThreadId, accountIdFilter }: ThreadListProps) {
  const [user] = useAuthState(auth)
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)

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
        
        setThreads(threadData)
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching threads:", error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user, accountIdFilter])

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
      {threads.map((thread) => (
        <ThreadRow
          key={thread.id}
          thread={thread}
          isSelected={selectedThreadId === thread.id}
          onClick={() => onThreadSelect(thread.id)}
        />
      ))}
    </div>
  )
}
