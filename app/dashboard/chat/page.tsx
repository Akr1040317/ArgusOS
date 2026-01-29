"use client"

import { ChatInterface } from "@/components/chat/ChatInterface"

export default function ChatPage() {
  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text0">Chat</h1>
        <p className="text-text1 mt-2">Query your inbox and calendar</p>
      </div>

      <ChatInterface />
    </div>
  )
}
