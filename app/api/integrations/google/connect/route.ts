import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { OAuth2Client } from "google-auth-library"

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
]

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Verify token
    let uid: string
    try {
      const decodedToken = await adminAuth.verifyIdToken(token)
      uid = decodedToken.uid
    } catch (error: any) {
      console.error("Token verification error:", error)
      // If Firebase Admin isn't set up, we can't verify tokens server-side
      // For now, return a helpful error
      return NextResponse.json(
        { 
          error: "Firebase Admin not configured. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.local",
          details: error.message 
        },
        { status: 500 }
      )
    }

    // Check required env vars
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { error: "Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local" },
        { status: 500 }
      )
    }

    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/integrations/google/callback`
    )

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
      state: uid, // Pass UID in state for callback
    })

    return NextResponse.json({ authUrl })
  } catch (error: any) {
    console.error("Error generating OAuth URL:", error)
    return NextResponse.json(
      { 
        error: error.message || "Internal server error",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
