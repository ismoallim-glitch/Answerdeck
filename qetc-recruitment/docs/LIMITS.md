# Free-tier limits and honest caveats

Everything here costs USD 0, but "free" comes with limits. Google can change these numbers, so check the current values at <https://developers.google.com/apps-script/guides/services/quotas>. The figures below are the published limits for free (consumer) Google accounts.

## Google Apps Script (free Gmail account)

| Limit | Value | Our usage |
|---|---|---|
| Max time per run | 6 minutes | discovery stops itself at 4.5 min |
| Total time for automatic jobs | 90 minutes/day | ~12 discovery runs × ~0.5–1 min, plus health checks and the digest ≈ 10–20 min/day |
| URL fetches | 20,000/day | ~12 runs × ~10 sources ≈ 120–250/day |
| Email recipients | 100/day | ≤ 3 discovery alerts per run, 1 digest, and 2 emails per enquiry (yours + the student's) |
| Triggers | 20 per script | we use 4 |

**If enquiries take off (around 35 or more a day),** the 100-email limit becomes the bottleneck. Discovery alerts stop first (the system checks the remaining quota before sending), and enquiries are **still saved** even when email can't be sent. A test proves this. You can then lower `MAX_IMMEDIATE_ALERTS_PER_RUN` or move to Google Workspace (paid, 1,500 emails/day).

## Discovery sources

| Source | Status | Notes |
|---|---|---|
| **Google Alerts RSS** | ✅ free, permitted (RSS is meant for feed readers) | Your main source. Covers search-engine-indexed public pages, forums and Q&A sites. Google decides what to include, so volume varies. |
| **Stack Exchange API** | ✅ free, explicitly permitted | 300 requests/day per IP without a key, and Google's servers share IPs with other users, so register a free key for 10,000/day. Few posts there are student enquiries, so expect a small number of leads. |
| **Reddit** | ⚠️ off by default | Reddit's robots.txt and API terms don't allow unapproved automated access. The system only uses the **official API with approved credentials**. Approval isn't guaranteed, and commercial use may need an agreement with Reddit. |
| **Facebook groups / profiles** | ❌ not automated | Meta offers no permitted API for searching public group posts, and scraping is forbidden. Join relevant groups yourself and take part by hand, following group rules. |
| **Google Custom Search API** | ❌ not used | Google closed it to new customers, so it isn't a dependable free option. |
| **Quora, TikTok, Instagram, X** | ❌ not automated | No permitted free API for this. Google Alerts sometimes surfaces their public pages. |

**Realistic expectation:** automated discovery finds conversations; it doesn't create students. Most enquiries will probably come from you replying helpfully in public, people visiting the website, and word of mouth. The system makes sure none of them are lost or forgotten.

## Things that cannot be free

- **Automated WhatsApp messaging.** The WhatsApp Business API is paid. The system uses free click-to-chat links instead, so you reply from your own WhatsApp.
- **LLM-quality chat.** The assistant is rule-based (free and predictable). Free AI tiers exist (e.g. Google AI Studio), but free tiers may use submitted data to improve their products, which isn't appropriate for students' personal data. Revisit this if you later pay for a tier with proper data terms.
- **A custom domain** (e.g. `studyinmalaysiawithismail.com`) costs about USD 10–15/year. The free `*.netlify.app` or `*.pages.dev` address works fine.

## Other notes

- The admin dashboard is protected by a secret link, not a login. Keep the link private. To reset it, delete `ADMIN_KEY` in Script Properties and re-run setup.
- Apps Script web apps show a small Google banner on the dashboard page. That is normal.
- Google Sheets holds up to 10 million cells, which is plenty for many years of leads.
