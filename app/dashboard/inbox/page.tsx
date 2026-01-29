"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { ThreadList } from "@/components/inbox/ThreadList"
import { ThreadViewer } from "@/components/inbox/ThreadViewer"
import { AccountFilter } from "@/components/inbox/AccountFilter"
import { Inbox, Settings, X, Menu, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ResizablePanel, ResizableContainer } from "@/components/ui/resizable"

export default function InboxPage() {
  const searchParams = useSearchParams()
  const threadParam = searchParams.get("thread")
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(threadParam)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showThreadList, setShowThreadList] = useState(true)
  
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
                  <button className="w-full text-left px-3 py-2 rounded-lg bg-accentBlue/20 text-accentBlue font-medium text-sm">
                    All
                  </button>
                  <div className="text-xs text-text2 mt-4 mb-2 px-3">Coming Soon</div>
                  <button className="w-full text-left px-3 py-2 rounded-lg text-text2 hover:bg-bg1 text-sm" disabled>
                    VIP
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-lg text-text2 hover:bg-bg1 text-sm" disabled>
                    Needs Reply
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-lg text-text2 hover:bg-bg1 text-sm" disabled>
                    Waiting on Them
                  </button>
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
        {showThreadList ? (
          <ResizablePanel
            defaultWidth={threadListWidth}
            minWidth={250}
            maxWidth={600}
            onResize={setThreadListWidth}
            className={cn(
              "border-r border-border-0 bg-bg0 flex flex-col overflow-hidden",
              selectedThreadId && "hidden md:flex"
            )}
          >
            <ThreadList 
              onThreadSelect={(id) => {
                setSelectedThreadId(id)
                setShowThreadList(false)
              }} 
              selectedThreadId={selectedThreadId || undefined}
              accountIdFilter={selectedAccountId}
            />
          </ResizablePanel>
        ) : selectedThreadId ? (
          <div className="flex items-center border-r border-border-0 bg-bg0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowThreadList(true)}
              className="h-full px-2"
              title="Show thread list"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

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
              {!showThreadList && (
                <div className="hidden md:flex items-center p-2 border-b border-border-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowThreadList(true)}
                    className="h-8"
                    title="Show thread list"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Threads
                  </Button>
                </div>
              )}
            </>
          )}
          <ThreadViewer threadId={selectedThreadId} />
        </div>
      </ResizableContainer>
    </div>
  )
}
