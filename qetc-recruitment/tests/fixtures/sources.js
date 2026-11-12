// SYNTHETIC TEST DATA ONLY — shaped exactly like the real API/feed responses,
// used to test parsing, scoring and de-duplication. Never written to the real CRM.
'use strict';
const daysAgo = d => new Date(Date.now() - d * 86400000);
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function stackExchangeResponse() {
  return {
    items: [
      {
        question_id: 1001, title: 'Is Malaysia a good option for an affordable bachelor in computer science?',
        body: '<p>I just finished high school in Kenya (KCSE) and I want to study computer science abroad. My family budget is limited. Which country is affordable? Any advice on Malaysian universities?</p>',
        link: 'https://academia.stackexchange.com/questions/1001/is-malaysia-a-good-option', creation_date: Math.floor(daysAgo(2) / 1000)
      },
      {
        question_id: 1002, title: 'How to respond to a referee report that is unfair?',
        body: '<p>My advisor says the journal reviewer misunderstood our paper.</p>',
        link: 'https://academia.stackexchange.com/questions/1002/referee', creation_date: Math.floor(daysAgo(1) / 1000)
      }
    ],
    has_more: false, quota_max: 300, quota_remaining: 287
  };
}

function redditAtom() {
  const entry = (id, title, html, d) => `<entry><author><name>/u/someone_${id}</name><uri>https://www.reddit.com/user/someone_${id}</uri></author>
<category term="studyAbroad" label="r/studyAbroad"/><content type="html">${esc(html)}</content><id>t3_${id}</id>
<link href="https://www.reddit.com/r/studyAbroad/comments/${id}/post_${id}/" /><updated>${d.toISOString()}</updated><published>${d.toISOString()}</published>
<title>${esc(title)}</title></entry>`;
  return `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><category term="studyAbroad" label="r/studyAbroad"/><title>search results</title>
${entry('aa1', "Finished A-levels in Pakistan, looking for affordable universities in Malaysia for a master's? Please help", '<div class="md"><p>I want to do my MBA in Malaysia next September. Budget around USD 8,000 per year. Can anyone recommend? My email is test@example.com</p></div> submitted by <a href="https://www.reddit.com/user/someone_aa1"> /u/someone_aa1 </a>', daysAgo(1))}
${entry('aa2', 'ADMISSIONS OPEN! Study in Malaysia - 100% visa guaranteed, contact us on WhatsApp +60123456789', '<p>We offer admission to top universities. Apply now!</p>', daysAgo(1))}
${entry('aa3', 'Photos from my semester in Japan', '<p>Sharing some pictures of the cherry blossoms.</p>', daysAgo(3))}
${entry('aa4', 'Thinking of studying nursing abroad after high school — which country?', '<p>I am from Nigeria. Should I study in the UK or somewhere cheaper in Asia? Any suggestions?</p>', daysAgo(5))}
${entry('aa5', 'Old post: study in Malaysia?', '<p>I want to study engineering in Malaysia, advice?</p>', daysAgo(90))}
</feed>`;
}

function googleAlertsAtom() {
  return `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:idx="urn:atom-extension:indexing"><title>Google Alert - "study in Malaysia"</title>
<entry><id>tag:google.com,2013:googlealerts/feed:1</id><title type="html">How can I apply to &lt;b&gt;Malaysian&lt;/b&gt; universities from Somalia?</title>
<link href="https://www.google.com/url?rct=j&amp;sa=t&amp;url=https://forum.example.org/t/apply-malaysia-from-somalia/55&amp;ct=ga&amp;cd=abc&amp;usg=xyz"/>
<published>${daysAgo(1).toISOString()}</published><updated>${daysAgo(1).toISOString()}</updated>
<content type="html">I want to study a bachelor&amp;#39;s in business administration in &lt;b&gt;Malaysia&lt;/b&gt;. How do I apply? Please advise.</content></entry></feed>`;
}

function redditApiJson() {
  const post = (id, title, selftext, d) => ({ kind: 't3', data: { id, title, selftext, subreddit: 'studyAbroad', permalink: `/r/studyAbroad/comments/${id}/x/`, created_utc: Math.floor(d / 1000), author: 'someone' } });
  return { kind: 'Listing', data: { children: [
    post('rr1', 'Somali student here — want to study engineering in Malaysia, how do I apply?', 'Finished secondary school last year. Any advice on affordable universities in Kuala Lumpur?', daysAgo(2)),
    post('rr2', 'Best ramen in Tokyo?', 'Just visiting.', daysAgo(1))
  ] } };
}

module.exports = { stackExchangeResponse, redditAtom, googleAlertsAtom, redditApiJson, daysAgo };
