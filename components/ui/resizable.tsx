"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

interface ResizablePanelProps {
  children: React.ReactNode
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  onResize?: (width: number) => void
  className?: string
}

export function ResizablePanel({
  children,
  defaultWidth = 300,
  minWidth = 200,
  maxWidth = 800,
  onResize,
  className,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return
      
      const container = panelRef.current.parentElement
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const newWidth = e.clientX - containerRect.left

      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
      setWidth(clampedWidth)
      onResize?.(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing, minWidth, maxWidth, onResize])

  return (
    <div
      ref={panelRef}
      className={cn("relative flex-shrink-0", className)}
      style={{ width: `${width}px` }}
    >
      {children}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-accentBlue/50 transition-colors z-10 group",
          isResizing && "bg-accentBlue w-1.5"
        )}
      >
        <div className="absolute inset-y-0 -right-1 w-3" />
      </div>
    </div>
  )
}

interface ResizableContainerProps {
  children: React.ReactNode
  className?: string
}

export function ResizableContainer({ children, className }: ResizableContainerProps) {
  return (
    <div className={cn("flex relative", className)}>
      {children}
    </div>
  )
}
