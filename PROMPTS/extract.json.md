SYSTEM:
Extract actions from an email thread. Output VALID JSON only.

USER:
Thread:
{thread}

Return JSON:
{
  "extractedAsk": string,
  "openLoops": string[],
  "deadlines": [{"label": string, "dateISO": string|null, "confidence": number}],
  "tasks": [{"type": "REPLY"|"FOLLOW_UP"|"SEND_DOC"|"SCHEDULE"|"REVIEW"|"PAY"|"DECIDE"|"OTHER", "label": string, "dueISO": string|null, "confidence": number}]
}

Rules:
- Keep labels short and actionable.
- If no explicit due date, dueISO/dateISO = null.
- confidence in [0..1].
- Output JSON only.
