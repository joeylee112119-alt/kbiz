# Security

- Standard OpenAI API keys never ship to mobile.
- JWT access tokens are short-lived; refresh tokens rotate and are stored hashed.
- Push payloads avoid transcript or sensitive learner data.
- Logs mask tokens, API keys, raw audio references, and sensitive fields.
- Admin APIs require RBAC and audit logging.
- Webhooks require signature verification and replay protection.
- Object storage access uses signed URLs.
- Request validation happens at API boundaries.
- SSRF protection is required for URL ingestion and uploads.
- Production CORS is allowlist-only.
- Rate limiting protects auth, Realtime, and billing endpoints.
- User data export, transcript deletion, learning-history deletion, and account deletion are product requirements.
