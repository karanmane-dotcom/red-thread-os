/* Red Thread OS: modules and tools.
   Each tool is one piece of account-management work turned into a form.
   To add a tool, add an entry to TOOLS. Nothing else needs to change. */
(() => {
  const CATS_TSL = ['D2C FMCG Brands', 'Pharma, Nutraceuticals & Supplements', 'Healthcare & Fitness', 'Petcare', 'Baby Care', 'Gaming & E-Sports', 'D2C Packaged Food & Snacking', 'D2C Fashion Apparel', 'Travel & Tourism', 'Education'];
  const CATS_OTHER = ['Legacy FMCG', 'Legacy Pharma', 'Beauty, Skincare & Personal Care', 'Entertainment', 'Alcobev', 'Jewellery & Retail', 'Legacy Packaged Food & Snacking', 'Legacy Apparel', 'Real Estate', 'Telecom', 'Sport', 'Agriculture'];
  const CATS_SHARED = ['Auto', 'Consumer Tech', 'BFSI'];

  const HOUSE = `You are Red Thread, the operating system of The Starter Labs (TSL), a Mumbai digital marketing agency in the Zoo Media network. TSL's contracting entity is Starter Labs Consulting LLP. Zoo Media's is Zoo Media Private Limited.
House rules for everything you write:
- British English. Short, tight, plain sentences. Bullets are full, readable sentences, never clipped fragments. No filler, no hype, no em dashes, no emojis.
- Avoid these phrases: "dive into", "leverage" as a verb, "in today's landscape", "it's not just X, it's Y".
- Currency is INR. Internal documents use lakh and crore. Client-facing documents use absolute figures with Indian commas.
- Never invent a number, benchmark, CPM, CTR, ROAS, price, date or name. If something is not in the material, write [MISSING: what is needed] in its place and carry on.
- Every performance figure carries its source and date range. Never blend platform-reported, GA4 or backend, and modelled numbers without labelling each.
- Flag anything in the material that looks wrong or inconsistent before building on it. Do not soften bad performance.
- Client-facing output never contains internal cost, margin, staffing or capacity data, and leads with the recommendation, then the rationale, then the data.
- Alcohol clients: surrogate advertising rules apply. No product, consumption or brand-liquid references. Flag anything ASCI-risky.
- You draft. A person reviews and sends. Never say something was sent, booked or approved.
- You cannot browse the web. Do not present anything as researched online.
- Format the answer in Markdown with short headings, bullets and tables where a table is clearer.`;

  const COSTING = `TSL COSTING MODEL
- 1 FTE = {hoursPerFte} hours a month. Standard client billing is INR {fteRate} per FTE per month, which is INR {hourRate} an hour.
- FTE = required hours / {hoursPerFte}. Keep the exact FTE (60h = 0.375) unless told to round. Never default to 1 FTE. Estimate realistic hours first.
- Always show Hours, then FTE, then Cost.
- A commercial price given by the user overrides the standard rate. Keep it and scale from it. Do not correct it back.
- The client-facing price does not have to equal the FTE maths. The FTE table shows resourcing, the cost summary shows the price.
SCOPE RULES
- Maintenance is routine, non-structural upkeep: updates, security, backups, fixes, content and banner updates inside existing structures, hosting and SSL support, health checks.
- Maintenance never includes new pages, structural changes, redesign, new features, integrations or APIs. Those are separate development scope.
- SEO strategy, keywords, audits and reporting belong to the SEO team. Developer scope is only "Implementation of SEO recommendations provided by the SEO team".
- Never add an Account Manager unless asked. Never add a UI/UX Designer FTE if a developer does the work.
- Do not over-scope or invent requirements. Separate one-time development from recurring maintenance.
- Standard notes: exclusive of taxes; creatives beyond scope charged per the VAS rate card; extra after 3 rounds of changes; stock assets, software and reporting tools excluded; production and casting on project basis; 10% commission on ad spends; advance payment for media buying.`;

  const DECK = `TSL DECK STANDARDS
- Decks are short. Cut any slide that does not earn its place.
- One idea per slide. The headline states the point, not the topic.
- Never the default boxed or card-grid look. Suggest a diagram, graph, vector or illustration treatment for each slide.
- Every number has a source and date range on the slide. Unsourced numbers become labelled placeholders.
- Brand: Zoo Media decks are black and white. TSL decks are orange and black. Client decks follow the client's own brand.
- File names: ClientName_Deliverable_YYYYMMDD.`;

  const ACT = {
    tasks: `"tasks": [{"title": "what needs doing, one sentence", "department": "one of: Account Management, Art Static, Art Motion Graphic, Copy, Media, Tech", "owner": "name if stated, else empty", "due": "YYYY-MM-DD or empty"}]`,
    promises: `"promises": [{"promise": "what TSL or Zoo committed to, one sentence", "owner": "who on our side, if stated", "due": "YYYY-MM-DD or empty", "source": "where it was said"}]`,
    scope: `"scope": [{"ask": "what the client asked for", "match": "the SOW or rate card line it maps to, or 'Not in SOW or rate card'", "inScope": "yes, no or unclear", "price": "price from the rate card as text, or empty", "value": 0, "approval": "what written approval is needed, or empty"}]`,
    rules: `"rules": [{"rule": "a standing preference or objection of this client, written as an instruction for future drafts", "source": "the feedback it came from"}]`,
    pipeline: `"pipeline": [{"brand": "", "category": "", "side": "TSL, Other or Shared", "notes": "one sentence on why"}]`,
    deck: `"deck": [{"title": "slide headline that states the point", "bullets": ["full sentence", "full sentence"], "visual": "suggested visual treatment", "notes": "speaker note or empty"}]`,
  };

  const M = (id, n, name, line, from) => ({ id, n, name, line, from });
  const MODULES = [
    M('brief', '01', 'Brief Desk', 'Read any brief, see what is missing, and get the work routed.', 'Brief intake, client questionnaires, vendor briefs, research packs.'),
    M('pitch', '02', 'Pitch Studio', 'Turn a decoded brief into an insight, routes, a deck and a rehearsal.', 'Pitch and strategy decks, creative routes, deck standards and QA, Client Twin.'),
    M('commercial', '03', 'Commercial Engine', 'Price every scope and every ask, and check contracts before anyone signs.', 'FTE proposals, rate card estimates, CE emails, fee models, contract reviews.'),
    M('meeting', '04', 'Meeting Room', 'Turn calls, voicenotes and threads into minutes, tasks and drafts.', 'MoMs, call notes, client thread digests, the daily triage brief.'),
    M('delivery', '05', 'Delivery Board', 'Keep timelines, grids and revision lists live, with owners and dates.', 'Gantt timelines, activity grids, feedback-to-revision docs.'),
    M('make', '06', 'Make Lab', 'Start pages, films, calendars and prompts. A person directs the finish.', 'Prototype sites, launch films, social calendars, key visual prompts.'),
    M('proof', '07', 'Proof and Reports', 'Build and review monthly reports, and turn results into case studies.', 'The reporting standard, report reviews, case studies.'),
    M('growth', '08', 'Growth Desk', 'Tag leads, track pitches and catch renewals early.', 'Lead bifurcation, pitch pipeline, retainer expansion, BD FAQ.'),
  ];

  // field helpers
  const client = (req) => ({ k: 'client', label: 'Client', type: 'client', req: !!req });
  const mat = (label, ph, req = true) => ({ k: 'material', label, type: 'material', ph, req });
  const txt = (k, label, ph) => ({ k, label, type: 'text', ph });
  const area = (k, label, ph) => ({ k, label, type: 'area', ph });
  const sel = (k, label, options) => ({ k, label, type: 'select', options });
  const AUD = sel('audience', 'Who reads it', ['Client-facing', 'Internal']);

  const TOOLS = [
    /* ---------- 01 Brief Desk ---------- */
    { id: 'brief-decode', mod: 'brief', name: 'Decode a brief', blurb: 'Drop in what the client sent. Red Thread reads it, asks only what is missing, then writes a one-page synopsis and routes tasks by department.', special: 'brief' },
    { id: 'questionnaire', mod: 'brief', name: 'Client questionnaire', blurb: 'An onboarding questionnaire for a new client, covering business, brand, website, leads and support scope.', exports: ['docx'],
      fields: [client(true), sel('scope', 'Engagement', ['Integrated digital', 'Social media', 'Performance media', 'SEO / AEO / GEO', 'Website build or revamp', 'Production', 'Marketplaces']), mat('What we know so far', 'Paste the brief, the call notes or the website copy.', false)],
      prompt: `Write a client onboarding questionnaire for this engagement. Group questions under: Business and goals, Brand and audience, Current channels and access, Website and tracking, Leads and sales process, Approvals and ways of working, Support scope. Skip any question the material already answers and list those answers first under "What we already know". Keep it to the questions that change how we work. Mark each question as Must have or Good to have.` },
    { id: 'vendor-brief', mod: 'brief', name: 'Brief a partner or vendor', blurb: 'A clean outbound brief for a production house, creator agency or media partner.', exports: ['docx'],
      fields: [client(true), txt('vendor', 'Partner', 'For example Yuvaa, a production house, a KOL agency'), mat('Campaign context', 'Paste the plan, the activity grid or the client mail.'), area('ask', 'What we need from them', 'Budget range, cities, duration, formats.')],
      prompt: `Write the brief TSL sends to this partner. Sections: Brand and campaign in three sentences, The ask, Audience, Formats we prefer and formats to avoid, Cities and timeline, Budget range (ask for a quote at both ends if a range is given), Non-negotiables, What we need back and by when, Open items. Do not include TSL's internal budget heads or margins.` },
    { id: 'research-pack', mod: 'brief', name: 'Research and briefing pack', blurb: 'Turn raw material into a briefing document that guides the creative and design teams.', exports: ['docx'], brain: true,
      fields: [client(true), txt('topic', 'What the team needs to understand', 'For example the mobile category for a relaunch'), mat('Material', 'Paste audits, competitor notes, reports or links with their text.')],
      prompt: `Build a briefing pack for the creative and design teams from this material only. Sections: What the client needs, What the material tells us (each point with its source), Competitors named in the material and what they do, Audience, Implications for creative, Implications for design, What we still need to find out (as a research to-do list with where to look). Separate facts from your reading of them.`, acts: ['tasks'] },
    { id: 'onboarding-kit', mod: 'brief', name: 'Onboarding kit', blurb: 'Kickoff agenda, access tracker and internal handover for a client that has just been won.', exports: ['docx', 'xlsx'],
      fields: [client(true), mat('Scope and contract summary', 'Paste the SOW, proposal or the won-pitch notes.'), txt('start', 'Start date', 'YYYY-MM-DD')],
      prompt: `Build the onboarding kit. 1. Kickoff meeting agenda with timings. 2. Access and asset tracker as a table: Item, Why we need it, Owner on client side, Status. 3. First 30 days as a week-by-week table. 4. Internal handover note: scope in five bullets, what was promised in the pitch, risks, who does what by department. Keep the handover internal and say so.`, acts: ['tasks', 'promises'] },

    /* ---------- 02 Pitch Studio ---------- */
    { id: 'pitch-factory', mod: 'pitch', name: 'Pitch Factory', blurb: 'Brief in, pitch kit out: the insight, two or three routes, a slide-by-slide deck and the commercial pointers.', exports: ['docx', 'pptx'], brain: true, tier: 'complex',
      fields: [client(true), mat('The brief', 'Paste the brief, or pull a decoded brief from Brief Desk.'), sel('routes', 'Creative routes', ['2', '3']), area('steer', 'Steer from the team', 'Anything the client has already said no to, a must-have, a budget.')],
      prompt: `Build a pitch kit. Follow the client rules exactly, they come from past feedback.
1. The problem in two sentences.
2. The insight, stated as a human truth, with what in the material supports it.
3. The creative routes asked for. Each has a name, the idea in two sentences, how it shows up on three channels, one hero execution, and the honest risk.
4. A recommendation: which route and why.
5. The deck, slide by slide, following the deck standards.
6. Commercial pointers: what to scope, what to keep out, what needs a separate estimate.
7. What we still need from the client.
If the Agency Brain has relevant past work, cite it by title as proof.\n\n${DECK}`, acts: ['deck', 'tasks'] },
    { id: 'creative-routes', mod: 'pitch', name: 'Creative routes', blurb: 'From brief to insight, big idea, key visual, copy and production notes.', exports: ['docx'], brain: true, tier: 'complex',
      fields: [client(true), mat('Brief or strategy', 'Paste the brief or the approved strategy.'), sel('bar', 'How far to push', ['Safe and sellable', 'Bold', 'Award-calibre, not safe'])],
      prompt: `Act as creative director. Give three distinct routes. For each: the insight, the big idea in one line, the key visual described so an art director can sketch it, a headline and two lines of copy, three social executions, one offline or stunt idea, and what could make the client say no. Then say which you would lead with. Vanilla ideas are a failure here. Follow the client rules.` },
    { id: 'deck-builder', mod: 'pitch', name: 'Deck builder', blurb: 'Turn notes or a strategy into a slide-by-slide deck that follows TSL deck standards, with a PowerPoint skeleton.', exports: ['pptx', 'docx'],
      fields: [client(true), sel('kind', 'Deck type', ['Pitch', 'Strategy', 'Campaign', 'Monthly content calendar', 'Launch plan', 'Credentials', 'Case study']), AUD, mat('Content', 'Paste the notes, approach note or data.'), txt('slides', 'Target slide count', 'Leave blank to let Red Thread decide')],
      prompt: `Write the deck slide by slide. For each slide give the headline, the body as full sentences, the suggested visual treatment and a speaker note. Explain the slide count in two lines before the slides. Keep it short.\n\n${DECK}`, acts: ['deck'] },
    { id: 'deck-qa', mod: 'pitch', name: 'Deck QA', blurb: 'Check a deck before it leaves: numbers without sources, internal data, length, AI-sounding copy, ASCI risk and inconsistencies.', exports: ['docx'],
      fields: [client(false), AUD, mat('Deck text', 'Attach the PPTX or PDF, or paste the slide text.')],
      prompt: `QA this deck. Return a table: Slide, Issue, Severity (Blocker, Fix, Nit), Fix. Check for: numbers with no source or date range, numbers that do not add up, internal cost or margin or staffing data in a client-facing deck, slides that are too long, leftover template text, duplicate text, inconsistent names or dates, AI-sounding phrasing, em dashes, hedging that reads as excuse-making, ASCI risk, and anything that breaks the client rules. Start with a one-line verdict: Send, Fix then send, or Do not send.\n\n${DECK}` },
    { id: 'twin-review', mod: 'pitch', name: 'Client Twin review', blurb: 'The Twin reads a draft the way this client would and tells you what they will push back on.', exports: ['docx'], twin: true, tier: 'complex',
      fields: [client(true), mat('The draft', 'Attach or paste the deck, document or email going to the client.')],
      prompt: `You are the Client Twin for this client. You have their standing rules and past feedback. Read the draft as their decision-maker would.
Return: 1. Verdict in one line. 2. What they will push back on, as a table: Where, What they will say, Which rule or past feedback this comes from, How to fix it before sending. 3. What they will like. 4. Questions they will ask that the draft does not answer.
Only predict from the rules and feedback given. If there are fewer than three rules, say the Twin has not learned enough about this client yet and give a general senior-client read, clearly labelled as general.` },
    { id: 'rehearsal', mod: 'pitch', name: 'Pitch rehearsal', blurb: 'Pitch out loud or in text. The Twin answers as the client, with the objections they have raised before.', special: 'chat', twin: true,
      fields: [client(true), mat('What you are pitching', 'Paste the deck text or the route, so the Twin knows the material.', false)],
      prompt: `Role-play the client's senior decision-maker in a pitch meeting. Stay in character. React to what the account manager says in two to four sentences, raise one objection or question at a time, and base your objections on the client rules and past feedback provided. Be realistic, not hostile. If the manager types "debrief", step out of character and give three things that landed, three that did not, and the one answer to prepare better.` },

    /* ---------- 03 Commercial Engine ---------- */
    { id: 'cost-proposal', mod: 'commercial', name: 'Cost proposal', blurb: 'Scope to hours to FTE to price, in the TSL digital proposal layout, ready for Excel.', exports: ['xlsx', 'docx'], gated: true, costing: true,
      fields: [client(true), sel('kind', 'Engagement type', ['Monthly retainer', 'One-time project', 'Retainer plus project']), mat('Client scope or brief', 'Paste the scope of work, RFP or brief.'), txt('price', 'Commercial price, if already decided', 'For example 3,25,000 a month. Leave blank to use the standard rate.'), area('steer', 'Notes', 'People already on the account, anything to exclude.')],
      prompt: `Build the TSL digital cost proposal.
1. A short note on how you split the scope: maintenance, development, SEO, SEO implementation, design, account management, hosting.
2. Table "Scope": Activity | Units | Description of Activities, grouped under service headings.
3. Table "Cost Summary": Particulars | Cost Estimate.
4. Table "TSL Resourcing": Department | Designation | Hours | FTE, with a Total FTE row. Skip this table for one-time projects unless asked.
5. Notes and exclusions.
6. Internal check (not for the client): hours, FTE and cost at the standard rate against the price quoted, and whether the price covers the effort.` },
    { id: 'price-ask', mod: 'commercial', name: 'Price an ask', blurb: 'A client just asked for something. See the SOW or rate card line, the price and the approval you need before you say yes.', gated: true, commercials: true,
      fields: [client(true), mat('What the client asked for', 'Paste the email, WhatsApp message or meeting note.')],
      prompt: `Match each ask in this message against the client's SOW or rate card in the commercials block. For each ask give: the line it maps to (quote the line number and wording), whether it is in scope, the price from the rate card, and what written approval is needed before work starts. If an ask is not on the rate card, say it needs an addendum or a separate estimate and do not invent a price. Keep agency fees separate from vendor and talent costs. If no commercials are saved for this client, say so first and list what to upload. End with a two-line reply the account manager can send to hold the ask until it is approved.`, acts: ['scope'] },
    { id: 'ce-email', mod: 'commercial', name: 'Cost estimate email', blurb: 'A commercial email with numbered sections and explicit rate card references.', exports: ['docx', 'gmail'], gated: true, commercials: true,
      fields: [client(true), mat('What is being billed', 'List the deliverables, or paste the thread.'), txt('to', 'Send to', 'client@example.com')],
      prompt: `Draft the cost estimate email. Use numbered sections, one per workstream. In each: what was delivered or is proposed, the rate card line it is billed against (number and wording), the amount, and whether the rate includes GST as the rate card states. Keep agency fees separate from vendor and talent costs. Add a total table and recompute the total from the lines. Flag anything with no rate card line as needing an addendum. Start with "Subject:" on the first line. Add [NEEDS REVIEW] at the top, because this email carries prices.` },
    { id: 'contract-review', mod: 'commercial', name: 'Contract and addendum review', blurb: 'Review a contract, addendum, DPA or work order against TSL standard positions before anyone signs.', exports: ['docx'], gated: true, tier: 'complex',
      fields: [client(true), sel('doc', 'Document', ['Services agreement / MSA', 'Addendum', 'Data processing addendum', 'SOW / Work order', 'Tender terms', 'NDA']), sel('entity', 'Our entity', ['Starter Labs Consulting LLP', 'Zoo Media Private Limited']), mat('The document', 'Attach the DOCX or PDF, or paste the clauses.')],
      prompt: `Review this document for the agency. Return a table: Clause, What it says, Risk (High, Medium, Low), Our position, Suggested redline. Check: correct entity names, scope and what counts as out of scope, fees and payment terms, the annual escalation (TSL standard is a 10% retainer increase at the end of each contract year), KPIs and any penalty or variable fee, IP ownership and portfolio rights, confidentiality, data protection and sub-processors (list only our actual sub-processors), termination and notice, liability cap, non-solicit, governing law. Then list what is missing. Then give a short cover note for the client explaining our changes with reasons. You are not a lawyer: mark every High item as needing legal or founder sign-off.`, acts: ['promises'] },
    { id: 'fee-model', mod: 'commercial', name: 'Fee model evaluation', blurb: 'Test a performance-linked or variable fee before you agree to it.', exports: ['xlsx', 'docx'], gated: true, costing: true,
      fields: [client(true), mat('The fee the client proposed', 'Paste the proposal: percentages, ROAS links, KPI buckets, slabs.'), area('numbers', 'Numbers we have', 'Monthly sales, ad spend, team hours. Only real figures.')],
      prompt: `Evaluate this fee structure for the agency. 1. Restate the mechanism in plain words. 2. Build a scenario table (low, expected, high) using only the numbers supplied. Where a number is missing, show the formula and mark the input as [MISSING]. 3. Compare the fee in each scenario against the cost of the team at the standard FTE rate. 4. List the risks that sit with the agency but are outside its control (returns, stock, client-side delays). 5. Recommend a counter-position with a floor, a clear base for the percentage and a payment rhythm. Internal document.` },
    { id: 'proof-pack', mod: 'commercial', name: 'Proof of service index', blurb: 'Match a PO to what was delivered, so finance can raise the invoice with proof attached.', exports: ['docx', 'xlsx'], gated: true, commercials: true,
      fields: [client(true), mat('The PO and the deliverables', 'Paste the PO line items and the list of deliverables with links.')],
      prompt: `Build a proof of service index. Table: PO line, Amount, Rate card line, Deliverable, Date delivered, Proof (file name or link from the material), Client approval reference. Flag any PO line with no proof and any deliverable with no PO line. Recompute the total and say if it differs from the PO.` },
    { id: 'renewal-case', mod: 'commercial', name: 'Renewal case', blurb: 'What we promised, what we delivered and the uplift to ask for, drawn from the Promise Ledger.', exports: ['docx'], gated: true, ledger: true,
      fields: [client(true), mat('Results and context', 'Paste results for the contract year and anything the client has said about renewal.', false), txt('uplift', 'Uplift we want', 'For example 10% per the contract, or 18%')],
      prompt: `Write the internal renewal case. 1. Promises kept and missed, from the Promise Ledger, each with evidence. 2. Results, sourced. 3. Out-of-scope work we absorbed, from the Scope Ledger. 4. The ask: the uplift and how to justify it. 5. The client's likely objections and our answers. 6. Timeline: internal alignment 70 to 90 days before expiry, client conversation 45 to 60 days before. Then a short client-facing renewal note that contains no internal cost data.` },

    /* ---------- 04 Meeting Room ---------- */
    { id: 'mom', mod: 'meeting', name: 'Minutes of meeting', blurb: 'Notes or a transcript in, minutes in the TSL format out, with a follow-up email and tasks.', exports: ['docx', 'gmail'],
      fields: [client(true), txt('title', 'Meeting', 'For example Weekly status, 12 Nov'), mat('Notes or transcript', 'Paste Meet or Gemini notes, your own notes or a transcript.'), txt('to', 'Follow-up goes to', 'client@example.com')],
      prompt: `Write minutes of meeting in this format: a header with Title, Type, Date and Attendees; numbered discussion sections, each with the decision or outcome first; a Next steps table with Action, Owner and Due date; and a Flags section for anything unclear, contradictory or commercially sensitive. Then add a section "Follow-up email" with a draft that starts with "Subject:". If the notes mention price, scope or timeline changes, put [NEEDS REVIEW] at the top of the email.`, acts: ['tasks', 'promises', 'scope'] },
    { id: 'call-notes', mod: 'meeting', name: 'Call or voicenote notes', blurb: 'Turn a rambling call transcript or voicenote into tabulated pointers.', exports: ['docx'],
      fields: [client(true), mat('Transcript', 'Paste the transcript. Audio files cannot be read in this build, so transcribe first or dictate with the mic.')],
      prompt: `Turn this into clear, tabulated notes. Group by topic. Under each topic use a table with the columns that fit the content. Keep names, dates and figures exactly as said. Mark anything inaudible, cut off or ambiguous. End with Next steps (Action, Owner, Due) and Flags. If the notes cover internal commercials, say "Internal only, not for client circulation" at the top.`, acts: ['tasks', 'promises'] },
    { id: 'thread-digest', mod: 'meeting', name: 'Client thread digest', blurb: 'Every open thread with a client in one tracker: what needs us, what is waiting on them, what is closed.', exports: ['docx'],
      fields: [client(true), mat('Threads', 'Use "Pull from Gmail" to bring in threads, or paste them.')],
      prompt: `Summarise these threads as an internal tracker. Table 1 "Needs action from us": Item, Owner, Due, Next step. Table 2 "Waiting on the client": Item, Owner on their side, Last sent, Waiting for. Table 3 "Cost estimates": Item, Amount, Rate card line if stated, Client position. Then Closed items in one line each, and Flags in one line each. Use only what the threads say.`, acts: ['tasks', 'promises', 'scope'] },
    { id: 'reply', mod: 'meeting', name: 'Draft a reply', blurb: 'A reply in your voice, saved as a Gmail draft. Red Thread never sends.', exports: ['gmail'],
      fields: [client(false), mat('The message to answer', 'Paste the email or pull the thread from Gmail.'), area('steer', 'What you want to say', 'The gist. Red Thread writes it properly.'), txt('to', 'Send to', 'client@example.com')],
      prompt: `Draft the reply. Start with "Subject:". Be direct and warm, no hedging that reads as an excuse. If the reply touches price, scope, timelines, contract terms or performance numbers, put [NEEDS REVIEW] on the first line of the body.` },
    { id: 'daily-brief', mod: 'meeting', name: 'Daily brief', blurb: 'Your inbox since yesterday, sorted by urgency, with the action for each item.',
      fields: [mat('Inbox', 'Use "Pull from Gmail" with a query such as newer_than:1d, or paste what came in.')],
      prompt: `Write a triage brief in this order: Act now, Today, Waiting on others, Drafts worth writing, Ignored (a count only), Anything unclear. One sentence per item covering who, what, by when and the proposed action. Readable on a phone.`, acts: ['tasks'] },

    /* ---------- 05 Delivery Board ---------- */
    { id: 'timeline', mod: 'delivery', name: 'Engagement timeline', blurb: 'A priority list and meeting notes in, a week-by-week timeline out, with client inputs and delivery dates.', exports: ['xlsx', 'docx'],
      fields: [client(true), mat('Priorities, old timeline, latest minutes', 'Paste or attach whatever exists.'), txt('window', 'Window', 'For example 26 Oct 2026 to 29 Mar 2027')],
      prompt: `Build the engagement timeline. Table 1 "Timeline": Priority, Deliverable, Owner (role, not a name unless given), Start week, Delivery week, Depends on, Status. Table 2 "Client inputs": Input needed, From whom, Needed by, Blocks which deliverable. Table 3 "Completed". Then list every conflict between the sources and how you resolved it, and every date that falls in a holiday or closure mentioned in the material.`, acts: ['tasks', 'promises'] },
    { id: 'activity-grid', mod: 'delivery', name: 'Campaign activity grid', blurb: 'One row per idea, with KOL quantities and budget heads, ready for Sheets.', exports: ['xlsx'],
      fields: [client(true), mat('Campaign plan and feedback', 'Paste the plan, the approved deck text and the client feedback.')],
      prompt: `Build three tables. "Activity Grid": ID, Idea, Month, Format, Cities, Owner, KOL quantity, Budget head, Budget, Status. "KOLs": Idea ID, Creator, City, Tier, Quote, Status. "Budget Division": Budget head, Approved amount, Allocated, Balance. Use TBD where a name or budget is not known and never guess one. Apply the client feedback and list what changed because of it.`, acts: ['tasks'] },
    { id: 'revisions', mod: 'delivery', name: 'Feedback to revisions', blurb: 'Client feedback in, a clean revision list out, with what to change and prompts for visual fixes. The Twin learns from it.', exports: ['docx'],
      fields: [client(true), mat('The feedback', 'Paste the email, call notes or comments.'), area('work', 'The work it refers to', 'Slide titles or asset names, so each note maps to something.')],
      prompt: `Turn this feedback into a revision list. Table: Asset or slide, Client's words (short), Status (Approved, Approved with changes, Rejected, Dropped), Exact change to make, Owner department. For any visual change, add an image-edit prompt a designer can paste into an image tool. Then "What this tells us about the client": standing preferences that should apply to all future work.`, acts: ['tasks', 'rules'] },

    /* ---------- 06 Make Lab ---------- */
    { id: 'prototype', mod: 'make', name: 'Prototype page', blurb: 'A working one-page prototype for a pitch, built from the brief and brand. Preview it here and download the HTML.', special: 'html', exports: ['html'], tier: 'complex',
      fields: [client(true), mat('Content', 'Paste the copy, deck text or approach note the page should carry.'), txt('brand', 'Brand colours and fonts', 'For example #ED2024 on near-black, Teko and Poppins'), area('feel', 'Reference and feel', 'Describe the reference site: layout, motion, mood.')],
      prompt: `Write one complete, self-contained HTML page (inline CSS and JavaScript, no external scripts, no remote images, Google Fonts links allowed). It must work on a phone. Use the client's brand, not TSL's. Give it real structure: a hero, three to five content sections, one interactive element that suits the content, and a clear close. Use only the content provided and label any placeholder as "[Placeholder: ...]". No lorem ipsum. Reply with the HTML only, starting with <!DOCTYPE html>.` },
    { id: 'site-brief', mod: 'make', name: 'Website art direction brief', blurb: 'A reference site and a client brand in, a page-by-page art direction brief out.', exports: ['docx'],
      fields: [client(true), mat('Current site content and the brief', 'Paste the site copy, the client brief and SEO notes.'), area('refs', 'Reference sites and what you like about each', 'Match the feel, adapt it to the client brand.')],
      prompt: `Write the art direction brief for the web team. Sitemap; then for each page: purpose, sections in order, the interaction or motion idea, imagery, and mobile behaviour. Then the design system: type, colour, components. Then rules: what must never repeat, what must stay from the current site, accessibility basics. Then open questions for the client. Match the feel of the references but do not copy their layout.`, acts: ['tasks'] },
    { id: 'film', mod: 'make', name: 'Launch film storyboard', blurb: 'A 20 to 30 second film from a website or brand copy: scenes, timing, supers and music.', exports: ['docx'],
      fields: [client(true), mat('Source material', 'Paste the site copy, taglines, stats and product lines.'), sel('len', 'Length', ['15 seconds', '20 to 25 seconds', '30 seconds', '45 seconds'])],
      prompt: `Write the storyboard as a table: Scene, Seconds, What we see, Motion, On-screen text, Sound. Use only copy and numbers from the material. Add a music direction, a poster frame and three lines of share copy. List any asset we need from the client.` },
    { id: 'calendar', mod: 'make', name: 'Social content calendar', blurb: 'A monthly calendar as a sheet you can paste into Canva bulk create or Google Sheets.', exports: ['xlsx'],
      fields: [client(true), txt('month', 'Month', 'December 2026'), mat('Strategy, pillars and key dates', 'Paste the content pillars, launches, offers and moments.'), txt('count', 'Posts per platform', 'For example 12 Instagram, 8 LinkedIn')],
      prompt: `Build the calendar as one table: Date, Platform, Pillar, Format, Hook, Caption, Visual direction, CTA, Status. Spread the pillars evenly, respect the key dates, and vary formats and hooks. Then list the moments you skipped and why. Follow the client rules.` },
    { id: 'prompts', mod: 'make', name: 'Key visual and video prompts', blurb: 'Production-ready prompts for image and video tools, from an approved idea.', exports: ['docx'],
      fields: [client(true), mat('The idea', 'Paste the approved route, key visual description or script.'), sel('tool', 'For', ['Image tools', 'Video tools', 'Both'])],
      prompt: `Write prompts a designer can paste straight in. For each asset: the prompt, the negative prompt, aspect ratio, and what to check in the output. Do not prompt for real people's likenesses, competitor brands or tournament branding without rights, and flag where rights or a model release are needed.` },

    /* ---------- 07 Proof and Reports ---------- */
    { id: 'report-builder', mod: 'proof', name: 'Monthly report builder', blurb: 'Data in, a report that explains why each number moved, in the TSL reporting standard.', exports: ['pptx', 'docx'],
      fields: [client(true), txt('period', 'Period', 'For example 1 to 31 Oct 2026'), mat('The data', 'Attach the sheet export or paste the numbers, with the platform they came from.')],
      prompt: `Write the monthly report to the TSL reporting standard: a report is not a screenshot dump. Slides: 1. The month in three sentences. 2. Scorecard against targets. 3. What worked and why. 4. What did not and why. 5. Content analysis at creative level: format, hook, story type, who is speaking, duration, and what the best and worst posts have in common. 6. Paid performance. 7. Learnings. 8. Plan for next month. 9. What we need from the client. Every number carries its source and date range. Read each number in context, against last month and target, never alone. Do not soften bad performance.`, acts: ['deck', 'tasks'] },
    { id: 'report-review', mod: 'proof', name: 'Report review', blurb: 'Score an account executive\'s report against the reporting standard and get the fixes.', exports: ['docx'],
      fields: [client(false), mat('The report', 'Attach the PPTX or PDF, or paste the slide text.')],
      prompt: `Review this client report against the TSL reporting standard, with the Sellers of Amazon India report as the benchmark. Score out of 10 on: Does each section say why it exists, Are numbers read in context, Is there creative-level content analysis, Are learnings specific, Is next month's plan tied to the learnings, Are sources and date ranges present. Then a table of fixes: Slide, Problem, Fix, Example rewrite. Be blunt and useful. This is internal feedback for the executive.` },
    { id: 'case-study', mod: 'proof', name: 'Case study', blurb: 'Results in, a case study out, with only sourced numbers.', exports: ['docx', 'pptx'], brain: true,
      fields: [client(true), mat('Campaign and results', 'Paste the campaign summary and the final numbers with sources.'), sel('format', 'Format', ['Deck', 'Carousel', 'One-pager', 'Award entry'])],
      prompt: `Write the case study: Challenge, Insight, Idea, Execution, Results, Credits. Results use only numbers from the material, each with source and date range. Any number without a source becomes a labelled placeholder and is listed at the end. Give a title and a one-line summary. Then the slide or frame breakdown for the chosen format.`, acts: ['deck'] },
    { id: 'content-analysis', mod: 'proof', name: 'Content analysis', blurb: 'What your best and worst posts have in common, at creative level.', exports: ['docx', 'xlsx'],
      fields: [client(true), mat('Post-level data', 'Attach the tracker export: post, format, hook, caption, reach, engagement.')],
      prompt: `Analyse the content at creative level. Table of the top five and bottom five posts with format, hook, story type, who is on camera, duration and the metric. Then patterns: what the top posts share, what the bottom posts share. Then three things to do more of, three to stop, three tests for next month. State the metric and date range used.` },

    /* ---------- 08 Growth Desk ---------- */
    { id: 'lead-tag', mod: 'growth', name: 'Tag leads', blurb: 'Classify new-business leads against the leadership category list and add them to the pipeline.', gated: true,
      fields: [mat('Leads', 'Paste brand names, one per line, with anything you know about each.')],
      prompt: `Tag each brand with exactly one category from the list, and the side it falls on. Table: Brand, Category, Side, Why.\nTSL side: ${CATS_TSL.join('; ')}.\nOther side: ${CATS_OTHER.join('; ')}.\nShared: ${CATS_SHARED.join('; ')}.\nIf you do not recognise a brand, say so and ask what it sells instead of guessing.`, acts: ['pipeline'] },
    { id: 'pipeline-report', mod: 'growth', name: 'Pipeline report', blurb: 'The founder report, written from the live pipeline.', exports: ['docx'], gated: true, pipeline: true,
      fields: [txt('period', 'Period', 'For example November 2026'), area('notes', 'Anything to add', 'Context the tracker does not hold.')],
      prompt: `Write the pitch pipeline report for the founder from the pipeline data. Won and onboarding first, then the rest by pitch date, earliest first. Sections: Headline in three sentences, Table by stage, What moved since last time if dates show it, Category mix against the leadership bifurcation, Risks and stuck pitches, Decisions needed. Use only the data given.` },
    { id: 'bd-faq', mod: 'growth', name: 'BD answer', blurb: 'Answer a prospect\'s question about the agency, with proof from the Agency Brain.', exports: ['docx'], brain: true,
      fields: [area('q', 'The prospect asked', 'For example: have you worked on beverage launches?'), txt('prospect', 'Prospect and category', '')],
      prompt: `Answer as TSL's business development lead would in an intro meeting: a direct answer in two or three sentences, then proof from the Agency Brain entries provided, cited by title. If the Brain has nothing relevant, say which proof is missing so someone can add it, and do not make any up.` },
    { id: 'upsell', mod: 'growth', name: 'Upsell finder', blurb: 'Where this account can grow, from the scope gaps and asks we have already logged.', exports: ['docx'], gated: true, ledger: true,
      fields: [client(true), mat('Anything else we know', 'Paste recent asks, results or plans.', false)],
      prompt: `Find upsell opportunities for this account. Use the Scope Ledger (asks outside scope are demand signals), the Promise Ledger and the client profile. Table: Opportunity, Evidence, What we would propose, How to price it (retainer change, project, rate card line), Who to speak to, When. Rank by likelihood. Internal document.` },
  ];

  window.RT_CFG = { HOUSE, COSTING, DECK, ACT, MODULES, TOOLS, CATS_TSL, CATS_OTHER, CATS_SHARED,
    DEPTS: ['Account Management', 'Art Static', 'Art Motion Graphic', 'Copy', 'Media', 'Tech'],
    STAGES: ['Lead', 'Qualified', 'Pitching', 'Proposal sent', 'Won', 'Onboarding', 'Lost', 'On hold'] };
})();
