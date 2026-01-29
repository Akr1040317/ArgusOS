import OpenAI from "openai"

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY not set. AI features will not work.")
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export async function chatCompletion(
  messages: ChatMessage[],
  model: string = "gpt-4o-mini",
  temperature: number = 0.3,
  maxTokens?: number,
  timeout: number = 30000 // 30 second timeout
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured")
  }

  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("OpenAI API request timed out")), timeout)
    })

    // Race between API call and timeout
    const response = await Promise.race([
      openai.chat.completions.create({
        model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature,
        max_tokens: maxTokens,
      }),
      timeoutPromise,
    ])

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error("No content in OpenAI response")
    }

    return content
  } catch (error: any) {
    console.error("OpenAI API error:", error)
    if (error.message?.includes("timed out")) {
      throw new Error("Draft generation timed out. Please try again.")
    }
    throw new Error(`OpenAI API error: ${error.message}`)
  }
}

/**
 * Parse JSON from AI response, with retry logic
 */
export async function parseJSONResponse<T>(
  content: string,
  retryPrompt?: string
): Promise<T> {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || content.match(/(\{[\s\S]*\})/)
  const jsonString = jsonMatch ? jsonMatch[1] : content

  try {
    return JSON.parse(jsonString) as T
  } catch (error) {
    // If retry prompt provided, try once more
    if (retryPrompt) {
      const fixedContent = await chatCompletion([
        { role: "system", content: retryPrompt },
        { role: "user", content: `Fix this JSON:\n${content}` },
      ])
      return parseJSONResponse<T>(fixedContent)
    }
    throw new Error(`Failed to parse JSON: ${error}`)
  }
}
