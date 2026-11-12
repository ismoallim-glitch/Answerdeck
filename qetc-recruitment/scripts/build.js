// Combines every apps-script/*.gs file into ONE file (dist/Code.gs) so you can paste a single file
// into the Apps Script editor. Run: node scripts/build.js
'use strict';
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'apps-script');
const out = path.join(__dirname, '..', 'dist');
fs.mkdirSync(out, { recursive: true });
const order = ['Config.gs', 'Utils.gs', 'Scoring.gs', 'Crm.gs', 'Commission.gs', 'Discovery.gs', 'Notify.gs', 'Dashboard.gs', 'Health.gs', 'Api.gs', 'Setup.gs'];
const all = fs.readdirSync(src).filter(f => f.endsWith('.gs'));
const missing = all.filter(f => !order.includes(f));
if (missing.length) throw new Error('Add these files to the build order: ' + missing.join(', '));
const body = order.map(f => '// ===================== ' + f + ' =====================\n' + fs.readFileSync(path.join(src, f), 'utf8')).join('\n\n');
fs.writeFileSync(path.join(out, 'Code.gs'), '// GENERATED FILE – edit the files in apps-script/ and run `node scripts/build.js`.\n// Paste this whole file into Code.gs in the Apps Script editor.\n\n' + body);
fs.copyFileSync(path.join(src, 'Dashboard.html'), path.join(out, 'Dashboard.html'));
fs.copyFileSync(path.join(src, 'appsscript.json'), path.join(out, 'appsscript.json'));
console.log('Built dist/Code.gs (' + body.length + ' chars), dist/Dashboard.html, dist/appsscript.json');
