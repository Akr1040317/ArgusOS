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
      threads: response.data.threads || [],
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
}
