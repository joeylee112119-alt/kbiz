# Product Spec

AI 전화영어 helps adult Korean learners practice English by receiving scheduled AI tutor calls. The product loop is onboarding, preference setup, tutor selection, call schedule, trial call, subscription, scheduled call, 15-minute lesson, report, review, and next call.

## Core Screens

- Onboarding: 19 steps covering variant, tutor, voice preview, CEFR level, goals, difficulty, correction style, interests, availability, permissions, consent, trial, result, and subscription.
- Home: greeting, streak, next call, tutor, topic, start-now, reschedule, snooze, recent report, review expressions, pronunciation, saved expressions, weekly learning.
- Lesson: stage, remaining time, progress, connection state, material card, target expressions, captions, corrections, mute, speaker, captions, slow down, repeat, hint, keyboard input, end.
- Result: goal score, speaking ratio, good expressions, new vocabulary, top corrections, fluency, grammar, vocabulary, pronunciation if supported, streak, next call.
- Practice: free talk, recent review, pronunciation, saved expressions, vocabulary, correction replay, summary.
- Profile: learner settings, tutor, schedule, streak, lesson count, speaking time, expressions, growth, subscription.

## State Machines

App state is server-authoritative:

`ONBOARDING -> TRIAL_READY -> TRIAL_CALL -> TRIAL_RESULT -> SUBSCRIPTION -> HOME -> CALL_SCHEDULED -> CALL_RINGING -> CALL_CONNECTING -> LESSON_ACTIVE -> LESSON_FINISHING -> RESULT_GENERATING -> RESULT -> REVIEW -> HOME`

Lesson stages:

`CHECK_IN -> WARM_UP -> TARGET_PHRASES -> GUIDED_ROLEPLAY -> FREE_TALK -> CORRECTION -> WRAP_UP -> COMPLETED`
