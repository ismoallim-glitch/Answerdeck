# Deployment guide (beginner friendly)

Time: about 45 minutes. Cost: USD 0. You need a Google account (your Gmail is fine) and the files in this folder.

> **Tip:** do the steps in order. After each step there is a ✅ check so you know it worked.

---

## Step 1: Create the Google Sheet (your CRM)

1. Go to <https://sheets.new>. A blank spreadsheet opens.
2. Rename it (top left) to **Student Recruitment CRM**.

✅ You have an empty spreadsheet.

## Step 2: Add the backend code

1. In the spreadsheet menu choose **Extensions → Apps Script**. A new tab opens with a file called `Code.gs`.
2. Delete everything in `Code.gs`.
3. Open `dist/Code.gs` from this project, copy **all** of it, and paste it into `Code.gs`.
4. Click the **+** next to "Files" → **HTML**, and name it exactly `Dashboard` (the editor adds `.html`). Delete its contents and paste everything from `dist/Dashboard.html`.
5. Click the ⚙️ **Project Settings** (left sidebar) and tick **"Show 'appsscript.json' manifest file in editor"**. Go back to the editor (`< >` icon), open `appsscript.json`, and replace its contents with `dist/appsscript.json`.
6. Press **💾 Save** (Ctrl+S).

✅ You have three files: `Code.gs`, `Dashboard.html`, `appsscript.json`.

## Step 3: Run setup

1. In the function dropdown at the top (next to ▶ Run / Debug), choose **`setup`**.
2. Click **▶ Run**.
3. Google asks for permission. Click **Review permissions** → choose your account → **Advanced** → **Go to (project name) (unsafe)** → **Allow**.
   *(Google shows "unsafe" for every personal script that hasn't been through Google's app review. It is your own code, running in your own account.)*
4. Wait for "Execution completed".

✅ Your spreadsheet now has the tabs **Students, Discovered Opportunities, Discovery Sources, Commission (Private), Dashboard, System Log, System Status, Deletion Requests**. Reload the spreadsheet to see the **🎓 Recruitment** menu.

**What setup installed (the 24/7 automation):**

| Automatic job | When | What it does |
|---|---|---|
| `runDiscovery` | every 2 hours | searches the discovery sources, saves promising posts, emails you about the best ones |
| `sendDailyDigest` | every day around 08:00 (Malaysia time) | one summary email: new enquiries, follow-ups due, new posts |
| `healthCheck` | every 6 hours | emails you if discovery has stopped working |
| `onStudentSheetEdit` | when you edit the Students sheet | updates "Next action", alerts you on READY TO APPLY, opens a commission row on ENROLLED |

These run on Google's servers, so **your laptop can stay switched off**.

## Step 4: Publish the backend as a web app

1. In the Apps Script editor click **Deploy → New deployment**.
2. Click the ⚙️ next to "Select type" → **Web app**.
3. Description: `v1`. **Execute as: Me**. **Who has access: Anyone**.
4. Click **Deploy**, then copy the **Web app URL** (it ends in `/exec`).
5. Back in the spreadsheet: **🎓 Recruitment → Save web app URL**, then paste it.

✅ Open the URL in your browser. You should see `{"ok":true,"message":"Ismail Hassan student enquiry service is running..."}`.
✅ Open the **System Status** sheet. The row "Private dashboard link" now contains your private dashboard address. **Don't share it**: anyone who has the link can see your dashboard.

> When you change the code later, use **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. That keeps the same URL.

## Step 5: Test email notifications

**🎓 Recruitment → Send test notification email**.

✅ You receive "Test: recruitment system notifications work ✅". (To send alerts to a different address, set `NOTIFY_EMAIL` in `Config.gs`.)

## Step 6: Publish the website

1. Open `website/assets/config.js` in a text editor (Notepad is fine) and fill in:
   - `API_URL`: the Web app URL from step 4
   - `WHATSAPP_NUMBER`: digits only, with country code, e.g. `60123456789`
   - `CONTACT_EMAIL`: the email students should see
