# How it works

## Architecture

```
 Students                          Google (free, runs 24/7)                       You
 ────────                          ─────────────────────────                      ───
 Website (Netlify/Cloudflare) ──►  Apps Script web app  ──► Google Sheet CRM  ──►  Email alerts
   • enquiry form                    doPost: validate, score,     • Students          • NEW QUALIFIED STUDENT!
   • chat assistant (in browser)       de-duplicate, save         • Opportunities     • daily summary
   • privacy / delete my data        doGet: private dashboard     • Commission        • error/health alerts
                                                                  • Dashboard
 Public web ◄── every 2 hours ──   runDiscovery (time trigger)    • System Log / Status   Private web dashboard
   Google Alerts RSS, Stack           fetch → classify → dedupe
   Exchange API, Reddit API*          → save → alert
```
\* Reddit only after Reddit approves your API access.

**Why this design:** Google Apps Script gives free scheduled jobs, free email and a free web endpoint, and it sits right next to Google Sheets, which you already know how to use. The website is a set of static files, so it can be hosted free anywhere and keeps working even if the backend has a problem (it then offers WhatsApp/email instead). No servers, databases or paid APIs are involved.

## The "AI" (free, rule-based)

No paid AI is used. Qualification and discovery use transparent keyword and pattern rules (`apps-script/Scoring.gs`). Every score comes with its reasons, so you can always see why a lead got its number.

### Enquiry lead score (0–100)

| Points | Signal |
|---|---|
| 10 | consent to be contacted |
| 15 | contact details given (email or WhatsApp) |
| 5 + 5 | country given; country is a priority market |
| 10 | highest qualification given |
| 10 | study level chosen |
| 10 | course given |
| 5 + 5 | intake given; intake within 12 months |
| 10 | budget given |
| 5 | chose to enquire about Malaysia |
| 10 | asked for accommodation, pickup or visa-process help |

Bands: **90–100 very high**, **70–89 high**, **40–69 moderate**, **0–39 low**.
Suggested status: score ≥ 90 with level, course, qualification and contact → **READY TO APPLY**; ≥ 70 → **QUALIFIED**; otherwise **ENQUIRY SUBMITTED**. You can change the status at any time with the drop-down in the sheet.

Missing information shows as "not provided". The system never guesses it.

### Discovery relevance score (0–100)

Adds points for: personal study intent ("I want to study…", "which country…", "finished high school…"), mentioning Malaysia, cost concerns, a study level, a course, a priority country, publicly asking for advice, and being recent. It subtracts points for adverts from other agents ("admissions open", "100% visa", "contact us"), academic-career topics (postdocs, journals) and posts older than 30 days.
Posts scoring below 45 aren't saved. Posts at 80 or above trigger an immediate email (at most 3 per run). Everything else appears in the daily summary.

### What is stored from public posts

Only the link, the title, a short excerpt with emails, phone numbers and usernames removed, and the score. No profiles, no contact details. A **draft public reply** is prepared for you to review and post yourself, following the community's rules. Nothing is ever posted or sent automatically.

## Chat assistant

It runs entirely in the visitor's browser (`website/assets/chat-engine.js`), so it is instant and costs nothing. It introduces itself as Ismail's virtual assistant and asks the 10 questions one at a time. It answers common questions from a fixed, checked knowledge base: costs, packages, visas, guarantees, accommodation, pickup, English tests and documents. It notes questions it can't answer for you to reply to. It refuses passport and card numbers, and only sends the enquiry after the visitor agrees to the privacy terms.

To change an answer, edit the `KB` list in `chat-engine.js`.

## Error handling

- Every HTTP call retries with backoff (and respects `Retry-After` on 429/5xx).
- A source that fails 3 runs in a row pauses for 12 hours, then retries automatically ("Paused Until" column).
- Each run stops safely after 4.5 minutes, staying under Apps Script's 6-minute limit. Remaining sources run next time.
- A lock stops two discovery runs overlapping.
- Error emails are throttled (at most one per error type every 3 hours).
- `healthCheck` emails you if discovery hasn't succeeded for about 5 hours.
- Each run writes a row to the **System Log** sheet, which keeps the latest ~3,000 rows.

## Statuses

NEW LEAD → INTERESTED → ENQUIRY SUBMITTED → CONSENT RECEIVED → QUALIFIED → READY TO APPLY → REFERRED TO QETC → APPLICATION SUBMITTED → ADMISSION OFFERED → ENROLLED → COMMISSION PENDING → COMMISSION PAID (or NOT INTERESTED)

## Commission (private)

When you set a student to **ENROLLED** or later, a row opens in **Commission (Private)** with USD 500 (`COMMISSION_PER_ENROLMENT_USD`). It only counts as **received** when you set *Eligibility Confirmed by QETC* = YES **and** *Payment Status* = PAID. The dashboard's "potential commission" (students offered admission or enrolled but not yet paid) is clearly labelled as not earned. None of this ever appears on the website or in student emails, and a test checks that.
