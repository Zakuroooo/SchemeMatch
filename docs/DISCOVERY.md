# DISCOVERY — talk to real people before (and while) building
*The PRD's personas are guesses until someone who does this work confirms them. This doc is the evidence trail — the core of the FDE story: "I found a user, learned their workflow, shipped, iterated."*

## 1. Who to talk to (in order)
1. **Field workers who already do scheme screening** — NGO staff, ASHA workers, CSC (Common Service Centre) operators, college NSS volunteers. They see the real failure modes.
2. **Citizens** — only with a field worker or NSS unit present; never cold-approach vulnerable people alone.
3. **People building in this space** — public talks/blogs by Haqdarshak and similar orgs (read via Agent-Reach: web + YouTube subtitles), for context, not copying.

Target before Week 3 ends: **5 conversations** (target, not a promise).

## 2. Interview guide (30 min, field worker)
*Ask about the past, not hypotheticals. Don't pitch until the last 5 minutes.*
1. Walk me through the last family you helped with a scheme. What happened first?
2. How did you decide which schemes to check? What did you look at?
3. Where did it go wrong or take longest? (documents? eligibility doubt? office?)
4. How do you keep track of families you've screened? Show me if you can.
5. When is there no internet? What do you do then?
6. Which language do families speak with you? Do they read?
7. What would make you trust a tool's answer — or distrust it?
8. *(Last 5 min)* Show the demo. "What's wrong with this?"

## 3. Log template (one entry per conversation)
```
### YYYY-MM-DD — Role, org type, district (no names without permission)
Context: how I met them, how long
What they do today: …
Pain points (their words, quoted): …
Surprises / things that contradict the PRD: …
Decision this changes: PRD §…/ADR … (or "none yet")
Follow-up: …
```

## 4. Decision log
| Date | Learned | Changed |
|---|---|---|
| — | — | — |

## 5. Ethics
Ask permission to take notes; no recordings without consent; no personal details of families in this file; thank them, and share what you build back with them.

## 6. Pilot (FDE part)
If one org agrees: a 2-week pilot — onboarding session, a WhatsApp group for feedback, weekly 15-min check-in, every issue logged as a GitHub issue with label `pilot`. Metrics: screenings done, schemes matched per family, issues reported/fixed. Until a pilot happens, the README says **"built for"**, never **"used by"**.
