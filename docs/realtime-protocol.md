# Realtime Protocol

OpenAI API keys stay on the backend. Mobile uses one of two server-mediated patterns:

1. Unified SDP: mobile sends SDP offer to `/v1/realtime/sessions`; backend forwards multipart `sdp` and `session` to `/v1/realtime/calls`; backend returns SDP answer.
2. Ephemeral client secret: backend calls `/v1/realtime/client_secrets`; mobile uses the secret for WebRTC.

Default session update:

```json
{
  "type": "session.update",
  "session": {
    "type": "realtime",
    "model": "gpt-realtime-2",
    "audio": {
      "output": { "voice": "marin" },
      "input": {
        "turn_detection": {
          "type": "semantic_vad",
          "eagerness": "low",
          "create_response": false,
          "interrupt_response": false
        }
      }
    }
  }
}
```

`create_response=false` lets the app and Lesson Orchestrator decide when a turn should generate an AI response. `interrupt_response=false` prevents short acknowledgements from cutting off tutor audio.

## WebRTC State

`IDLE -> TOKEN_LOADING -> PEER_CREATING -> OFFER_CREATED -> CONNECTING -> CONNECTED -> RECONNECTING -> DISCONNECTED -> FAILED -> CLOSED`
