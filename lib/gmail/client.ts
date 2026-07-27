import { OAuth2Client } from "google-auth-library"
import { google } from "googleapis"

export interface GmailThread {
  id: string
  snippet: string
  historyId: string
  messages: GmailMessage[]
}

export interface GmailMessage {
  id: string
  threadId: string
  snippet: string
  payload: {
    headers: Array<{ name: string; value: string }>
    body: {
      data?: string
      size?: number
    }
    parts?: Array<{
      mimeType: string
      body: { data?: string }
      parts?: Array<{ mimeType: string; body: { data?: string } }>
    }>
  }
  internalDate: string
}

export class GmailClient {
  private oauth2Client: OAuth2Client
  public gmail: ReturnType<typeof google.gmail>

  constructor(accessToken: string, refreshToken: string) {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/integrations/google/callback"
    )

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    this.gmail = google.gmail({ version: "v1", auth: this.oauth2Client })
  }

  async refreshAccessToken(): Promise<string> {
    const { credentials } = await this.oauth2Client.refreshAccessToken()
    if (!credentials.access_token) {
      throw new Error("Failed to refresh access token")
    }
    return credentials.access_token
  }

  async listThreads(maxResults: number = 500, q?: string): Promise<{ threads: Array<{ id: string }>; nextPageToken?: string }> {
    const response = await this.gmail.users.threads.list({
      userId: "me",
      maxResults,
      q,
    })

    return {
      threads: (response.data.threads || [])
        .filter((thread): thread is typeof thread & { id: string } => Boolean(thread.id))
        .map((thread) => ({ id: thread.id })),
      nextPageToken: response.data.nextPageToken || undefined,
    }
  }

  async getThread(threadId: string): Promise<GmailThread> {
    const response = await this.gmail.users.threads.get({
      userId: "me",
      id: threadId,
      format: "full",
    })

    const thread = response.data

    return {
      id: thread.id!,
      snippet: thread.snippet || "",
      historyId: thread.historyId || "",
      messages: (thread.messages || []).map((msg) => ({
        id: msg.id!,
        threadId: msg.threadId!,
        snippet: msg.snippet || "",
        payload: msg.payload as any,
        internalDate: msg.internalDate || "",
      })),
    }
  }

  async getMessage(messageId: string): Promise<GmailMessage> {
    const response = await this.gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    })

    const msg = response.data

    return {
      id: msg.id!,
      threadId: msg.threadId!,
      snippet: msg.snippet || "",
      payload: msg.payload as any,
      internalDate: msg.internalDate || "",
    }
  }

  decodeBody(body: { data?: string }): string {
    if (!body.data) return ""
    return Buffer.from(body.data, "base64").toString("utf-8")
  }

  extractTextFromPayload(payload: GmailMessage["payload"]): { text: string; html: string | null } {
    let text = ""
    let html: string | null = null

    if (payload.body?.data) {
      const bodyData = this.decodeBody(payload.body)
      // Check if it's HTML by looking for HTML tags
      if (bodyData.includes("<") && bodyData.includes(">")) {
        html = bodyData
      } else {
        text = bodyData
      }
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          text = this.decodeBody(part.body)
        }
        if (part.mimeType === "text/html" && part.body?.data) {
          html = this.decodeBody(part.body)
        }
        if (part.parts) {
          for (const subPart of part.parts) {
            if (subPart.mimeType === "text/plain" && subPart.body?.data && !text) {
              text = this.decodeBody(subPart.body)
            }
            if (subPart.mimeType === "text/html" && subPart.body?.data && !html) {
              html = this.decodeBody(subPart.body)
            }
          }
        }
      }
    }

    // If we have HTML but no plain text, try to extract text from HTML (basic)
    if (html && !text) {
      text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
    }

    return { text, html }
  }

  getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
    return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || ""
  }

  /**
   * Create RFC 2822 email format
   */
  private createEmailRaw(
    from: string,
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[],
    threadId?: string,
    inReplyTo?: string,
    references?: string
  ): string {
    const lines: string[] = []

    // Headers
    lines.push(`From: ${from}`)
    lines.push(`To: ${to.join(", ")}`)
    if (cc && cc.length > 0) {
      lines.push(`Cc: ${cc.join(", ")}`)
    }
    if (bcc && bcc.length > 0) {
      lines.push(`Bcc: ${bcc.join(", ")}`)
    }
    lines.push(`Subject: ${subject}`)
    lines.push(`Date: ${new Date().toUTCString()}`)
    lines.push(`MIME-Version: 1.0`)
    
    // Thread headers for replies
    if (threadId && inReplyTo) {
      lines.push(`In-Reply-To: ${inReplyTo}`)
    }
    if (threadId && references) {
      lines.push(`References: ${references}`)
    }

    // Body
    lines.push(`Content-Type: text/plain; charset=UTF-8`)
    lines.push(`Content-Transfer-Encoding: 7bit`)
    lines.push("")
    lines.push(body)

    return lines.join("\r\n")
  }

  /**
   * Send an email message
   */
  async sendMessage(
    from: string,
    to: string[],
    subject: string,
    body: string,
    options?: {
      cc?: string[]
      bcc?: string[]
      threadId?: string
      inReplyTo?: string
      references?: string
    }
  ): Promise<string> {
    const raw = this.createEmailRaw(
      from,
      to,
      subject,
      body,
      options?.cc,
      options?.bcc,
      options?.threadId,
      options?.inReplyTo,
      options?.references
    )

    const encoded = Buffer.from(raw)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")

    const response = await this.gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encoded,
        threadId: options?.threadId,
      },
    })

    return response.data.id || ""
  }

  /**
   * Create a draft email
   */
  async createDraft(
    from: string,
    to: string[],
    subject: string,
    body: string,
    options?: {
      cc?: string[]
      bcc?: string[]
      threadId?: string
      inReplyTo?: string
      references?: string
    }
  ): Promise<string> {
    const raw = this.createEmailRaw(
      from,
      to,
      subject,
      body,
      options?.cc,
      options?.bcc,
      options?.threadId,
      options?.inReplyTo,
      options?.references
    )

    const encoded = Buffer.from(raw)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")

    const response = await this.gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: {
          raw: encoded,
          threadId: options?.threadId,
        },
      },
    })

    return response.data.id || ""
  }

  /**
   * Send a draft email
   */
  async sendDraft(draftId: string): Promise<string> {
    const response = await this.gmail.users.drafts.send({
      userId: "me",
      requestBody: {
        id: draftId,
      },
    })

    return response.data.id || ""
  }
}
