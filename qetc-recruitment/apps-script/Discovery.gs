/**
 * AUTONOMOUS STUDENT DISCOVERY ENGINE
 * Searches permitted public sources for people publicly asking about studying abroad,
 * scores them, de-duplicates them and saves promising ones for Ismail to review.
 *
 * Rules built in:
 *  - Only official APIs or feeds meant for automated reading (Stack Exchange API, Google Alerts RSS, approved Reddit API, public RSS).
 *  - No CAPTCHA bypass, no private groups, no profile scraping, no contact-detail harvesting.
 *    We store the post's public link and text excerpt only — not usernames, emails or phone numbers.
 *  - Nothing is ever posted or messaged automatically. Draft replies are for Ismail to review and post himself.
 */

const SOURCE_TYPES = ['stackexchange', 'reddit_search', 'rss'];

/** Time-driven trigger entry point. */
function runDiscovery() {
  const started = Date.now();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) { log_('discovery', 'SKIPPED', started, 0, 0, 'Previous run still in progress'); return; }
  const props = PropertiesService.getScriptProperties();
  let checked = 0, created = 0, okSources = 0, failedSources = 0;
  const errors = [], alerts = [];
  try {
    props.setProperty('LAST_DISCOVERY_START', new Date().toISOString());
    const sources = readObjects_(CONFIG.SHEETS.SOURCES);
    const existing = readObjects_(CONFIG.SHEETS.OPPORTUNITIES);
    const seen = {};
    existing.forEach(o => { seen[String(o['ID'])] = true; });
    const now = new Date();

    for (const src of sources) {
      if (Date.now() - started > CONFIG.MAX_RUN_MS) { errors.push('Stopped early to stay inside the 6-minute limit; remaining sources run next time.'); break; }
      if (!/^(true|yes)$/i.test(String(src['Enabled']))) continue;
      const type = String(src['Type']).trim();
      if (SOURCE_TYPES.indexOf(type) === -1) continue;
      if (src['Paused Until'] && new Date(src['Paused Until']) > now) continue;
      if (type === 'rss' && !/^https:\/\//.test(String(src['Target']))) continue;

      let items;
      try {
        items = fetchSource_(type, String(src['Target']).trim(), String(src['Query'] || '').trim());
        okSources++;
      } catch (err) {
        failedSources++;
        const fails = (Number(src['Consecutive Failures']) || 0) + 1;
        const patch = { 'Last Run': new Date(), 'Last Result': 'ERROR: ' + clean_(err.message, 200), 'Consecutive Failures': fails };
        if (fails >= CONFIG.SOURCE_BACKOFF_FAILURES) patch['Paused Until'] = new Date(Date.now() + CONFIG.SOURCE_BACKOFF_HOURS * 3600000);
        updateRow_(CONFIG.SHEETS.SOURCES, src._row, patch);
        errors.push(type + ' ' + src['Target'] + ': ' + err.message);
        continue;
      }

      let newHere = 0;
      for (const item of items) {
        checked++;
        const id = hash_(item.platform + '|' + canonicalLink_(item.link));
        if (seen[id]) continue;
        seen[id] = true;
        if (item.created && (now - item.created) / 86400000 > CONFIG.MAX_POST_AGE_DAYS) continue;
        const cls = classifyPost_(item, now);
        if (cls.score < CONFIG.OPPORTUNITY_MIN_SCORE) continue;
        appendObject_(CONFIG.SHEETS.OPPORTUNITIES, {
          'ID': id, 'Found': new Date(), 'Platform': item.platform, 'Community': item.community,
          'Title': clean_(item.title, 300), 'Excerpt': clean_(stripContactDetails_(item.body), 600),
          'Link': item.link, 'Posted': item.created || '', 'Relevance Score': cls.score, 'Score Band': cls.band,
          'Why': cls.reasons.join('; '), 'Detected Country': cls.country, 'Detected Level': cls.level,
          'Detected Course': cls.course, 'Malaysia Mentioned': cls.malaysia ? 'Yes' : 'No',
          'Invites Recommendations': cls.invites ? 'Yes' : 'No',
          'Suggested Public Reply (review before posting)': draftReply_(cls), 'Review Status': 'NEW', 'Student Ref': '', 'Notes': ''
        });
        created++; newHere++;
        if (cls.score >= CONFIG.OPPORTUNITY_ALERT_SCORE) alerts.push({ item, cls });
      }
      updateRow_(CONFIG.SHEETS.SOURCES, src._row, {
        'Last Run': new Date(), 'Last Result': 'OK: ' + items.length + ' checked, ' + newHere + ' new', 'Consecutive Failures': 0, 'Paused Until': ''
      });
    }

    alerts.sort((a, b) => b.cls.score - a.cls.score).slice(0, CONFIG.MAX_IMMEDIATE_ALERTS_PER_RUN).forEach(a => notifyOpportunity_(a.item, a.cls));

    const status = okSources === 0 && failedSources > 0 ? 'FAILED' : (failedSources ? 'PARTIAL' : 'OK');
    if (status !== 'FAILED') props.setProperty('LAST_DISCOVERY_SUCCESS', new Date().toISOString());
    props.setProperty('LAST_DISCOVERY_STATUS', status);
    log_('discovery', status, started, checked, created, errors.join(' | ') || 'All sources OK');
    if (status === 'FAILED') notifyError_('discovery-all-failed', 'Every discovery source failed this run.\n\n' + errors.join('\n'));
    refreshDashboardSafe_();
    return { status, checked, created, errors };
  } catch (err) {
    props.setProperty('LAST_DISCOVERY_STATUS', 'CRASHED');
    log_('discovery', 'CRASHED', started, checked, created, err.stack || err.message);
    notifyError_('discovery-crash', 'Discovery crashed: ' + (err.stack || err.message));
    return { status: 'CRASHED', checked, created, errors: [err.message] };
  } finally {
    lock.releaseLock();
  }
}

