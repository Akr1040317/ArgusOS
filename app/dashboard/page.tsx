"use client"

import { CommandCenter } from "@/components/dashboard/CommandCenter"
import { AIBrief } from "@/components/dashboard/AIBrief"
import { QuickActions } from "@/components/dashboard/QuickActions"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text0">Dashboard</h1>
        <p className="text-text1 mt-2">Your command center and overview</p>
      </div>

      {/* AI Brief - Full width, prominent */}
      <AIBrief />

      {/* Quick Actions Bar */}
      <QuickActions />

      {/* Command Center Digest Sections */}
      <CommandCenter />
    </div>
  )
}
