import { NextRequest, NextResponse } from "next/server"
import { OAuth2Client } from "google-auth-library"
import { google } from "googleapis"
import { storeGmailTokens } from "@/lib/gmail/tokenStore"
import { storeCalendarTokens } from "@/lib/calendar/tokenStore"
import { adminDb } from "@/lib/firebase/admin"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const state = searchParams.get("state") // This is the UID

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard/settings?error=oauth_failed`
      )
    }

    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/integrations/google/callback`
    )

    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard/settings?error=no_tokens`
      )
    }

    // Set credentials on the OAuth2Client so we can use it for API calls
    oauth2Client.setCredentials(tokens)

    // Get user email from Gmail API
    const gmail = google.gmail({ version: "v1", auth: oauth2Client })
    const profile = await gmail.users.getProfile({ userId: "me" })
    const email = profile.data.emailAddress

    if (!email) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard/settings?error=no_email`
      )
    }

    // Store Gmail tokens
    await storeGmailTokens(state, email, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date || Date.now() + 3600 * 1000,
    })

    // Store Calendar tokens (same tokens work for both APIs)
    const expiresIn = tokens.expiry_date 
      ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
      : 3600
    await storeCalendarTokens(
      state,
      email,
      tokens.access_token,
      tokens.refresh_token,
      expiresIn
    )

    // Get current historyId for watch setup
    const profileResponse = await gmail.users.getProfile({ userId: "me" })
    const currentHistoryId = profileResponse.data.historyId

    // Store initial historyId
    await adminDb.collection("integrations").doc(state).set(
      {
        gmail: {
          watch: {
            [email]: {
              lastProcessedHistoryId: currentHistoryId || "",
            },
          },
        },
      },
      { merge: true }
    )

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard/settings?connected=gmail`
    )
  } catch (error: any) {
    console.error("OAuth callback error:", error)
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    })
    // Include error message in redirect for debugging
    const errorMsg = encodeURIComponent(error.message || "Unknown error")
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard/settings?error=oauth_error&details=${errorMsg}`
    )
  }
}