function fetchSource_(type, target, query) {
  if (type === 'stackexchange') return fetchStackExchange_(target, query);
  if (type === 'reddit_search') return fetchReddit_(target, query);
  if (type === 'rss') return fetchRss_(target, 'Web (RSS)', target.replace(/^https:\/\/([^/]+).*/, '$1'));
  throw new Error('Unknown source type ' + type);
}

// ------------------------------------------------------------- Stack Exchange
function fetchStackExchange_(site, query) {
  const props = PropertiesService.getScriptProperties();
  const backoffUntil = Number(props.getProperty('SE_BACKOFF_UNTIL') || 0);
  if (Date.now() < backoffUntil) return [];
  const from = Math.floor(Date.now() / 1000) - CONFIG.MAX_POST_AGE_DAYS * 86400;
  let url = 'https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=creation&pagesize=30&filter=withbody' +
    '&site=' + encodeURIComponent(site) + '&q=' + encodeURIComponent(query) + '&fromdate=' + from;
  const key = props.getProperty('STACKEXCHANGE_KEY');
  if (key) url += '&key=' + encodeURIComponent(key);
  const res = fetchWithRetry_(url, {}, 2);
  if (res.code !== 200) throw new Error('Stack Exchange HTTP ' + res.code + ' ' + clean_(res.text, 120));
  const data = JSON.parse(res.text);
  if (data.backoff) props.setProperty('SE_BACKOFF_UNTIL', String(Date.now() + data.backoff * 1000));
  if (typeof data.quota_remaining === 'number') props.setProperty('SE_QUOTA_REMAINING', String(data.quota_remaining));
  return (data.items || []).map(q => ({
    platform: 'Stack Exchange', community: site, title: decodeEntities_(q.title || ''),
    body: htmlToText_(q.body || ''), link: q.link, created: new Date(q.creation_date * 1000)
  }));
}