2. Put the website online. Choose **one** of these free options:
   - **Netlify Drop (easiest):** go to <https://app.netlify.com/drop>, sign up for free, and drag the whole `website` folder onto the page. You get an address like `https://something.netlify.app`. You can rename it under *Site configuration → Change site name*.
   - **Cloudflare Pages:** dash.cloudflare.com → Workers & Pages → Create → Pages → *Upload assets* → upload the `website` folder.
   - **GitHub Pages:** make a new public repository that contains only the files inside `website/`, then Settings → Pages → Deploy from branch.
3. Put your website address into `CONFIG.WEBSITE_URL` in the Apps Script `Code.gs`, save, and re-deploy (Deploy → Manage deployments → Edit → New version).

✅ **Full end-to-end test:** open your website on your phone, submit the enquiry form with your own details and tick consent. Within about 10 seconds:
- the page shows a reference like `QM-261112-AB3CD`
- a new row appears in the **Students** sheet with a score and an explanation
- you receive a "New student enquiry" email
- the email address you entered receives a confirmation

Then try the **chat assistant** (bottom-right button) the same way. Afterwards, delete your test records with **🎓 Recruitment → Delete a student's data** (or the form on `privacy.html`).

## Step 7: Switch on discovery sources

Open the **Discovery Sources** sheet. Each row is one search. `Enabled` = TRUE means it runs every 2 hours.

**A. Google Alerts (the most important source: covers public web pages, forums and Q&A sites):**
1. Go to <https://www.google.com/alerts>.
2. Type a phrase, e.g. `"study in Malaysia"`. Click **Show options** and set **How often: As-it-happens**, **Sources: Automatic**, **Language: English**, **Region: Any**, **How many: All results**, and **Deliver to: RSS feed**. Click **Create alert**.
3. Next to the alert, click the RSS icon and copy the address (it starts with `https://www.google.com/alerts/feeds/`).
4. Paste it into the **Target** column of one of the `rss` rows and set **Enabled** to `TRUE`.
5. Repeat for more phrases (add rows as needed):
   - `"study in Malaysia"`
   - `"universities in Malaysia" international students`
   - `"how to apply" Malaysian university`
   - `"want to study abroad" affordable`
   - `"study abroad" Kenya OR Somalia OR Nigeria OR Pakistan OR Bangladesh`
   - `"finished high school" "study abroad"`
   - `"affordable bachelor" abroad`

**B. Stack Exchange:** already enabled. To raise its free quota from 300 to 10,000 requests a day (recommended, because Google's servers share the free quota with other users):
register an app at <https://stackapps.com/apps/oauth/register> (any name; OAuth domain `script.google.com`). Then copy the **Key** into Apps Script **Project Settings → Script Properties** as `STACKEXCHANGE_KEY`.

**C. Reddit (optional, needs Reddit's approval):** Reddit does not allow unapproved automated access, so the Reddit rows stay off. If you want them, follow the Data API access process linked from <https://www.reddit.com/wiki/api>, describe the non-spam use (reading public posts in a few study-abroad communities; no automated posting or DMs), and create a "script" app at <https://www.reddit.com/prefs/apps>. After approval, add `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` to Script Properties and set the Reddit rows to TRUE.

✅ Run **🎓 Recruitment → Run discovery now**. Check the **Last Result** column (e.g. `OK: 30 checked, 2 new`) and the **System Log** sheet.

## Step 8: Confirm it is really running 24/7

The next day, check the **System Status** sheet:

- **Current system status** should say `HEALTHY`
- **Last successful discovery run** should be within the last 2–3 hours
- In Apps Script, the **Executions** page (left sidebar) should list `runDiscovery` runs about every 2 hours

If it says `WARNING` or `FAILING`, open the **System Log** and **Discovery Sources** sheets and look at the error messages.

---

## Script Properties reference (Project Settings → Script Properties)

| Property | Set by | Purpose |
|---|---|---|
| `SPREADSHEET_ID`, `ADMIN_KEY`, `TRIGGERS_INSTALLED` | setup (automatic) | internal; `ADMIN_KEY` protects your dashboard link |
| `WEB_APP_URL` | menu "Save web app URL" | builds your private dashboard link |
| `NOTIFY_EMAIL` | you (optional) | alert address, if different from your Google account |
| `STACKEXCHANGE_KEY` | you (optional) | higher Stack Exchange quota |
| `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` | you (optional, after Reddit approval) | official Reddit API |

To change your private dashboard link (for example if it leaked), delete `ADMIN_KEY` and run `setup` again.
