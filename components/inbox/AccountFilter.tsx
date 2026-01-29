"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/client"
import { cn } from "@/lib/utils"
import { Mail, CheckCircle2 } from "lucide-react"
import { getAccountColor } from "@/lib/utils/accountColors"

interface GmailAccount {
  accountId: string
  email: string
  status: string
  connectedAt: string
}

interface AccountFilterProps {
  selectedAccountId: string | null
  onAccountChange: (accountId: string | null) => void
}

export function AccountFilter({ selectedAccountId, onAccountChange }: AccountFilterProps) {
  const [user] = useAuthState(auth)
  const [accounts, setAccounts] = useState<GmailAccount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchAccounts = async () => {
      try {
        const token = await user.getIdToken()
        const response = await fetch("/api/integrations/gmail/accounts", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await response.json()
        if (data.accounts) {
          setAccounts(data.accounts)
        }
      } catch (error) {
        console.error("Error fetching Gmail accounts:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAccounts()
  }, [user])

  if (loading) {
    return (
      <div className="p-4 text-text2 text-sm">Loading accounts...</div>
    )
  }

  if (accounts.length === 0) {
    return null
  }

  return (
    <div className="p-3 md:p-4 border-b border-border-0 bg-panel">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="h-4 w-4 text-text2 flex-shrink-0" />
        <span className="text-xs font-semibold text-text2 uppercase tracking-wide">Accounts</span>
      </div>
      <div className="space-y-1">
        <button
          onClick={() => onAccountChange(null)}
          className={cn(
            "w-full text-left px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm transition-colors",
            selectedAccountId === null
              ? "bg-accentBlue/20 text-accentBlue font-medium"
              : "text-text2 hover:bg-bg1"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate">All Accounts</span>
            {selectedAccountId === null && (
              <CheckCircle2 className="h-3 w-3 ml-auto flex-shrink-0" />
            )}
          </div>
        </button>
        {accounts.map((account) => {
          const accountColor = getAccountColor(account.accountId)
          return (
            <button
              key={account.accountId}
              onClick={() => onAccountChange(account.accountId)}
              className={cn(
                "w-full text-left px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm transition-colors",
                selectedAccountId === account.accountId
                  ? "bg-accentBlue/20 text-accentBlue font-medium"
                  : "text-text2 hover:bg-bg1"
              )}
            >
            <div className="flex items-center gap-2 min-w-0">
              <div className={cn(
                "h-2.5 w-2.5 rounded-full flex-shrink-0 border",
                accountColor.bg,
                accountColor.border
              )} />
              <span className="truncate min-w-0">{account.email}</span>
              {selectedAccountId === account.accountId && (
                <CheckCircle2 className="h-3 w-3 ml-auto flex-shrink-0" />
              )}
            </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
