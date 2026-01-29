/**
 * Generate consistent colors for email accounts
 * Each account gets a unique color based on its accountId
 */

const ACCOUNT_COLORS = [
  { bg: "bg-blue-400/20", text: "text-blue-300", border: "border-blue-400/30" },
  { bg: "bg-purple-400/20", text: "text-purple-300", border: "border-purple-400/30" },
  { bg: "bg-pink-400/20", text: "text-pink-300", border: "border-pink-400/30" },
  { bg: "bg-green-400/20", text: "text-green-300", border: "border-green-400/30" },
  { bg: "bg-yellow-400/20", text: "text-yellow-300", border: "border-yellow-400/30" },
  { bg: "bg-orange-400/20", text: "text-orange-300", border: "border-orange-400/30" },
  { bg: "bg-cyan-400/20", text: "text-cyan-300", border: "border-cyan-400/30" },
  { bg: "bg-indigo-400/20", text: "text-indigo-300", border: "border-indigo-400/30" },
  { bg: "bg-red-400/20", text: "text-red-300", border: "border-red-400/30" },
  { bg: "bg-teal-400/20", text: "text-teal-300", border: "border-teal-400/30" },
]

/**
 * Get a consistent color for an account based on its accountId
 */
export function getAccountColor(accountId: string): {
  bg: string
  text: string
  border: string
} {
  // Simple hash function to get consistent index
  let hash = 0
  for (let i = 0; i < accountId.length; i++) {
    const char = accountId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  const index = Math.abs(hash) % ACCOUNT_COLORS.length
  return ACCOUNT_COLORS[index]
}

/**
 * Get account display name (shortened email)
 */
export function getAccountDisplayName(accountId: string): string {
  return accountId.split("@")[0]
}
