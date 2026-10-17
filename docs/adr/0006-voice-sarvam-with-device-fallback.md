# 0006 — Sarvam STT/TTS with on-device fallback and cached prompts
Status: Accepted · Date: 2026-10-18

## Context
Voice in Hindi, Marathi, Bengali and English for low-literacy users, on cheap phones with patchy data. Free credits only.

## Options
1. Sarvam APIs (Indian-language models) + device speech as fallback.
2. Device speech only (Android SpeechRecognizer / TTS).
3. Whisper via Groq for STT.

## Decision
Option 1. Pre-generate TTS audio for every fixed question × language once and ship it with the app.

## Why
- Sarvam is built for Indian languages and code-mixed speech; the fallback pattern is already proven in Krishi Mitr.
- Cached question audio means most "speaking" costs zero credits and works offline.

## Consequences
- Device recognition for Marathi/Bengali varies by phone and may need the network → the UI always offers big tap answers as well as voice.
- Free credits are finite → per-device daily cap on live STT calls; track the fallback rate as a metric.
- Audio is processed and discarded; never stored (PRIVACY-SECURITY.md).
