/**
 * Safely parse Firestore timestamp to Date
 * Handles multiple timestamp formats from Firestore
 */
export function parseFirestoreTimestamp(timestamp: any): Date | null {
  if (!timestamp) return null

  // Firestore Timestamp object with seconds property
  if (timestamp.seconds !== undefined) {
    return new Date(timestamp.seconds * 1000)
  }

  // Already a Date object
  if (timestamp instanceof Date) {
    return timestamp
  }

  // String ISO date
  if (typeof timestamp === "string") {
    const date = new Date(timestamp)
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  // Firestore Timestamp object with toDate method
  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate()
  }

  // Try to parse as number (milliseconds)
  if (typeof timestamp === "number") {
    const date = new Date(timestamp)
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  return null
}
