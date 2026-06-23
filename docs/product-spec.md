# Product Spec

AI 전화영어 helps adult Korean learners practice English through scheduled push reminders and learner-started AI tutor lessons. The product loop is onboarding, preference setup, tutor selection, lesson schedule, trial lesson, subscription, reminder, lesson ready screen, 15-minute lesson, report, review, and next reminder.

## Core Screens

- Onboarding: 19 steps covering variant, tutor, voice preview, CEFR level, goals, difficulty, correction style, interests, availability, permissions, consent, trial, result, and subscription.
- Home: greeting, streak, next scheduled lesson, tutor, topic, start-now, reschedule, snooze, recent report, review expressions, pronunciation, saved expressions, weekly learning.
- Lesson: stage, remaining time, progress, connection state, material card, target expressions, captions, corrections, mute, speaker, captions, slow down, repeat, hint, keyboard input, end.
- Result: goal score, speaking ratio, good expressions, new vocabulary, top corrections, fluency, grammar, vocabulary, pronunciation if supported, streak, next lesson.
- Practice: free talk, recent review, pronunciation, saved expressions, vocabulary, correction replay, summary.
- Profile: learner settings, tutor, schedule, streak, lesson count, speaking time, expressions, growth, subscription.

## State Machines

App state is server-authoritative:

`ONBOARDING -> TRIAL_READY -> TRIAL_LESSON -> TRIAL_RESULT -> SUBSCRIPTION -> HOME -> LESSON_SCHEDULED -> LESSON_READY -> LESSON_ACTIVE -> LESSON_FINISHING -> RESULT_GENERATING -> RESULT -> REVIEW -> HOME`

Lesson stages:

`CHECK_IN -> WARM_UP -> TARGET_PHRASES -> GUIDED_ROLEPLAY -> FREE_TALK -> CORRECTION -> WRAP_UP -> COMPLETED`
