# Privacy, platform rules and safeguards

This is built in so you stay on the right side of the law and of the platforms. It isn't legal advice. If you grow, ask a lawyer about the privacy laws in the countries you recruit from (for example Malaysia's PDPA 2010, the UK/EU GDPR, Kenya's Data Protection Act 2019, Nigeria's NDPA 2023, South Africa's POPIA).

## What the system does

| Requirement | How it is met |
|---|---|
| Consent before storing | The form and chat refuse to submit without explicit consent. The server rejects enquiries without it. Consent status and time are recorded. |
| Clear privacy notice | `website/privacy.html`: who, what, why, who sees it, retention (24 months max), rights. |
| Deletion | Students can delete their own data with their reference number + email (`privacy.html`). You can also use the menu. The deletion log keeps only a hash, never the email. |
| Minimal data | No passport numbers, bank or card details. Both the chat and the server detect and remove them if pasted. |
| No spam | No automated DMs, no bulk email. Only replies to people who asked, plus one confirmation email to the student who submitted. |
| Transparency | The assistant always says it is a virtual assistant supporting Ismail Hassan. It never pretends to be him or a human. |
| No platform circumvention | Only official APIs and RSS feeds meant for automation. No logins, CAPTCHA bypass, private groups or profile scraping. Reddit only via approved API keys. |
| No contact harvesting | Discovery stores links and excerpts only. Emails, phone numbers and usernames are stripped. |
| No false promises | Site, chat and emails state that admission and visas are never guaranteed and that not all services are free. Tests check the chat answers for this. |
| No regulated immigration advice | Visa content is general process guidance and points to EMGS and the university. |
| No fabrication | No invented testimonials, rankings, statistics or partnerships. Package prices and university lists are hidden until you confirm them with QETC. |
| Private commission | The USD 500 figure exists only in the private sheet and dashboard, and a test ensures student emails never mention it. |
| Security | Secrets live in Script Properties, not in code. Spreadsheet formula injection is neutralised. Form spam is handled with a honeypot, a minimum fill time and a rate limit. The dashboard needs a secret key. |

## Your responsibilities

- Get QETC's written OK to use the QETC name and to describe yourself as a recruitment partner (see `QETC-VERIFICATION.md`).
- Reply to deletion requests made by WhatsApp or email.
- Delete records older than 24 months since last contact. Sort the Students sheet by *Last Updated* every few months.
- When posting public replies, disclose that you are a recruitment consultant and follow each community's self-promotion rules.
