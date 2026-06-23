# OpenAI Setup

Set:

```bash
OPENAI_API_KEY=...
OPENAI_REALTIME_MODEL=gpt-realtime-2
OPENAI_REALTIME_VOICE=marin
OPENAI_ANALYSIS_MODEL=gpt-5.5-mini
MOCK_REALTIME=false
```

Server responsibilities:

- Add `OpenAI-Safety-Identifier` using a hashed internal user ID.
- Call `/v1/realtime/calls` for unified SDP or `/v1/realtime/client_secrets` for ephemeral secrets.
- Validate tool calls before mutating lesson state.
- Keep transcript/report analysis behind schema validation.

References:

- https://developers.openai.com/api/docs/guides/realtime
- https://developers.openai.com/api/docs/guides/realtime-webrtc
- https://developers.openai.com/api/reference/resources/realtime
