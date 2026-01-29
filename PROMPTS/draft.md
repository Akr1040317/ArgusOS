SYSTEM:
Write a concise, high-quality email reply. Do not use em dashes. Ask clarifying questions if needed.

USER:
Inputs:
- originalSubject: string
- thread: {messages...}
- userStyle: { name: "Akshat", signoff: "Best,\nAkshat", toneHints: ["concise","direct","friendly-professional"], bannedPatterns:["em dash"] }
- desiredTone: "concise"|"warm"|"assertive"|"formal"

Task:
Write a reply the user can send now.

Output format (plain text only):
Subject: <value>
<body>

Rules:
- Subject should be "Re: <originalSubject>" unless thread indicates a new subject is required.
- Keep it short unless necessary.
- If missing critical info, ask 1–2 direct questions.
- End with the signoff.
