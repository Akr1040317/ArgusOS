"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Inbox, 
  Calendar, 
  CheckSquare, 
  MessageSquare, 
  Settings 
} from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Command Center", href: "/dashboard", icon: LayoutDashboard },
  { name: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { name: "Tasks", href: "/dashboard/tasks", icon: CheckSquare },
  { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-panel border-r border-border-0 h-screen flex flex-col">
      <div className="p-6 border-b border-border-0">
        <h1 className="text-xl font-bold bg-gradient-to-r from-accentBlue via-accentPurple to-accentPink bg-clip-text text-transparent">
          ArgusOS
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/dashboard" && pathname?.startsWith(item.href))
          const Icon = item.icon
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-accentBlue/20 text-accentBlue border-l-2 border-accentBlue"
                  : "text-text1 hover:bg-bg1 hover:text-text0"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
