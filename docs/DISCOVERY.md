# DISCOVERY — talk to real people before (and while) building
*The PRD's personas are guesses until someone who does this work confirms them. This doc is the evidence trail — the core of the FDE story: "I found a user, learned their workflow, shipped, iterated."*

## 0. Your kit: everything ready except the conversation itself
*Prepared by Claude on 2026-10-21. The conversations themselves must be real and must be yours: an invented interview would be a false claim, so nothing in this file is ever written for you.*

**Two-week plan:**

| Days | Do | Done when |
|---|---|---|
| 1–2 | Send the message below to **10–12** contacts from the list of places | 10 sent |
| 3–7 | Book calls (30 min, phone or video is fine) | 5 booked |
| 4–12 | Have the calls; take notes in your own words right after each one | 5 done |
| Same day as each call | Paste your raw notes in chat; I turn them into a log entry (no names) | entry in §3 |

Expect about 1 in 3 to reply, which is why you send 10–12 to get 5.

**Where to find people (organisations, not individuals):**
- **Your college NSS unit.** The programme officer often knows field camps (NSS: nss.gov.in).
- **CSC (Common Service Centre) operators** near you. Many help people apply for schemes every day. Find centres on the official locator, locator.csccloud.in.
- **NGOs** working on welfare access in Maharashtra or West Bengal: search the government's directory, ngodarpan.gov.in, by state and "social welfare".
- **ASHA / Anganwadi workers.** Go through the local health centre (PHC) or ICDS office, not by walking up to people.
- Never cold-approach citizens on your own (§1).

**First message (WhatsApp or email; send in the language they use):**

> *English:* Hello, I'm Pranay, a student building a free, open-source tool that helps people find government schemes they qualify for. I'm not selling anything. Could I ask you about your work for 20–30 minutes? I want to learn what goes wrong when families apply for schemes. Any day this week or next works for me. Thank you!
>
> *हिंदी:* नमस्ते, मैं प्रणय हूँ, एक छात्र। मैं एक मुफ़्त, ओपन-सोर्स टूल बना रहा हूँ जो लोगों को बताता है कि वे किन सरकारी योजनाओं के हक़दार हैं। मैं कुछ बेच नहीं रहा। क्या मैं आपके काम के बारे में 20–30 मिनट बात कर सकता हूँ? मैं समझना चाहता हूँ कि परिवारों को योजनाओं में आवेदन करते समय कहाँ दिक़्क़त आती है। इस हफ़्ते या अगले हफ़्ते कोई भी दिन चलेगा। धन्यवाद!
>
> *বাংলা:* নমস্কার, আমি প্রণয়, একজন ছাত্র। আমি একটি বিনামূল্যের, ওপেন-সোর্স টুল বানাচ্ছি, যা মানুষকে জানায় তারা কোন সরকারি প্রকল্পের যোগ্য। আমি কিছু বিক্রি করছি না। আপনার কাজ নিয়ে কি ২০–৩০ মিনিট কথা বলতে পারি? পরিবারগুলো প্রকল্পে আবেদন করতে গিয়ে কোথায় আটকে যায়, সেটা বুঝতে চাই। এই সপ্তাহ বা পরের সপ্তাহের যেকোনো দিন হলেই চলবে। ধন্যবাদ!

*(Read the Hindi and Bengali once before sending and fix anything that doesn't sound like you.)*

**First minute of every call (consent):** "Thank you. I'll take short written notes, not a recording, and I won't write your name or any family's details. Is that okay?" Continue only after a clear yes.

**During the call:** use the guide in §2. There's no app to show yet (the screen comes in Week 4), so skip question 8. Instead ask: "If a tool told a family *'you are likely eligible, because…'*, what would make you trust it?"

**Right after the call (5 minutes):** write down, in your own words:
- 3 things they said, word for word if you can;
- 1 thing that surprised you;
- what they do when there's no internet.

Paste that in chat and I'll file it (no names, no family details).

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
8. *(Last 5 min, once there's a screen to show, Week 4+)* Show the demo. "What's wrong with this?"

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
