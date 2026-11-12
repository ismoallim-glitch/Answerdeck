'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const ChatEngine = require('../website/assets/chat-engine.js');

function converse(lines) {
  const chat = ChatEngine.create();
  const transcript = [chat.start()];
  let last;
  for (const l of lines) { last = chat.reply(l); transcript.push(last); }
  return { chat, last, transcript, all: transcript.flatMap(t => t.messages).join('\n') };
}

test('introduces itself transparently, one question at a time', () => {
  const chat = ChatEngine.create();
  const s = chat.start();
  assert.equal(s.messages[0], "Hello! I'm the virtual assistant supporting Ismail Hassan. Ismail helps international students explore university opportunities in Malaysia through QETC Malaysia.");
  assert.match(s.messages[2], /full name\?$/);
  assert.equal(s.messages.filter(m => /\?/.test(m)).length, 1);
});

test('complete conversation collects all 10 answers + contact and submits only after consent', () => {
  const { last, all } = converse(['Amina Test', 'Kenya', 'High school / secondary', "Bachelor's", 'Business Administration', 'September next year',
    'USD 3,000–6,000', 'Yes', 'yes please', 'Yes', 'amina@example.com', 'Yes, I agree']);
  assert.ok(last.submit, all);
  const d = last.submit;
  assert.equal(d.name, 'Amina Test');
  assert.equal(d.country, 'Kenya');
  assert.equal(d.level, "Bachelor's");
  assert.equal(d.course, 'Business Administration');
  assert.equal(d.budget, 'USD 3,000–6,000');
  assert.equal(d.accommodation, 'Yes');
  assert.equal(d.pickup, 'Yes');
  assert.equal(d.visaHelp, 'Yes');
  assert.equal(d.email, 'amina@example.com');
  assert.equal(d.preferredContact, 'Email');
  assert.equal(d.consent, true);
  assert.match(all, /Nice to meet you, Amina!/);
  assert.match(all, /What is your highest educational qualification/);
  assert.match(all, /airport pickup/);
});

test('declining consent submits nothing and clears data', () => {
  const { last, chat } = converse(['Bilal', 'Pakistan', 'skip', 'Not sure yet', 'Not sure yet', 'Not sure yet', 'skip', 'no', 'no', 'no', '+92 300 1234567', 'No']);
  assert.equal(last.submit, undefined);
  assert.equal(last.declined, true);
  assert.deepEqual(chat.state.data, {});
});

test('answers questions mid-flow from the knowledge base, then resumes', () => {
  const chat = ChatEngine.create();
  chat.start();
  chat.reply('Amina');
  const r = chat.reply('Is admission guaranteed?');
  assert.match(r.messages[0], /nobody can guarantee admission or a visa/);
  assert.match(r.messages[1], /Which country are you from\?/);
  const c = chat.reply('How much are the fees?');
  assert.match(c.messages[0], /tuition fees — paid to the university/);
  assert.match(c.messages[0], /QETC service-package charge/);
  const b = chat.reply('are you a bot?');
  assert.match(b.messages[0], /automated virtual assistant, not a person/);
});

test('never claims all services are free or that visas are guaranteed', () => {
  for (const item of ChatEngine.KB) {
    assert.doesNotMatch(item.a, /all (services|of this) (are|is) free|guaranteed (admission|visa)|100%/i, item.id);
  }
});

test('refuses sensitive data (passport / card numbers) without storing it', () => {
  const chat = ChatEngine.create();
  chat.start();
  const r = chat.reply('my passport number is A12345678');
  assert.match(r.messages[0], /don't share passport numbers/);
  assert.equal(chat.state.data.name, undefined);
  const r2 = chat.reply('4111 1111 1111 1111');
  assert.match(r2.messages[0], /haven't saved/);
});

test('validates name and contact', () => {
  const chat = ChatEngine.create();
  chat.start();
  assert.match(chat.reply('1234567').messages[0], /type your name/);
  ['Amina', 'Kenya', 'skip', 'skip', 'skip', 'skip', 'skip', 'no', 'no', 'no'].forEach(x => chat.reply(x));
  assert.match(chat.reply('not sure').messages[0], /valid email address or a WhatsApp number/);
  const ok = chat.reply('+254 712 345 678');
  assert.match(ok.messages.join(' '), /do you agree/);
  const fin = chat.reply('Yes, I agree');
  assert.equal(fin.submit.phone, '+254712345678');
  assert.equal(fin.submit.preferredContact, 'WhatsApp');
});

test('unknown questions are noted for Ismail instead of guessed', () => {
  const chat = ChatEngine.create();
  chat.start(); chat.reply('Amina'); chat.reply('Somalia');
  const r = chat.reply('Which campus has the best football team?');
  assert.match(r.messages[0], /noted it for Ismail/);
});
