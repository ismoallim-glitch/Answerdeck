# QETC information to confirm before launch

**Why this exists:** while building this, the official QETC websites (qetcme.com, qetc.com.my, old.qetcme.com) **could not be reached** from the build environment, which blocked them. A web search returned nothing reliable about QETC's packages. So the site uses **only the service list you provided** and hides anything that needs confirming.

Ask your QETC contact to confirm these points, ideally in writing (email or WhatsApp), then update the files shown.

| # | Question for QETC | Where to update |
|---|---|---|
| 1 | May I use the name "QETC Malaysia" and the title "QETC Malaysia Recruitment Partner" on my website? Is there an official logo I may use, and are there brand guidelines? | `website/index.html` (header/footer). Add a logo image if authorised. |
| 2 | Are the published services (education & admissions, visa & documentation, accommodation, travel & arrival, additional services) still current? | `website/index.html` → section `#services`; `chat-engine.js` → `services` answer |
| 3 | What are the current packages (Silver / Golden / Diamond?), their **prices** and **what each includes**? Are there conditions? | `website/assets/config.js` → `PACKAGES`, then set `PACKAGES_VERIFIED: true` |
| 4 | Which universities can QETC currently process applications for? | `website/assets/config.js` → `CONFIRMED_UNIVERSITIES` |
| 5 | Which countries' applicants does QETC currently accept, and are any nationalities restricted? | `website/index.html` FAQ "Which countries…"; `chat-engine.js` → `countries` |
| 6 | Is airport pickup free or charged? On which airports and days? | `#airport-pickup` section; `chat-engine.js` → `pickup` |
| 7 | How should I refer a student to QETC (form, email, portal)? What information does QETC need? | your process: note it in `DAILY-ROUTINE.md` |
| 8 | What exactly makes a student count as a "qualifying enrolment" for my commission, and when and how is it paid? | `Commission (Private)` sheet notes; `COMMISSION_PER_ENROLMENT_USD` in `Config.gs` |
| 9 | What privacy commitments does QETC make when I share student data with them? | `website/privacy.html` → "Who can see it" |

Until items 3 and 4 are confirmed, the website says that package details and university options are confirmed personally, and it shows no prices.
