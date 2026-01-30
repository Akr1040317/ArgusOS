"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Send, Save, ChevronDown, ChevronUp, Loader2 } from "lucide-react"

interface EmailComposerProps {
  open: boolean
  onClose: () => void
  threadId?: string
  initialTo?: string[]
  initialSubject?: string
  initialBody?: string
  onSent?: () => void
  onDraftSaved?: () => void
}

interface GmailAccount {
  accountId: string
  email: string
}

export function EmailComposer({
  open,
  onClose,
  threadId,
  initialTo = [],
  initialSubject = "",
  initialBody = "",
  onSent,
  onDraftSaved,
}: EmailComposerProps) {
  const [user] = useAuthState(auth)
  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>("")
  const [to, setTo] = useState<string[]>(initialTo)
  const [toInput, setToInput] = useState<string>("")
  const [showCc, setShowCc] = useState(false)
  const [cc, setCc] = useState<string[]>([])
  const [ccInput, setCcInput] = useState<string>("")
  const [showBcc, setShowBcc] = useState(false)
  const [bcc, setBcc] = useState<string[]>([])
  const [bccInput, setBccInput] = useState<string>("")
  const [subject, setSubject] = useState<string>(initialSubject)
  const [body, setBody] = useState<string>(initialBody)
  const [sending, setSending] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)

  useEffect(() => {
    if (open && user) {
      fetchGmailAccounts()
      setTo(initialTo)
      setSubject(initialSubject)
      setBody(initialBody)
    }
  }, [open, user, initialTo, initialSubject, initialBody])

  const fetchGmailAccounts = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/integrations/gmail/accounts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.accounts && data.accounts.length > 0) {
        setGmailAccounts(data.accounts)
        setSelectedAccount(data.accounts[0].accountId)
      }
    } catch (error) {
      console.error("Error fetching Gmail accounts:", error)
    }
  }

  const addEmailToList = (email: string, list: string[], setList: (emails: string[]) => void) => {
    const trimmed = email.trim()
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed])
    }
  }

  const removeEmailFromList = (email: string, list: string[], setList: (emails: string[]) => void) => {
    setList(list.filter((e) => e !== email))
  }

  const handleSend = async () => {
    if (!user || !selectedAccount || to.length === 0 || !subject.trim() || !body.trim()) {
      alert("Please fill in all required fields (To, Subject, Body)")
      return
    }

    setSending(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId: selectedAccount,
          to,
          cc: cc.length > 0 ? cc : undefined,
          bcc: bcc.length > 0 ? bcc : undefined,
          subject,
          body,
          threadId,
        }),
      })

      const data = await response.json()
      if (data.success) {
        onSent?.()
        onClose()
        // Reset form
        setTo([])
        setCc([])
        setBcc([])
        setSubject("")
        setBody("")
      } else {
        throw new Error(data.error || "Failed to send email")
      }
    } catch (error: any) {
      console.error("Error sending email:", error)
      alert(`Error sending email: ${error.message || "Unknown error"}`)
    } finally {
      setSending(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!user || !selectedAccount || to.length === 0 || !subject.trim() || !body.trim()) {
      alert("Please fill in all required fields (To, Subject, Body)")
      return
    }

    setSavingDraft(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/email/draft/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId: selectedAccount,
          to,
          cc: cc.length > 0 ? cc : undefined,
          bcc: bcc.length > 0 ? bcc : undefined,
          subject,
          body,
          threadId,
        }),
      })

      const data = await response.json()
      if (data.success) {
        onDraftSaved?.()
        onClose()
      } else {
        throw new Error(data.error || "Failed to save draft")
      }
    } catch (error: any) {
      console.error("Error saving draft:", error)
      alert(`Error saving draft: ${error.message || "Unknown error"}`)
    } finally {
      setSavingDraft(false)
    }
  }

  if (!open) return null

  const selectedAccountEmail = gmailAccounts.find((a) => a.accountId === selectedAccount)?.email || ""

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl max-h-[90vh] bg-panel border border-border-0 rounded-lg shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-0">
          <h2 className="text-lg font-semibold text-text0">
            {threadId ? "Reply" : "Compose Email"}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* From */}
          {gmailAccounts.length > 1 && (
            <div>
              <label className="text-xs text-text2 mb-1 block">From</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full h-9 rounded-md border border-border-0 bg-bg0 px-3 text-text0 text-sm focus:outline-none focus:ring-2 focus:ring-accentBlue"
              >
                {gmailAccounts.map((account) => (
                  <option key={account.accountId} value={account.accountId}>
                    {account.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* To */}
          <div>
            <label className="text-xs text-text2 mb-1 block">To *</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {to.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-accentBlue/10 text-accentBlue text-sm"
                >
                  {email}
                  <button
                    onClick={() => removeEmailFromList(email, to, setTo)}
                    className="hover:text-accentBlue/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <Input
              type="email"
              placeholder="Recipients (press Enter to add)"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault()
                  addEmailToList(toInput, to, setTo)
                  setToInput("")
                }
              }}
              className="bg-bg0 border-border-0 text-text0"
            />
          </div>

          {/* CC */}
          <div>
            <button
              onClick={() => setShowCc(!showCc)}
              className="text-xs text-accentBlue hover:text-accentBlue/70 flex items-center gap-1 mb-1"
            >
              {showCc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Cc
            </button>
            {showCc && (
              <>
                <div className="flex flex-wrap gap-2 mb-2">
                  {cc.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-accentPurple/10 text-accentPurple text-sm"
                    >
                      {email}
                      <button
                        onClick={() => removeEmailFromList(email, cc, setCc)}
                        className="hover:text-accentPurple/70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <Input
                  type="email"
                  placeholder="Cc (press Enter to add)"
                  value={ccInput}
                  onChange={(e) => setCcInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault()
                      addEmailToList(ccInput, cc, setCc)
                      setCcInput("")
                    }
                  }}
                  className="bg-bg0 border-border-0 text-text0"
                />
              </>
            )}
          </div>

          {/* BCC */}
          <div>
            <button
              onClick={() => setShowBcc(!showBcc)}
              className="text-xs text-accentBlue hover:text-accentBlue/70 flex items-center gap-1 mb-1"
            >
              {showBcc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Bcc
            </button>
            {showBcc && (
              <>
                <div className="flex flex-wrap gap-2 mb-2">
                  {bcc.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-accentPurple/10 text-accentPurple text-sm"
                    >
                      {email}
                      <button
                        onClick={() => removeEmailFromList(email, bcc, setBcc)}
                        className="hover:text-accentPurple/70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <Input
                  type="email"
                  placeholder="Bcc (press Enter to add)"
                  value={bccInput}
                  onChange={(e) => setBccInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault()
                      addEmailToList(bccInput, bcc, setBcc)
                      setBccInput("")
                    }
                  }}
                  className="bg-bg0 border-border-0 text-text0"
                />
              </>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs text-text2 mb-1 block">Subject *</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="bg-bg0 border-border-0 text-text0"
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs text-text2 mb-1 block">Message *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={12}
              className="w-full rounded-md border border-border-0 bg-bg0 px-3 py-2 text-text0 text-sm focus:outline-none focus:ring-2 focus:ring-accentBlue resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border-0">
          <div className="text-xs text-text2">
            {selectedAccountEmail && `From: ${selectedAccountEmail}`}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={savingDraft || sending}
              className="border-border-0 text-text1 hover:bg-bg1"
            >
              {savingDraft ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </>
              )}
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || savingDraft}
              className="bg-accentBlue hover:bg-accentBlue/90 text-bg0"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
