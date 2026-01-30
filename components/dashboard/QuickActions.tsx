"use client"

import { useRouter } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/client"
import { Button } from "@/components/ui/button"
import { Mail, Calendar, Play, CheckSquare, Loader2 } from "lucide-react"
import { useState } from "react"

export function QuickActions() {
  const router = useRouter()
  const [user] = useAuthState(auth)
  const [runningAgent, setRunningAgent] = useState(false)

  const handleRunAgent = async () => {
    if (!user || runningAgent) return

    setRunningAgent(true)
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
      // Refresh the page after a short delay to show updated digest
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error("Error running agent:", error)
      setRunningAgent(false)
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Button
        onClick={() => router.push("/dashboard/inbox?compose=true")}
        className="bg-accentBlue hover:bg-accentBlue/90 text-bg0"
        size="sm"
      >
        <Mail className="h-4 w-4 mr-2" />
        Compose Email
      </Button>
      <Button
        onClick={() => router.push("/dashboard/calendar?create=true")}
        className="bg-accentPurple hover:bg-accentPurple/90 text-bg0"
        size="sm"
      >
        <Calendar className="h-4 w-4 mr-2" />
        Create Event
      </Button>
      <Button
        onClick={handleRunAgent}
        disabled={runningAgent}
        variant="outline"
        size="sm"
        className="border-border-0 text-text0 hover:bg-bg1"
      >
        {runningAgent ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            Run Agent Now
          </>
        )}
      </Button>
      <Button
        onClick={() => router.push("/dashboard/tasks")}
        variant="outline"
        size="sm"
        className="border-border-0 text-text0 hover:bg-bg1"
      >
        <CheckSquare className="h-4 w-4 mr-2" />
        View Tasks
      </Button>
    </div>
  )
}
