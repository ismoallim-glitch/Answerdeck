# Ismail Hassan – QETC Malaysia Student Recruitment System

**STUDY IN MALAYSIA. LEAVE THE ARRANGEMENTS TO US.**

This folder holds a complete, free-to-run student recruitment system:

| Part | What it does | Runs on (free) |
|---|---|---|
| **Website** (`website/`) | Student-facing site with all 12 sections, an enquiry form, a chat assistant and a privacy page with "delete my data" | Netlify / Cloudflare Pages / GitHub Pages |
| **Backend** (`apps-script/`, bundled as `dist/Code.gs`) | Receives enquiries, scores leads, saves them in Google Sheets, emails you, runs discovery every 2 hours, monitors itself | Google Apps Script |
| **CRM + dashboard** | Google Sheet with Students, Discovered Opportunities, Discovery Sources, a private Commission tracker, a Dashboard, a System Log and a System Status tab, plus a private web dashboard | Google Sheets |

**Start here → [docs/DEPLOY.md](docs/DEPLOY.md)** (step by step, about 45 minutes, no programming needed).

## Before you go live, you must…

1. **Confirm the QETC information** with QETC, using [docs/QETC-VERIFICATION.md](docs/QETC-VERIFICATION.md). The site doesn't show package prices or a university list until you switch them on.
2. **Deploy it**: follow [docs/DEPLOY.md](docs/DEPLOY.md). Nothing runs 24/7 until you complete those steps. The "System Status" sheet tells you whether it is really running.
3. Add your **WhatsApp number** and **contact email** in `website/assets/config.js`.

## Other documents

- [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md): architecture, lead scoring and how discovery works
- [docs/DAILY-ROUTINE.md](docs/DAILY-ROUTINE.md): what you do each day (about 20 minutes)
- [docs/LIMITS.md](docs/LIMITS.md): free-tier quotas and what the free version cannot do
- [docs/COMPLIANCE.md](docs/COMPLIANCE.md): privacy, platform rules, and what the system will never do

## For developers

```bash
npm test            # backend + chat assistant tests (no browser)
npm run test:all    # + browser end-to-end tests (needs Playwright/Chromium)
npm run build       # rebuild dist/Code.gs after editing apps-script/*.gs
npm run serve       # preview the website at http://localhost:8080
```

The tests run the real Apps Script code against an in-memory copy of Google Sheets, Mail and fetch (`tests/gas-mock.js`). The browser tests send the website's real requests into that backend.
