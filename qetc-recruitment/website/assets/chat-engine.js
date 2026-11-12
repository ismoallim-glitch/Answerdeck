/**
 * Student enquiry assistant — conversation engine (runs in the visitor's browser, free, no AI API).
 * Asks one question at a time, answers common questions from a verified knowledge base,
 * and only submits after the visitor gives consent.
 * Works in the browser (window.ChatEngine) and in Node tests (module.exports).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChatEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var INTRO = "Hello! I'm the virtual assistant supporting Ismail Hassan. Ismail helps international students explore university opportunities in Malaysia through QETC Malaysia.";

  // ---------------------------------------------------------------- Knowledge base (verified, non-promissory)
  var KB = [
    { id: 'bot', re: /\b(are you (a )?(bot|human|real|robot|ai|person)|who am i (talking|speaking) to|is this (a )?(bot|human))\b/i,
      a: "I'm an automated virtual assistant, not a person. I collect your details so that Ismail Hassan — a real person — can reply to you personally." },
    { id: 'human', re: /\b(talk|speak|chat) (to|with) (ismail|a human|a person|someone|a real)|\b(call|whatsapp) (me|ismail)\b|\bhuman\b/i,
      a: "Of course. Ismail personally handles every serious enquiry. If you finish these few questions he'll have everything he needs to reply — or you can use the WhatsApp/contact details on this page at any time." },
    { id: 'guarantee', re: /\bguarantee|100 ?%|sure (to|that i) (get|be)|will i (definitely )?(get|be accepted|get accepted)/i,
      a: "Honest answer: nobody can guarantee admission or a visa. Universities decide on admission and the Malaysian authorities decide on student passes. What we do is help you choose suitable options, prepare a complete application and follow up." },
    { id: 'cost', re: /\b(cost|fee|fees|price|how much|expensive|cheap|afford|tuition|pay)\b/i,
      a: "Costs come from several separate places: (1) tuition fees — paid to the university and different for every course; (2) any QETC service-package charge — confirmed with you in writing before you commit; (3) accommodation; (4) student visa / immigration and medical-screening fees; (5) insurance; (6) flights; (7) other university or government charges. Ismail will help you get the current official figures for your chosen course." },
    { id: 'package', re: /\b(package|silver|golden|gold|diamond|qetc (fee|charge|service))\b/i,
      a: "QETC publishes service packages that can include admission help, accommodation assistance, airport pickup and arrival support. Not every service is free and packages can change, so Ismail will send you the current package details and any charges confirmed by QETC before you decide." },
    { id: 'services', re: /\b(what (do|can) you (do|offer|help)|services?|help with what|how can you help)\b/i,
      a: "Ismail coordinates, through QETC Malaysia: university and course selection, admission application help, scholarship guidance, guidance on the student visa process, accommodation assistance (on or off campus), airport pickup, arrival support, and practical help like a SIM card, bank account and transport card. You still provide genuine documents, meet the university's requirements and pay the applicable fees." },
    { id: 'visa', re: /\b(visa|student pass|emgs|immigration|permit)\b/i,
      a: "International students in Malaysia need a student pass. The application is normally submitted through Education Malaysia Global Services (EMGS) after you receive a university offer. We can explain the steps and help you stay on track, but we don't give legal immigration advice — always follow the instructions from your university and EMGS (educationmalaysia.gov.my)." },
    { id: 'accommodation', re: /\b(accommodation|hostel|housing|dorm|room|apartment|stay|live)\b/i,
      a: "Yes — through QETC we can help you arrange suitable on-campus or off-campus student accommodation. Rent is paid separately and depends on the location and room type." },
    { id: 'pickup', re: /\b(airport|pick ?up|arrival|arrive|klia)\b/i,
      a: "Airport pickup assistance can be arranged through QETC when you arrive in Malaysia, along with arrival guidance. Ismail will confirm the details and any charge before you travel." },
    { id: 'scholarship', re: /\bscholarship|bursary|financial aid|discount\b/i,
      a: "Some Malaysian universities offer scholarships or merit discounts, usually based on grades. They're competitive and never guaranteed, but Ismail can help you look for ones that fit your profile." },
    { id: 'english', re: /\b(ielts|toefl|english (test|requirement|proficiency)|pte|duolingo)\b/i,
      a: "Many programmes are taught in English and most universities ask for proof of English (e.g. IELTS or an equivalent), unless you qualify for an exemption. Requirements differ by university and course — Ismail will check the exact requirement for your choice." },
    { id: 'documents', re: /\b(documents?|transcripts?|certificates?|what (do i|should i) (need|send|prepare)|requirements?)\b/i,
      a: "Universities usually ask for academic certificates and transcripts, a passport copy and sometimes an English test result. Please don't send any documents in this chat — Ismail will explain the official, secure way to submit them when you're ready to apply." },
    { id: 'passport', re: /\b(passport (number|no)|bank (account|statement|details)|credit card|card number)\b/i,
      a: "Please don't share passport numbers, bank details or card numbers here. This chat only collects basic enquiry information; Ismail will guide you on secure official channels when needed." },
    { id: 'countries', re: /\b(accept|eligible|can (students|people) from|from my country|my nationality)\b/i,
      a: "We welcome enquiries from every country. Eligibility can depend on the university and your nationality, so Ismail confirms the options available for you personally." },
    { id: 'whymalaysia', re: /\b(why malaysia|is malaysia (good|safe|worth)|malaysia (good|safe))\b/i,
      a: "Students often choose Malaysia because many programmes are taught in English, several UK and Australian universities have branch campuses there, living costs are often lower than in many Western countries, halal food is widely available, and it's a multicultural country with many international students." },
    { id: 'privacy', re: /\b(privacy|delete my (data|information)|data protection|gdpr|who sees my)\b/i,
      a: "Your details are only used to respond to your enquiry and are only stored if you agree. You can ask for them to be deleted at any time using the form on our Privacy page." },
    { id: 'work', re: /\b(work while|part[- ]time (job|work)|can i work|working)\b/i,
      a: "Rules on working while studying are set by the Malaysian immigration authorities and can change. Please check the current rules with your university and EMGS; Ismail can point you to the official information." },
    { id: 'thanks', re: /^(thanks|thank you|thx|ok thanks|great thanks)[.! ]*$/i, a: "You're welcome! 😊" }
  ];

  var YES = /^(y|yes|yeah|yep|sure|ok|okay|please|yes please|definitely|of course|i agree|agree)\b/i;
  var NO = /^(n|no|nope|not now|no thanks|not really|don'?t|do not|i disagree)\b/i;
  var SKIP = /^(skip|not sure|unsure|don'?t know|idk|no idea|later|n\/a|prefer not)\b/i;

  // ---------------------------------------------------------------- Conversation steps
  var STEPS = [
    { key: 'name', q: function () { return "To get started, what is your full name?"; }, required: true,
      validate: function (v) { return v.length >= 2 && v.length <= 80 && !/\d{4,}/.test(v) ? '' : 'Could you type your name (just letters)?'; },
      ack: function (v) { return 'Nice to meet you, ' + v.split(' ')[0] + '!'; } },
    { key: 'country', q: function () { return 'Which country are you from?'; }, required: true,
      ack: function (v) { return 'Thanks! Ismail will confirm the options available to applicants from ' + v + '.'; } },
    { key: 'qualification', q: function () { return 'What is your highest educational qualification so far? (e.g. high school / A-levels / diploma / bachelor’s degree)'; },
      quick: ['High school / secondary', 'A-levels / Foundation', 'Diploma', "Bachelor's degree", "Master's degree"] },
    { key: 'level', q: function () { return "Are you interested in a diploma, bachelor's or master's degree?"; },
      quick: ['Foundation', 'Diploma', "Bachelor's", "Master's", 'PhD', 'Not sure yet'] },
    { key: 'course', q: function (d) { return 'What would you like to study' + (d.level && d.level !== 'Not sure yet' ? ' at ' + d.level + ' level' : '') + '?'; },
      quick: ['Business', 'Computer Science / IT', 'Engineering', 'Medicine / Health', 'Not sure yet'] },
    { key: 'intake', q: function () { return 'When would you like to start your studies?'; }, quick: ['As soon as possible', 'Within 6 months', 'Next year', 'Not sure yet'] },
    { key: 'budget', q: function () { return "What is your approximate yearly tuition budget? (A rough range is fine — or type 'skip'.)"; },
      quick: ['Under USD 3,000', 'USD 3,000–6,000', 'USD 6,000–10,000', 'Above USD 10,000', 'Skip'] },
    { key: 'accommodation', yn: true, q: function () { return 'Would you like assistance arranging accommodation in Malaysia?'; }, quick: ['Yes', 'No', 'Not sure'] },
    { key: 'pickup', yn: true, q: function () { return 'Would you like airport pickup assistance when you arrive?'; }, quick: ['Yes', 'No', 'Not sure'] },
    { key: 'visaHelp', yn: true, q: function () { return 'Would you like help understanding the university admission and student visa process?'; }, quick: ['Yes', 'No'] },
    { key: 'contact', q: function (d) { return 'Great, ' + (d.name || '').split(' ')[0] + '. How should Ismail reply to you? Please type your email address or WhatsApp number (with country code).'; }, required: true,
      validate: function (v) {
        return /[^\s@]+@[^\s@]+\.[^\s@]{2,}/.test(v) || /(\+?\d[\d\s()-]{6,}\d)/.test(v) ? '' : 'Please type a valid email address or a WhatsApp number with country code (e.g. +254 7xx xxx xxx).';
      } },
    { key: 'consent', q: function () { return 'Last step: do you agree that your answers are stored and used only so that Ismail Hassan (and QETC Malaysia, if you decide to proceed) can contact you about studying in Malaysia? You can ask us to delete them at any time. (Privacy notice: see the Privacy page.)'; },
      quick: ['Yes, I agree', 'No'], required: true }
  ];

  function matchKb(text) {
    for (var i = 0; i < KB.length; i++) if (KB[i].re.test(text)) return KB[i];
    return null;
  }

  function looksLikeQuestion(text) {
    return /\?\s*$/.test(text) || /^(what|how|why|is|are|can|could|do|does|will|which|who|where|when)\b/i.test(text);
  }

  function hasSensitive(text) {
    return /\b(?:\d[ -]?){13,19}\b/.test(text) || /\bpassport\s*(no|number|#)?[:\s]*[A-Z0-9]{6,12}\b/i.test(text) || /\b(iban|swift|cvv|pin code)\b/i.test(text);
  }

  function create(opts) {
    opts = opts || {};
    var state = { step: 0, data: {}, done: false, submitted: false, startedAt: Date.now() };

    function ask() {
      var s = STEPS[state.step];
      return { text: s.q(state.data), quick: s.quick || null };
    }

    function start() {
      return { messages: [INTRO, 'I can answer common questions and pass your details to Ismail, who replies personally.', ask().text], quick: ask().quick };
    }

    function finishData() {
      var d = state.data, c = d.contact || '';
      var email = (c.match(/[^\s@]+@[^\s@]+\.[^\s@]{2,}/) || [])[0] || '';
      var phone = email ? '' : c.replace(/[^\d+]/g, '');
      return {
        name: d.name, country: d.country, qualification: d.qualification || '', level: d.level || '', course: d.course || '',
        intake: d.intake || '', budget: d.budget || '', accommodation: d.accommodation || '', pickup: d.pickup || '', visaHelp: d.visaHelp || '',
        email: email, phone: phone, preferredContact: email ? 'Email' : 'WhatsApp', consent: true,
        source: 'Website chat assistant', message: (d.questions || []).length ? 'Questions asked in chat: ' + d.questions.join(' | ') : ''
      };
    }

    function reply(raw) {
      var text = String(raw || '').trim().slice(0, 500);
      if (state.done) return { messages: ['Thanks again! Ismail will be in touch. You can close this chat.'], quick: null };
      if (!text) return { messages: [ask().text], quick: ask().quick };

      var out = [];
      if (hasSensitive(text)) {
        return { messages: ["For your safety, please don't share passport numbers, card or bank details here — I haven't saved that message.", ask().text], quick: ask().quick };
      }

      var step = STEPS[state.step];
      var kb = matchKb(text);
      // A question (or a known topic while we expect a short answer) gets answered first, then we re-ask.
      var isAnswerToQuick = step.quick && step.quick.some(function (q) { return q.toLowerCase() === text.toLowerCase(); });
      if (kb && !isAnswerToQuick && (looksLikeQuestion(text) || kb.id === 'human' || kb.id === 'thanks' || kb.id === 'bot' || kb.id === 'passport')) {
        state.data.questions = (state.data.questions || []).concat([text.slice(0, 150)]);
        out.push(kb.a);
        out.push(kb.id === 'thanks' ? ask().text : 'Now, back to your enquiry: ' + ask().text);
        return { messages: out, quick: ask().quick };
      }
      if (!kb && looksLikeQuestion(text) && step.key !== 'name' && text.split(' ').length > 3) {
        state.data.questions = (state.data.questions || []).concat([text.slice(0, 150)]);
        out.push("Good question — I don't want to give you a wrong answer, so I've noted it for Ismail to answer personally.");
        out.push(ask().text);
        return { messages: out, quick: ask().quick };
      }

      // Treat as the answer to the current step.
      var value = text;
      if (step.key === 'consent') {
        if (YES.test(text)) {
          state.done = true;
          var data = finishData();
          data.elapsedMs = Date.now() - state.startedAt;
          return { messages: ['Thank you! Sending your enquiry to Ismail now…'], quick: null, submit: data };
        }
        if (NO.test(text)) {
          state.done = true;
          state.data = {};
          return { messages: ["No problem — I haven't saved anything. You're welcome to come back any time, or contact Ismail directly using the details on this page."], quick: null, declined: true };
        }
        return { messages: ["Please answer 'Yes, I agree' or 'No'."], quick: ask().quick };
      }
      if (SKIP.test(text) && !step.required) value = '';
      else if (step.yn) value = YES.test(text) ? 'Yes' : (NO.test(text) ? 'No' : 'Not sure');
      if (/^not sure( yet)?$/i.test(value) && (step.key === 'level' || step.key === 'course' || step.key === 'intake')) value = '';

      if (step.validate) {
        var err = step.validate(value);
        if (err) return { messages: [err], quick: step.quick || null };
      }
      if (step.required && !value) return { messages: ['I need this one so Ismail can help you. ' + ask().text], quick: ask().quick };
      state.data[step.key] = value;
      if (step.ack && value) out.push(step.ack(value));
      state.step++;
      out.push(ask().text);
      return { messages: out, quick: ask().quick };
    }

    return { start: start, reply: reply, state: state };
  }

  return { create: create, INTRO: INTRO, KB: KB, STEPS: STEPS, matchKb: matchKb };
});
