/**
 * JSON schemas for AI pipeline outputs
 */

export interface ClassificationResult {
  importanceScore: number
  priority: "P0" | "P1" | "P2"
  split: "VIP" | "FINANCE" | "HIRING" | "STARTUP" | "NEWSLETTERS" | "RECEIPTS" | "FYI" | "OTHER"
  status: "NEEDS_REPLY" | "WAITING" | "FYI"
  reasons: string[]
}

export interface ExtractionResult {
  extractedAsk: string
  openLoops: string[]
  deadlines: Array<{
    label: string
    dateISO: string | null
    confidence: number
  }>
  tasks: Array<{
    type: "REPLY" | "FOLLOW_UP" | "SEND_DOC" | "SCHEDULE" | "REVIEW" | "PAY" | "DECIDE" | "OTHER"
    label: string
    dueISO: string | null
    confidence: number
  }>
}

export interface SummarizationResult {
  bullets: string[]
  ask: string
  openLoops: string[]
}

/**
 * Validate classification result
 */
export function validateClassification(result: any): ClassificationResult {
  if (!result || typeof result !== "object") {
    throw new Error("Invalid classification result: not an object")
  }

  if (typeof result.importanceScore !== "number" || result.importanceScore < 0 || result.importanceScore > 1) {
    throw new Error("Invalid importanceScore: must be number between 0 and 1")
  }

  if (!["P0", "P1", "P2"].includes(result.priority)) {
    throw new Error(`Invalid priority: ${result.priority}`)
  }

  if (!["VIP", "FINANCE", "HIRING", "STARTUP", "NEWSLETTERS", "RECEIPTS", "FYI", "OTHER"].includes(result.split)) {
    throw new Error(`Invalid split: ${result.split}`)
  }

  if (!["NEEDS_REPLY", "WAITING", "FYI"].includes(result.status)) {
    throw new Error(`Invalid status: ${result.status}`)
  }

  if (!Array.isArray(result.reasons)) {
    throw new Error("Invalid reasons: must be array")
  }

  return result as ClassificationResult
}

/**
 * Validate extraction result
 */
export function validateExtraction(result: any): ExtractionResult {
  if (!result || typeof result !== "object") {
    throw new Error("Invalid extraction result: not an object")
  }

  if (typeof result.extractedAsk !== "string") {
    throw new Error("Invalid extractedAsk: must be string")
  }

  if (!Array.isArray(result.openLoops)) {
    throw new Error("Invalid openLoops: must be array")
  }

  if (!Array.isArray(result.deadlines)) {
    throw new Error("Invalid deadlines: must be array")
  }

  if (!Array.isArray(result.tasks)) {
    throw new Error("Invalid tasks: must be array")
  }

  return result as ExtractionResult
}
