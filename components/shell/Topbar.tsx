"use client"

import { useState } from "react"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Play, User, Command } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface TopbarProps {
  onCommandPaletteOpen?: () => void
}

export function Topbar({ onCommandPaletteOpen }: TopbarProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleRunAgent = () => {
    // TODO: Implement in Phase 6
    console.log("Run agent now")
  }

  return (
    <div className="h-16 bg-panel border-b border-border-0 flex items-center justify-between px-6">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text2" />
          <Input
            type="search"
            placeholder="Search threads, events... (⌘K for commands)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-bg1 border-border-0 text-text0 placeholder:text-text2"
          />
          <button
            onClick={() => onCommandPaletteOpen?.()}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 rounded text-xs text-text2 hover:text-text0 hover:bg-bg1 border border-border-0"
            title="Command Palette (⌘K)"
          >
            <Command className="h-3 w-3" />
            <kbd className="hidden sm:inline font-mono">⌘K</kbd>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRunAgent}
          className="border-accentPurple text-accentPurple hover:bg-accentPurple/10"
        >
          <Play className="h-4 w-4 mr-2" />
          Run agent now
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-accentBlue text-bg0">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-panel border-border-0">
            <DropdownMenuItem onClick={handleSignOut} className="text-text0 hover:bg-bg1">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