// ------------------------------------------------------------- Reddit
function fetchReddit_(subreddit, query) {
  const props = PropertiesService.getScriptProperties();
  const sub = subreddit.replace(/^r\//i, '');
  const community = sub === 'all' ? 'Reddit (all)' : 'r/' + sub;
  if (!props.getProperty('REDDIT_CLIENT_ID') || !props.getProperty('REDDIT_CLIENT_SECRET')) {
    // Reddit's robots.txt and Data API terms do not allow unapproved automated access, so we never scrape it.
    throw new Error('Reddit source skipped: add approved REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET first (docs/DEPLOY.md, optional step)');
  }
  return fetchRedditApi_(sub, query, community);
}

/** Official Reddit API (application-only OAuth). Used automatically when you add REDDIT_CLIENT_ID/SECRET. */
function fetchRedditApi_(sub, query, community) {
  const props = PropertiesService.getScriptProperties();
  const cache = CacheService.getScriptCache();
  let token = cache.get('REDDIT_TOKEN');
  if (!token) {
    const auth = Utilities.base64Encode(props.getProperty('REDDIT_CLIENT_ID') + ':' + props.getProperty('REDDIT_CLIENT_SECRET'));
    const res = fetchWithRetry_('https://www.reddit.com/api/v1/access_token', {
      method: 'post', payload: { grant_type: 'client_credentials' }, headers: { Authorization: 'Basic ' + auth }
    }, 2);
    if (res.code !== 200) throw new Error('Reddit OAuth HTTP ' + res.code);
    const t = JSON.parse(res.text);
    token = t.access_token;
    cache.put('REDDIT_TOKEN', token, Math.min(3000, (t.expires_in || 3600) - 60));
  }
  const base = 'https://oauth.reddit.com';
  const url = !query ? base + '/r/' + encodeURIComponent(sub) + '/new?limit=25'
    : (sub === 'all' ? base + '/search?sort=new&t=month&limit=25&q=' + encodeURIComponent(query)
      : base + '/r/' + encodeURIComponent(sub) + '/search?restrict_sr=1&sort=new&t=month&limit=25&q=' + encodeURIComponent(query));
  const res = fetchWithRetry_(url, { headers: { Authorization: 'Bearer ' + token } }, 2);
  if (res.code !== 200) throw new Error('Reddit API HTTP ' + res.code);
  const data = JSON.parse(res.text);
  return ((data.data && data.data.children) || []).map(c => c.data).map(p => ({
    platform: 'Reddit', community: p.subreddit ? 'r/' + p.subreddit : community, title: p.title || '',
    body: p.selftext || '', link: 'https://www.reddit.com' + p.permalink, created: new Date(p.created_utc * 1000)
  }));
}

// ------------------------------------------------------------- RSS / Atom (Reddit feeds, Google Alerts, forums)
function fetchRss_(url, platform, community) {
  const res = fetchWithRetry_(url, {}, 2);
  if (res.code !== 200) throw new Error(platform + ' feed HTTP ' + res.code + (res.code === 403 || res.code === 429 ? ' (the site is limiting automated access; will retry later)' : ''));
  if (!/<(feed|rss|rdf)/i.test(res.text.slice(0, 2000))) throw new Error(platform + ' did not return a feed (maybe a login/consent page) — skipped');
  return parseFeed_(res.text).map(it => ({
    platform: platform === 'Web (RSS)' ? hostPlatform_(it.link) : platform,
    community, title: it.title, body: it.body, link: it.link, created: it.created
  }));
}

/** Small, dependency-free RSS 2.0 / Atom parser. */
function parseFeed_(xml) {
  const blocks = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  return blocks.map(b => {
    const tag = name => {
      const m = b.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name + '>', 'i'));
      return m ? m[1].replace(/^<!\[CDATA\[|\]\]>$/g, '').trim() : '';
    };
    let link = (b.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || tag('link');
    link = unwrapGoogleUrl_(decodeEntities_(link));
    const dateStr = tag('published') || tag('updated') || tag('pubDate') || tag('dc:date');
    const d = dateStr ? new Date(dateStr) : null;
    return {
      title: htmlToText_(decodeEntities_(tag('title'))),
      body: htmlToText_(decodeEntities_(tag('content') || tag('description') || tag('summary'))),
      link, created: d && !isNaN(d) ? d : null
    };
  }).filter(it => /^https?:\/\//.test(it.link));
}

function unwrapGoogleUrl_(link) {
  const m = link.match(/^https:\/\/www\.google\.[^/]+\/url\?.*?[?&]url=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : link;
}

function canonicalLink_(link) {
  return String(link || '').replace(/^http:/, 'https:').replace(/#.*$/, '')
    .replace(/([?&])(utm_[^=&]+|ref|fbclid|gclid)=[^&]*/gi, '$1').replace(/[?&]+$/, '').replace(/\/+$/, '')
    .replace('//old.reddit.com', '//www.reddit.com').toLowerCase();
}

function hostPlatform_(link) {
  const h = (String(link).match(/^https?:\/\/(?:www\.)?([^/]+)/) || [])[1] || 'Web';
  if (/reddit\.com$/.test(h)) return 'Reddit';
  if (/quora\.com$/.test(h)) return 'Quora';
  if (/facebook\.com$/.test(h)) return 'Facebook (public page)';
  if (/stackexchange\.com$|stackoverflow\.com$/.test(h)) return 'Stack Exchange';
  return h;
}

function decodeEntities_(s) {
  return String(s || '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function htmlToText_(html) {
  return decodeEntities_(String(html || '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/p>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/submitted by\s+\/u\/\S+/gi, ' ').replace(/\[link\]|\[comments\]/gi, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

/** We never store contact details found in public posts. */
function stripContactDetails_(text) {
  return String(text || '')
    .replace(/[^\s@]+@[^\s@]+\.[a-z]{2,}/gi, '[email removed]')
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, '[number removed]')
    .replace(/\/?u\/[A-Za-z0-9_-]+/g, '[user]');
}

/** Spreadsheet menu: turns the selected opportunity row into a CRM lead (status NEW LEAD). */
function convertSelectedOpportunity() {
  const sh = SpreadsheetApp.getActiveSheet();
  const ui = SpreadsheetApp.getUi();
  if (sh.getName() !== CONFIG.SHEETS.OPPORTUNITIES || sh.getActiveRange().getRow() < 2) {
    ui.alert('Select a row in the "' + CONFIG.SHEETS.OPPORTUNITIES + '" sheet first.'); return;
  }
  const row = sh.getActiveRange().getRow();
  const o = readObjects_(CONFIG.SHEETS.OPPORTUNITIES).find(x => x._row === row);
  if (o['Student Ref']) { ui.alert('Already linked to ' + o['Student Ref']); return; }
  const ref = createLeadFromOpportunity_(o);
  ui.alert('Created student lead ' + ref + ' (status NEW LEAD). Add their name/contact only if they share it with you voluntarily.');
}

function createLeadFromOpportunity_(o) {
  const ref = newRef_();
  const now = new Date();
  appendObject_(CONFIG.SHEETS.STUDENTS, {
    'Ref': ref, 'Created': now, 'Student Name': '(public post — name not collected)', 'Country': o['Detected Country'],
    'Study Level': o['Detected Level'], 'Course': o['Detected Course'], 'Discovery Source': o['Platform'] + ' ' + o['Community'],
    'Source Link': o['Link'], 'Enquiry Date': '', 'Consent Status': 'NOT GIVEN (public post only)',
    'Lead Score': o['Relevance Score'], 'Score Band': o['Score Band'], 'Score Explanation': 'Discovery relevance: ' + o['Why'],
    'Status': 'NEW LEAD', 'Next Action': nextActionFor_('NEW LEAD'), 'Next Action Due': new Date(now.getTime() + 48 * 3600000),
    'Last Updated': now
  });
  updateRow_(CONFIG.SHEETS.OPPORTUNITIES, o._row, { 'Student Ref': ref, 'Review Status': 'CONVERTED' });
  return ref;
}
