"use client"

import { CommandCenter } from "@/components/dashboard/CommandCenter"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text0">Dashboard</h1>
        <p className="text-text1 mt-2">Command Center and overview</p>
      </div>

      <CommandCenter />
    </div>
  )
}
