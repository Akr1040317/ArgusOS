import { readFileSync } from "fs"
import { join } from "path"

const PROMPTS_DIR = join(process.cwd(), "PROMPTS")

export function loadPrompt(filename: string): string {
  try {
    return readFileSync(join(PROMPTS_DIR, filename), "utf-8")
  } catch (error) {
    console.error(`Error loading prompt ${filename}:`, error)
    throw new Error(`Failed to load prompt: ${filename}`)
  }
}

export function getClassifyPrompt(): string {
  return loadPrompt("classify.json.md")
}

export function getSummarizePrompt(): string {
  return loadPrompt("summarize.md")
}

export function getExtractPrompt(): string {
  return loadPrompt("extract.json.md")
}

export function getDraftPrompt(): string {
  return loadPrompt("draft.md")
}

export function getChatPrompt(): string {
  return loadPrompt("chat.md")
}
