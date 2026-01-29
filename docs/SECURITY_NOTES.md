# Security Notes

1) Authentication:
- Firebase Auth handles user authentication
- All dashboard routes require authenticated users
- Multiple users can sign up and use the application

2) Token storage:
- Do not store OAuth refresh tokens in Firestore.
- Store in Google Secret Manager (preferred) or encrypted in a single secret blob.
- Firestore stores secretRef only.

3) Sanitization:
- Store bodyText by default.
- If storing HTML, sanitize to prevent XSS.

4) Least privilege scopes:
- Gmail readonly scopes for reading
- Gmail modify only if you later implement archive/label
- Calendar readonly initially
