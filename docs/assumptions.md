# Assumptions

- UI language is Korean, while tutor speech defaults to English.
- Default timezone for local development is `Asia/Seoul`.
- Default Realtime model is `gpt-realtime-2` and voice is `marin`, based on the current OpenAI Realtime guide.
- Default analysis model is `gpt-5.5-mini`; this is isolated behind `OPENAI_ANALYSIS_MODEL`.
- Production OpenAI calls use backend-held API keys only. Mobile receives a server-minted client secret or a server-returned SDP answer.
- Local development uses mock providers for Realtime, push, billing, pronunciation, and analytics.
- `LESSON_TIME_SCALE=0.02` is allowed only outside production.
- Pronunciation score is `null` unless a real pronunciation provider is configured.
- League functionality exists only as a disabled feature flag for MVP.
- Native iOS and Android call modules are integration stubs until Apple/Firebase credentials and device QA are available.
