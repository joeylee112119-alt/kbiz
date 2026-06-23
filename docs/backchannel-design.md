# Backchannel Design

Backchannels are short listening cues played separately from the main Realtime response. They are not inserted into assistant conversation history.

Allowed clips:

- `mm_hm_01`
- `mm_hm_02`
- `uh_huh_01`
- `uh_huh_02`
- `i_see_01`
- `right_01`
- `okay_01`

Rules:

- No cue before 1.8s of user speech.
- Minimum 4.5s between cues.
- Maximum two cues per user turn.
- Micro-pause must be 220-500ms.
- No cue on likely turn end, high noise, target phrase repetition, correction, pronunciation, or unstable network.
- Weighted random selection excludes recent clips.

Interruption classification combines transcript, duration, AI playback position, remaining audio, current stage, stop phrases, and confidence.
