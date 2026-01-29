import { chatCompletion } from "./client"

export interface FollowUpDraft {
  subject: string
  text: string
  tone: string
}

export interface EventData {
  title: string
  description?: string
  startISO: string
  endISO?: string
  attendees: Array<{ email: string; name?: string }>
  location?: string
  organizer?: { email: string; name?: string }
}

/**
 * Generate a follow-up email draft after a meeting
 */
export async function generateFollowUpDraft(
  event: EventData,
  userStyle?: {
    name: string
    signoff: string
    toneHints: string[]
    bannedPatterns: string[]
  }
): Promise<FollowUpDraft> {
  const tone = "warm" // Follow-ups are typically warm/concise

  const systemPrompt = `You are an email assistant that generates professional follow-up emails after meetings. Return only the email content in this exact format:

Subject: <subject line>

<body text>

Do not include any other text or explanation.`

  const style = userStyle || {
    name: "User",
    signoff: "Best regards",
    toneHints: ["concise", "warm"],
    bannedPatterns: [],
  }

  let userPrompt = `Generate a follow-up email after this meeting:

Meeting: ${event.title}
Date: ${new Date(event.startISO).toLocaleString()}
${event.description ? `Description: ${event.description}` : ""}
Attendees: ${event.attendees.map((a) => a.name || a.email).join(", ")}

User style:
- Name: ${style.name}
- Signoff: ${style.signoff}
- Tone hints: ${style.toneHints.join(", ")}
${style.bannedPatterns.length > 0 ? `- Avoid: ${style.bannedPatterns.join(", ")}` : ""}

Generate a ${tone} follow-up email that:
- Thanks attendees for their time
- Summarizes key action items or next steps (if any)
- Is concise and professional
- Uses the user's preferred signoff`

  try {
    const response = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      "gpt-4o-mini",
      0.7,
      600
    )

    // Parse the draft format: Subject: ... \n <body>
    const subjectMatch = response.match(/Subject:\s*(.+?)(?:\n|$)/i)
    const subject = subjectMatch ? subjectMatch[1].trim() : `Follow-up: ${event.title}`
    const body = response
      .replace(/Subject:\s*.+?(?:\n|$)/i, "")
      .trim()

    return {
      subject,
      text: body,
      tone,
    }
  } catch (error: any) {
    console.error("Follow-up draft generation error:", error)
    // Return default draft
    return {
      subject: `Follow-up: ${event.title}`,
      text: `Hi everyone,\n\nThank you for your time today. I wanted to follow up on our discussion.\n\n${style.signoff}\n${style.name}`,
      tone,
    }
  }
}
