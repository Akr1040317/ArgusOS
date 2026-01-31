"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ThreadList } from "@/components/inbox/ThreadList"
import { ThreadViewer } from "@/components/inbox/ThreadViewer"
import { AccountFilter } from "@/components/inbox/AccountFilter"
import { EmailComposer } from "@/components/email/EmailComposer"
import { Inbox, Settings, X, Menu, ChevronLeft, ChevronRight, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ResizablePanel, ResizableContainer } from "@/components/ui/resizable"

export default function InboxPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const threadParam = searchParams.get("thread")
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(threadParam)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [selectedSplit, setSelectedSplit] = useState<string | null>("all") // "all" | "VIP" | "NEEDS_REPLY" | "WAITING" | "FINANCE" | "HIRING" | "STARTUP" | "NEWSLETTERS" | "RECEIPTS" | "FYI" | "OTHER"
  const [showSidebar, setShowSidebar] = useState(true)
  const [showThreadList, setShowThreadList] = useState(true) // Keep thread list visible by default
  const [showComposer, setShowComposer] = useState(false)

  // Check for compose query param
  useEffect(() => {
    const composeParam = searchParams.get("compose")
    if (composeParam === "true") {
      setShowComposer(true)
      // Clean up URL
      router.replace("/dashboard/inbox")
    }
  }, [searchParams, router])
  
  // Store panel widths in localStorage for persistence
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("inbox-sidebar-width")
      return saved ? parseInt(saved, 10) : 240
    }
    return 240
  })
  
  const [threadListWidth, setThreadListWidth] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("inbox-threadlist-width")
      return saved ? parseInt(saved, 10) : 380
    }
    return 380
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("inbox-sidebar-width", sidebarWidth.toString())
    }
  }, [sidebarWidth])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("inbox-threadlist-width", threadListWidth.toString())
    }
  }, [threadListWidth])

  // Handle thread query parameter
  useEffect(() => {
    const threadParam = searchParams.get("thread")
    if (threadParam && threadParam !== selectedThreadId) {
      setSelectedThreadId(threadParam)
      setShowThreadList(false) // Hide thread list when opening from link
    }
  }, [searchParams, selectedThreadId])

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-0 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Inbox className="h-5 w-5 text-accentBlue flex-shrink-0" />
          <h1 className="text-xl md:text-2xl font-bold text-text0 truncate">Inbox</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={() => setShowComposer(true)}
            className="bg-accentBlue hover:bg-accentBlue/90 text-bg0"
            size="sm"
          >
            <Mail className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Compose</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-border-0 text-text0"
            onClick={() => setShowSidebar(!showSidebar)}
            title={showSidebar ? "Collapse sidebar" : "Expand sidebar"}
          >
            {showSidebar ? (
              <>
                <Settings className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">Filters</span>
              </>
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 3-Pane Layout */}
      <ResizableContainer className="flex-1 overflow-hidden min-h-0">
        {/* Left: Account Filter + Splits Sidebar */}
        {showSidebar ? (
          <ResizablePanel
            defaultWidth={sidebarWidth}
            minWidth={180}
            maxWidth={400}
            onResize={setSidebarWidth}
            className="border-r border-border-0 bg-panel flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-2 border-b border-border-0">
              <span className="text-xs font-semibold text-text0 px-2">Filters</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(false)}
                className="h-6 w-6 p-0"
                title="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <AccountFilter selectedAccountId={selectedAccountId} onAccountChange={setSelectedAccountId} />
              <div className="p-4 border-t border-border-0">
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedSplit("all")}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg font-medium text-sm transition-colors",
                      selectedSplit === "all"
                        ? "bg-accentBlue/20 text-accentBlue"
                        : "text-text2 hover:bg-bg1"
                    )}
                  >
                    All
                  </button>
                  <div className="text-xs text-text2 mt-4 mb-2 px-3">Splits</div>
                  {[
                    { value: "VIP", label: "VIP" },
                    { value: "NEEDS_REPLY", label: "Needs Reply" },
                    { value: "WAITING", label: "Waiting on Them" },
                    { value: "FINANCE", label: "Finance" },
                    { value: "HIRING", label: "Hiring" },
                    { value: "STARTUP", label: "Startup" },
                    { value: "NEWSLETTERS", label: "Newsletters" },
                    { value: "RECEIPTS", label: "Receipts" },
                    { value: "FYI", label: "FYI" },
                    { value: "OTHER", label: "Other" },
                  ].map((split) => (
                    <button
                      key={split.value}
                      onClick={() => setSelectedSplit(split.value)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                        selectedSplit === split.value
                          ? "bg-accentBlue/20 text-accentBlue font-medium"
                          : "text-text2 hover:bg-bg1"
                      )}
                    >
                      {split.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ResizablePanel>
        ) : (
          <div className="flex items-center border-r border-border-0 bg-panel">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(true)}
              className="h-full px-2"
              title="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Center: Thread List */}
        <ResizablePanel
          defaultWidth={threadListWidth}
          minWidth={200}
          maxWidth={400}
          onResize={setThreadListWidth}
          className="border-r border-border-0 bg-bg0 flex flex-col overflow-hidden"
        >
          <ThreadList 
            onThreadSelect={(id) => {
              setSelectedThreadId(id)
              // Keep thread list visible - don't hide it
            }} 
            selectedThreadId={selectedThreadId || undefined}
            accountIdFilter={selectedAccountId}
            splitFilter={selectedSplit === "all" ? null : selectedSplit}
          />
        </ResizablePanel>

        {/* Right: Thread Viewer */}
        <div className={cn(
          "flex-1 flex flex-col overflow-hidden min-w-0",
          !selectedThreadId && "hidden md:flex"
        )}>
          {selectedThreadId && (
            <>
              <div className="md:hidden p-2 border-b border-border-0 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedThreadId(null)
                    setShowThreadList(true)
                  }}
                  className="h-8"
                >
                  <X className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </div>
            </>
          )}
          <ThreadViewer threadId={selectedThreadId} />
        </div>
      </ResizableContainer>

      {/* Email Composer */}
      <EmailComposer
        open={showComposer}
        onClose={() => setShowComposer(false)}
        onSent={() => {
          setShowComposer(false)
          // Thread list will auto-refresh via Firestore listener
        }}
        onDraftSaved={() => {
          setShowComposer(false)
        }}
      />
    </div>
  )
}
