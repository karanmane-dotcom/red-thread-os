/* Red Thread OS: founder view. Account economics, client health and money leakage on one screen.
   Every figure comes from data entered in Red Thread or written by the background agents.
   Nothing is invented: a missing input shows as missing, and estimates are labelled. */
(() => {
  'use strict';
  const RT = window.RT, { h, S, CFG, DATA, slug, btn, table, pill, head, section, modal, formModal, go } = RT;
  const V = RT.views;
  const kpi = (n, label, note, tone) => h('div', { class: 'rt-kpi' + (tone ? ' ' + tone : '') }, h('strong', {}, n), h('span', {}, label), note && h('em', {}, note));
  const month = () => RT.today().slice(0, 7);
  const weekKey = (d = new Date()) => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return `${t.getUTCFullYear()}-W${String(Math.ceil(((t - y) / 864e5 + 1) / 7)).padStart(2, '0')}`; };
  RT.weekKey = weekKey;

  /* ---------- allocation: who works on what ---------- */
  // Default: each person's month is split evenly across the brands the allocation sheet lists for them.
  // A saved split (os_alloc) replaces the default for that person.
  const people = () => DATA.roster.map((p) => { const saved = RT.rows('alloc').find((a) => a.id === slug(p.name)); return { ...p, id: slug(p.name), saved: !!saved, split: saved?.split || Object.fromEntries(p.brands.map((b) => [slug(b), Math.round(1000 / p.brands.length) / 10])) }; });
  const fteFor = (clientId) => { let fte = 0, est = 0, names = []; people().forEach((p) => { const pct = RT.num(p.split[clientId]); if (pct > 0) { fte += pct / 100; if (!p.saved) est++; names.push(`${p.name} ${pct}%`); } }); return { fte: Math.round(fte * 100) / 100, estimated: est, names }; };

  /* ---------- client health ---------- */
  // A rule-based score out of 100. Each deduction carries the reason that is shown next to it.
  const health = (c) => {
    const why = [], today = RT.today();
    let score = 100;
    const ded = (n, reason) => { score -= n; why.push(reason); };
    const pr = RT.rows('promises').filter((p) => p.client === c.id);
    const late = pr.filter((p) => (p.status || 'open') === 'open' && p.due && p.due < today).length, missed = pr.filter((p) => p.status === 'missed' && RT.daysTo(p.closedAt || p.at?.slice(0, 10)) > -90).length;
    if (late) ded(Math.min(30, late * 10), `${late} promise${late > 1 ? 's' : ''} overdue`);
    if (missed) ded(Math.min(30, missed * 15), `${missed} promise${missed > 1 ? 's' : ''} missed in the last 90 days`);
    const wait = RT.rows('scope').filter((s) => s.client === c.id && (s.status || 'logged') === 'logged' && s.inScope !== 'yes' && RT.daysTo(String(s.at).slice(0, 10)) < -7).length;
    if (wait) ded(Math.min(15, wait * 5), `${wait} client ask${wait > 1 ? 's' : ''} waiting more than a week for a decision`);
    const lateTasks = RT.rows('tasks').filter((t) => t.client === c.id && !t.done && t.due && t.due < today).length;
    if (lateTasks >= 3) ded(10, `${lateTasks} tasks past their due date`);
    const sig = RT.rows('signals').filter((s) => s.client === c.id).sort((a, b) => String(b.week).localeCompare(String(a.week))).slice(0, 4);
    if (sig.length) {
      const tone = sig.reduce((a, s) => a + RT.num(s.tone), 0) / sig.length;
      if (tone <= -1) ded(20, 'client tone in email has been negative over recent weeks');
      else if (tone < -0.3) ded(10, 'client tone in email has been cooling');
      if (sig.some((s) => s.escalation)) ded(20, 'an escalation or complaint in recent email');
      const rounds = Math.max(0, ...sig.map((s) => RT.num(s.revisionRounds)));
      if (rounds >= 3) ded(10, `${rounds} revision rounds on one piece of work recently`);
      const reply = sig.map((s) => RT.num(s.replyHours)).filter(Boolean);
      if (reply.length >= 2 && reply[0] > 2 * (reply.slice(1).reduce((a, x) => a + x, 0) / (reply.length - 1)) && reply[0] > 24) ded(10, 'the client is taking much longer to reply than before');
    }
    score = Math.max(0, score);
    const d = RT.daysTo(c.contractEnd);
    const renewal = d != null && d >= 0 && d <= 90;
    const anyData = sig.length || pr.length || RT.rows('scope').some((s) => s.client === c.id) || RT.rows('tasks').some((t) => t.client === c.id);
    let band = !anyData ? 'none' : score >= 80 ? 'green' : score >= 60 ? 'amber' : 'red';
    if (renewal && band === 'amber') why.push('and the contract is up for renewal within 90 days');
    return { score, band, why, signals: sig.length, renewal, days: d };
  };
  RT.health = health;

  /* ---------- economics ---------- */
  const econ = (c) => {
    const r = RT.rates(), a = fteFor(c.id), ret = RT.num(c.retainer);
    const value = Math.round(a.fte * r.fteRate);
    const cover = ret && value ? ret / value : null;
    return { ...a, ret, value, cover };
  };
  const leak = (rows) => { const sum = (f) => rows.filter(f).reduce((x, s) => x + RT.num(s.value), 0); return { logged: rows.filter((s) => s.inScope !== 'yes').length, unpriced: rows.filter((s) => s.inScope !== 'yes' && !RT.num(s.value)).length, waiting: sum((s) => s.inScope !== 'yes' && ['logged', 'approval asked'].includes(s.status || 'logged')), billed: sum((s) => ['approved', 'billed'].includes(s.status)), absorbed: sum((s) => s.status === 'absorbed') }; };

  const accounts = () => {
    const seen = new Set(DATA.roster.flatMap((p) => p.brands.map(slug)));
    return RT.clients().filter((c) => c.id !== 'tsl' && (seen.has(c.id) || c.retainer)).map((c) => ({ c, e: econ(c), hl: health(c), lk: leak(RT.rows('scope').filter((s) => s.client === c.id)) }));
  };

  /* ---------- the page ---------- */
  let sortBy = 'risk';
  V.founder = () => {
    if (!RT.can()) return h('p', { class: 'rt-note' }, 'The founder view is open to Account Management and managers.');
    const rows = accounts(), r = RT.rates();
    const withRet = rows.filter((x) => x.e.ret), noRet = rows.length - withRet.length, estPeople = people().filter((p) => !p.saved).length;
    const totRet = withRet.reduce((a, x) => a + x.e.ret, 0), totVal = withRet.reduce((a, x) => a + x.e.value, 0);
    const scopeM = RT.rows('scope').filter((s) => String(s.at).startsWith(month())), lkM = leak(scopeM), lkAll = leak(RT.rows('scope'));
    const red = rows.filter((x) => x.hl.band === 'red'), amber = rows.filter((x) => x.hl.band === 'amber');
    const under = withRet.filter((x) => x.e.cover != null && x.e.cover < 1);
    const ren = rows.filter((x) => x.hl.renewal);
    const pipe = RT.rows('pipeline'), live = pipe.filter((p) => !['Won', 'Onboarding', 'Lost', 'On hold'].includes(p.stage)), won = pipe.filter((p) => ['Won', 'Onboarding'].includes(p.stage)), lost = pipe.filter((p) => p.stage === 'Lost');
    const lastSweep = RT.rows('agent').find((a) => a.id === 'inbox')?.lastRun;
    const order = { risk: (a, b) => (a.hl.band === 'none') - (b.hl.band === 'none') || a.hl.score - b.hl.score, cover: (a, b) => (a.e.cover ?? 99) - (b.e.cover ?? 99), leak: (a, b) => b.lk.waiting + b.lk.absorbed - (a.lk.waiting + a.lk.absorbed), name: (a, b) => a.c.name.localeCompare(b.c.name) };
    const sorted = [...rows].sort(order[sortBy]);
    const coverCell = (x) => x.e.cover == null ? h('span', { class: 'quiet' }, x.e.ret ? 'No allocation' : 'Retainer missing') : h('span', { class: x.e.cover < 1 ? 'late' : '' }, x.e.cover.toFixed(2) + 'x');
    const seg = h('div', { class: 'rt-seg' }, [['risk', 'Riskiest first'], ['cover', 'Lowest coverage'], ['leak', 'Most leakage'], ['name', 'A to Z']].map(([k, l]) => h('button', { class: sortBy === k ? 'on' : '', onclick: () => { sortBy = k; RT.render(); } }, l)));

    return h('div', {}, head('Founder view', 'The agency this month', `What the accounts earn against the team they use, which clients are at risk, and where money leaks. Servicing value is allocated FTE at ${RT.inr(r.fteRate)} per FTE month, not salary cost.`, [btn('Enter retainers', bulkRetainers, 'primary'), btn('Set allocations', allocEditor)]),
      (noRet || estPeople) ? h('p', { class: 'rt-note' }, [noRet && `${noRet} of ${rows.length} accounts have no retainer entered, so their coverage is blank.`, estPeople && `${estPeople} of ${DATA.roster.length} people still use the default even split across their brands, so allocation is an estimate until their real split is set.`].filter(Boolean).join(' ')) : null,
      h('div', { class: 'rt-kpis' },
        kpi(RT.inr(totRet) || '₹0', 'monthly retainers entered', `${withRet.length} accounts`),
        kpi(totVal && totRet ? (totRet / totVal).toFixed(2) + 'x' : 'n/a', 'retainer against servicing value', totVal ? `${RT.inr(totVal)} of team time on those accounts` : 'Needs retainers and allocations', totVal && totRet / totVal < 1 ? 'warn' : ''),
        kpi(`${red.length} / ${amber.length}`, 'accounts red / amber on health', red.length ? red.map((x) => x.c.name).slice(0, 3).join(', ') : null, red.length ? 'warn' : ''),
        kpi(under.length, 'accounts earning less than the team time they use', under.slice(0, 3).map((x) => x.c.name).join(', ') || null, under.length ? 'warn' : '')),
      h('div', { class: 'rt-kpis' },
        kpi(lkM.logged, 'out-of-scope asks logged this month', lkM.unpriced ? `${lkM.unpriced} not priced yet` : null),
        kpi(RT.inr(lkM.waiting) || '₹0', 'priced and waiting for client approval'),
        kpi(RT.inr(lkM.billed) || '₹0', 'approved or billed this month'),
        kpi(RT.inr(lkM.absorbed) || '₹0', 'absorbed without billing this month', `${RT.inr(lkAll.absorbed) || '₹0'} absorbed in total`, lkM.absorbed ? 'warn' : '')),
      h('div', { class: 'rt-kpis' },
        kpi(ren.length, 'contracts up for renewal within 90 days', ren.map((x) => `${x.c.name} (${x.hl.days}d)`).slice(0, 3).join(', ') || null),
        kpi(live.length, 'pitches live', RT.inr(live.reduce((a, p) => a + RT.num(p.value), 0)) ? `${RT.inr(live.reduce((a, p) => a + RT.num(p.value), 0))} a month if all won` : null),
        kpi(won.length + lost.length ? `${Math.round((won.length / (won.length + lost.length)) * 100)}%` : 'n/a', 'win rate on decided pitches', `${won.length} won, ${lost.length} lost`),
        kpi(lastSweep ? RT.day(lastSweep) : 'Not yet', 'last inbox sweep', 'Health signals come from it')),
      section('Accounts', [seg, table([
        { h: 'Account', f: (x) => h('div', {}, h('strong', {}, x.c.name), x.e.names.length ? h('p', { class: 'rt-help' }, x.e.names.join(', ')) : null) },
        { h: 'Health', f: (x) => x.hl.band === 'none' ? h('span', { class: 'quiet' }, 'No data yet') : h('div', {}, pill(`${x.hl.score}`, x.hl.band === 'red' ? 'red' : x.hl.band === 'green' ? 'green' : 'amber'), x.hl.why.length ? h('p', { class: 'rt-help' }, x.hl.why.join('; ') + '.') : h('p', { class: 'rt-help' }, x.hl.signals ? 'No warning signs.' : 'No warning signs logged yet.')), w: '260px' },
        { h: 'Retainer', f: (x) => x.e.ret ? RT.inr(x.e.ret) : h('span', { class: 'quiet' }, 'Missing'), w: '110px' },
        { h: 'Team FTE', f: (x) => x.e.fte ? h('span', {}, x.e.fte, x.e.estimated ? h('span', { class: 'rt-help' }, ' est.') : null) : '0', w: '90px' },
        { h: 'Coverage', f: coverCell, w: '100px' },
        { h: 'Leakage', f: (x) => (x.lk.waiting || x.lk.absorbed || x.lk.unpriced) ? h('div', {}, x.lk.waiting ? h('div', {}, RT.inr(x.lk.waiting) + ' waiting') : null, x.lk.absorbed ? h('div', { class: 'late' }, RT.inr(x.lk.absorbed) + ' absorbed') : null, x.lk.unpriced ? h('div', { class: 'rt-help' }, x.lk.unpriced + ' unpriced') : null) : '', w: '140px' },
        { h: 'Renewal', f: (x) => x.hl.days == null ? '' : h('span', { class: x.hl.renewal ? 'late' : '' }, x.hl.days < 0 ? 'Expired' : x.hl.days + ' days'), w: '90px' },
      ], sorted, { onRow: (x) => go('os-c-' + x.c.id), empty: 'No accounts yet.' })]),
      section('Leakage to act on', leakList()),
      h('details', { class: 'rt-how' }, h('summary', {}, 'How these numbers are worked out'), h('ul', { class: 'rt-list' }, [
        `Team FTE adds up each person's share of their month on the account. By default a person's month is split evenly across the brands the allocation sheet lists for them. Use "Set allocations" to enter the real split.`,
        `Servicing value is that FTE at ${RT.inr(r.fteRate)} per FTE month, the standard billing rate in Setup. It is not salary cost, which Red Thread does not hold.`,
        'Coverage is the monthly retainer divided by the servicing value. Below 1.00x means the account uses more team time than it pays for at the standard rate.',
        'Health starts at 100. It loses points for overdue or missed promises, client asks left waiting, a pile of late tasks, and for signals the inbox sweep reads in email: negative tone, escalations, long revision cycles and slowing replies. Green is 80 and above, amber 60 to 79, red below 60.',
        'Leakage counts only asks someone logged and only values someone entered or the rate card stated.',
      ].map((t) => h('li', {}, t)))));
  };

  const leakList = () => {
    const rows = RT.rows('scope').filter((s) => s.inScope !== 'yes' && ['logged', 'approval asked'].includes(s.status || 'logged')).sort((a, b) => RT.num(b.value) - RT.num(a.value) || String(a.at).localeCompare(String(b.at))).slice(0, 15);
    return table([
      { h: 'Client', f: (s) => RT.client(s.client)?.name || s.client, w: '140px' },
      { h: 'Ask', f: (s) => h('div', {}, s.ask, h('p', { class: 'rt-help' }, `Logged ${RT.day(s.at)} by ${s.by || 'unknown'}` + (s.estimateDrafted ? `. Estimate drafted ${RT.day(s.estimateDrafted)}.` : ''))) },
      { h: 'Value', f: (s) => RT.inr(s.value) || s.price || h('span', { class: 'quiet' }, 'Not priced'), w: '110px' },
      { h: 'Next step', f: (s) => h('div', { class: 'rt-row wrap' }, h('button', { class: 'rt-link', onclick: () => draftEstimate(s) }, 'Draft the estimate'), h('button', { class: 'rt-link quiet', onclick: () => absorb(s) }, 'Absorb')), w: '190px' },
    ], rows, { empty: 'Nothing waiting. Asks logged by people or the inbox sweep appear here until someone prices them, bills them or absorbs them.' });
  };
  const draftEstimate = (s) => { RT.prefill = { tool: 'ce-email', client: s.client, material: `Client ask logged on ${RT.day(s.at)}:\n${s.ask}${s.match ? '\nMaps to: ' + s.match : ''}${s.price ? '\nRate card price noted: ' + s.price : ''}\n\nDraft a cost estimate email for this ask, billed against the rate card, asking for written approval before work starts.`, scopeId: s.id }; go('os-t-ce-email'); };
  const absorb = (s) => formModal({ title: 'Absorb without billing', saveLabel: 'Absorb', fields: [{ k: 'reason', label: 'Why are we not billing this?', type: 'area', rows: 2, ph: 'For example: goodwill ahead of renewal, our error, too small to bill.' }, { k: 'value', label: 'Value of the work (INR), if known', type: 'number' }], values: { value: s.value || '' }, save: (v) => { if (!v.reason.trim()) { RT.toast('Give a reason. The founder view shows it.'); return false; } RT.patch('scope', s.id, { status: 'absorbed', absorbReason: v.reason.trim(), value: RT.num(v.value) || RT.num(s.value), absorbedBy: S.me?.name, absorbedAt: RT.today() }); } });

  /* ---------- data entry ---------- */
  const bulkRetainers = () => {
    const ta = h('textarea', { class: 'rt-in', rows: 10, placeholder: 'One account per line: Client, monthly retainer, contract end date\nMogu Mogu, 500000, 2027-03-31\nSA Tourism, 350000\nBhor, 275000, 2027-06-30' });
    const existing = RT.clients().filter((c) => c.retainer).map((c) => `${c.name}, ${c.retainer}${c.contractEnd ? ', ' + c.contractEnd : ''}`).join('\n'); ta.value = existing;
    modal({ title: 'Enter retainers', wide: true, body: [h('p', { class: 'rt-help' }, 'Paste from your expansion sheet. Names are matched to clients in Red Thread; a name it does not know is added as a new client. Amounts are monthly, in INR, without GST. Dates are YYYY-MM-DD.'), ta], actions: [{ label: 'Save', kind: 'primary', fn: () => {
      const lines = ta.value.split('\n').map((l) => l.trim()).filter(Boolean), bad = []; let n = 0;
      lines.forEach((l) => { const parts = l.split(/\t|,(?=\s*[\d₹])|,\s*(?=\d{4}-\d{2}-\d{2})/).map((x) => x.trim()); const name = parts[0], amt = RT.num(parts[1]), date = (l.match(/\d{4}-\d{2}-\d{2}/) || [])[0]; if (!name || !amt) { bad.push(l); return; } const c = RT.clients().find((x) => x.name.toLowerCase() === name.toLowerCase() || x.id === slug(name)); RT.saveClient(c?.id || slug(name), { name: c?.name || name, retainer: amt, ...(date ? { contractEnd: date } : {}) }); n++; });
      RT.toast(`Saved ${n} retainer${n === 1 ? '' : 's'}.` + (bad.length ? ` ${bad.length} line${bad.length === 1 ? '' : 's'} skipped: no amount found.` : ''));
    } }] });
  };
  const allocEditor = () => {
    const list = people(); let who = list[0]?.id;
    const box = h('div', {}), pick = h('select', { class: 'rt-in', onchange: () => { who = pick.value; paint(); } }, list.map((p) => h('option', { value: p.id }, `${p.name}, ${p.department}${p.saved ? '' : ' (default split)'}`)));
    const ins = {};
    const paint = () => {
      const p = list.find((x) => x.id === who); if (!p) return;
      const brands = [...new Set([...p.brands.map(slug), ...Object.keys(p.split)])];
      const total = h('p', { class: 'rt-help' });
      const upd = () => { const t = Object.values(ins).reduce((a, i) => a + RT.num(i.value), 0); total.textContent = `Total: ${t}% of ${p.name}'s month. ${t > 100 ? 'That is more than a full month.' : 'Anything not given to a client counts as non-client time.'}`; };
      Object.keys(ins).forEach((k) => delete ins[k]);
      RT.fill(box, h('div', { class: 'rt-form' }, brands.map((b) => { const i = h('input', { class: 'rt-in', type: 'number', min: '0', max: '100', oninput: upd }); i.value = p.split[b] ?? ''; ins[b] = i; return h('label', { class: 'rt-field half' }, h('span', { class: 'rt-label' }, (RT.client(b)?.name || b) + ' %'), i); })), total);
      upd();
    };
    paint();
    modal({ title: 'Set allocations', wide: true, body: [h('p', { class: 'rt-help' }, 'The share of each person\'s month spent on each client. Until you save a person, Red Thread splits their month evenly across the brands the allocation sheet lists for them.'), pick, box], actions: [{ label: 'Save this person', kind: 'primary', keep: true, fn: () => { const split = Object.fromEntries(Object.entries(ins).map(([k, i]) => [k, RT.num(i.value)]).filter(([, v]) => v > 0)); const p = list.find((x) => x.id === who); RT.put('alloc', { id: who, name: p.name, split }); p.saved = true; p.split = split; pick.selectedOptions[0].textContent = `${p.name}, ${p.department}`; RT.toast('Saved ' + p.name + '.'); } }] });
  };
})();
