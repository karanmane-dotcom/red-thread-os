/* Red Thread OS: shell, router, home, module pages and the tool runner. */
(() => {
  'use strict';
  const RT = window.RT, { h, S, CFG, DATA, esc, slug } = RT;
  const V = (RT.views = {});
  const tool = (id) => CFG.TOOLS.find((t) => t.id === id);
  const go = (RT.go = (hash) => { location.hash = hash; });
  const link = (hash, label, cls) => h('a', { href: '#' + hash, class: cls || 'rt-link' }, label);

  /* ---------- primitives ---------- */
  const btn = (RT.btn = (label, onclick, kind = '') => h('button', { type: 'button', class: 'rt-btn ' + kind, onclick }, label));
  RT.toast = (msg, action) => {
    const t = h('div', { class: 'rt-toast' }, h('span', {}, msg), action && h('button', { onclick: () => { action.fn(); t.remove(); } }, action.label));
    document.getElementById('rt-toasts')?.append(t); setTimeout(() => t.remove(), action ? 7000 : 3800);
  };
  let modalOpen = 0, dirty = false;
  const modal = (RT.modal = ({ title, body, actions = [], wide }) => {
    modalOpen++;
    const close = () => { if (!wrap.isConnected) return; wrap.remove(); modalOpen--; if (!modalOpen && dirty) { dirty = false; render(); } };
    const wrap = h('div', { class: 'rt-scrim', onmousedown: (e) => e.target === wrap && close() },
      h('div', { class: 'rt-modal' + (wide ? ' wide' : ''), role: 'dialog', 'aria-label': title },
        h('div', { class: 'rt-modal-h' }, h('h3', {}, title), h('button', { class: 'rt-x', 'aria-label': 'Close', onclick: close }, '×')),
        h('div', { class: 'rt-modal-b' }, body),
        actions.length ? h('div', { class: 'rt-modal-f' }, actions.map((a) => btn(a.label, async () => { const r = await a.fn(close); if (r !== false && !a.keep) close(); }, a.kind || ''))) : null));
    document.getElementById('rtos').append(wrap);
    setTimeout(() => wrap.querySelector('input,textarea,select')?.focus(), 30);
    return { close, el: wrap };
  });
  const clientSelect = (value, onchange) => {
    const s = h('select', { class: 'rt-in', onchange: () => { if (s.value === '__new') { s.value = ''; addClient((c) => { s.append(h('option', { value: c.id }, c.name)); s.value = c.id; onchange && onchange(); }); } else onchange && onchange(); } },
      h('option', { value: '' }, 'Choose a client'), RT.clients().map((c) => h('option', { value: c.id }, c.name)), h('option', { value: '__new' }, '+ Add a client'));
    s.value = value || ''; return s;
  };
  const addClient = (RT.addClient = (then) => {
    const f = form([{ k: 'name', label: 'Client name', type: 'text' }, { k: 'agency', label: 'Agency on the account', type: 'select', options: ['The Starter Labs', 'Zoo Media', 'TSL and Zoo'] }]);
    modal({ title: 'Add a client', body: f.el, actions: [{ label: 'Add client', kind: 'primary', fn: () => { const v = f.get(); if (!v.name.trim()) { RT.toast('Give the client a name.'); return false; } const c = RT.saveClient(slug(v.name), { name: v.name.trim(), agency: v.agency }); then && then(c); } }] });
  });
  // Simple form: fields [{k,label,type,options,ph,rows}] -> {el, get, set}
  const form = (RT.form = (fields, values = {}) => {
    const ins = {};
    const el = h('div', { class: 'rt-form' }, fields.map((f) => {
      let i;
      if (f.type === 'select') { i = h('select', { class: 'rt-in' }, f.options.map((o) => h('option', { value: o }, o))); if (!f.req) i.prepend(h('option', { value: '' }, '')); }
      else if (f.type === 'client') i = clientSelect(values[f.k]);
      else if (f.type === 'area') i = h('textarea', { class: 'rt-in', rows: f.rows || 4, placeholder: f.ph || '' });
      else i = h('input', { class: 'rt-in', type: f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text', placeholder: f.ph || '' });
      if (f.type !== 'client') i.value = values[f.k] ?? (f.type === 'select' && f.req ? f.options[0] : '');
      ins[f.k] = i;
      return h('label', { class: 'rt-field' + (f.half ? ' half' : '') }, h('span', { class: 'rt-label' }, f.label), i, f.help && h('span', { class: 'rt-help' }, f.help));
    }));
    return { el, ins, get: () => Object.fromEntries(Object.entries(ins).map(([k, i]) => [k, i.value])) };
  });
  const formModal = (RT.formModal = ({ title, fields, values, save, saveLabel = 'Save', extra }) => { const f = form(fields, values); modal({ title, body: [f.el, extra], actions: [{ label: saveLabel, kind: 'primary', fn: () => save(f.get()) }] }); return f; });
  const table = (RT.table = (cols, rows, opt = {}) => rows.length
    ? h('div', { class: 'rt-tw' }, h('table', { class: 'rt-table' }, h('thead', {}, h('tr', {}, cols.map((c) => h('th', { style: c.w ? { width: c.w } : null }, c.h)))), h('tbody', {}, rows.map((r) => h('tr', { class: opt.onRow ? 'click' : '', onclick: opt.onRow ? (e) => !e.target.closest('button,input,a,select') && opt.onRow(r) : null }, cols.map((c) => h('td', { 'data-h': c.h }, c.f(r))))))))
    : h('p', { class: 'rt-empty' }, opt.empty || 'Nothing here yet.'));
  const pill = (RT.pill = (text, tone = '') => h('span', { class: 'rt-pill ' + tone }, text));
  const head = (RT.head = (label, title, sub, actions) => h('header', { class: 'rt-head' }, h('div', {}, label && h('div', { class: 'rt-mono' }, label), h('h1', {}, title), sub && h('p', { class: 'rt-sub' }, sub)), actions && h('div', { class: 'rt-actions' }, actions)));
  const section = (RT.section = (title, body, actions) => h('section', { class: 'rt-sec' }, h('div', { class: 'rt-sec-h' }, h('h2', {}, title), actions && h('div', { class: 'rt-actions' }, actions)), body));
  const logo = (hgt = 26) => { const L = DATA.logo; if (!L) return h('strong', {}, 'red thread'); const s = h('span', { class: 'rt-logo', html: `<svg viewBox="0 0 ${L.w} ${L.h}" height="${hgt}" role="img" aria-label="Red Thread">${L.glyphs.map((g) => `<path d="${g.d}" fill="#ff0019"/>`).join('')}</svg>` }); return s; };

  /* ---------- shell and router ---------- */
  let layer, pageEl, route = {};
  const parse = () => {
    const x = location.hash.slice(1);
    if (x === 'os') return { v: 'home' };
    const m = x.match(/^os-(m|t|c)-(.+)$/); if (m) return { v: { m: 'module', t: 'tool', c: 'client' }[m[1]], id: m[2] };
    const p = x.match(/^os-(brain|clients|tasks|pilot|setup|founder)$/); if (p) return { v: p[1] };
    return null;
  };
  const NAV = () => [
    ['os', 'Home'], RT.can() && ['os-founder', 'Founder view'], ...CFG.MODULES.map((m) => ['os-m-' + m.id, m.name, m.n]), null,
    ['os-brain', 'Agency Brain'], ['os-clients', 'Clients'], ['os-tasks', 'Tasks'], RT.can() && ['os-pilot', 'Pilot scorecard'], ['os-setup', 'Setup'],
  ];
  const build = () => {
    pageEl = h('div', { class: 'rt-page' });
    let tone = 'dark'; try { tone = localStorage.getItem('redthread.os.tone') || 'dark'; } catch {}
    layer = h('div', { id: 'rtos', hidden: true, 'data-tone': tone },
      h('header', { class: 'rt-top' },
        h('a', { href: '#os', class: 'rt-brand', 'aria-label': 'Red Thread home' }, logo(24)),
        h('button', { class: 'rt-cmd-open', type: 'button', onclick: () => RT.palette() }, h('span', { class: 'k' }, navigator.platform?.includes('Mac') ? '⌘K' : 'Ctrl K'), h('span', {}, 'Tell Red Thread what you need')),
        h('div', { class: 'rt-top-r' }, h('span', { class: 'rt-crumb' }), h('button', { class: 'rt-menu', type: 'button', 'aria-label': 'Open the index', onclick: () => layer.classList.toggle('nav-open') }, h('i'), h('i'), h('span', {}, 'Index')))),
      h('div', { class: 'rt-side', role: 'dialog', 'aria-label': 'Index' }),
      h('main', { class: 'rt-main' }, pageEl), h('div', { id: 'rt-toasts' }));
    document.body.append(layer);
    addEventListener('keydown', (e) => { if (layer.hidden) return; if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); RT.palette(); } if (e.key === 'Escape') layer.classList.remove('nav-open'); });
  };
  RT.tone = (t) => { layer.setAttribute('data-tone', t); try { localStorage.setItem('redthread.os.tone', t); } catch {} };
  const paintNav = () => {
    const side = layer.querySelector('.rt-side'), cur = location.hash.slice(1), me = S.me || {};
    const curMod = route.v === 'tool' ? 'os-m-' + (tool(route.id)?.mod || '') : route.v === 'client' ? 'os-clients' : cur;
    const close = () => layer.classList.remove('nav-open');
    const crumb = layer.querySelector('.rt-crumb'), m = CFG.MODULES.find((x) => 'os-m-' + x.id === curMod);
    crumb.textContent = route.v === 'home' ? '' : m ? `${m.n} ${m.name}` : (NAV().find((n) => n && n[0] === curMod) || [])[1] || '';
    RT.fill(side,
      h('div', { class: 'rt-ix' },
        h('nav', { class: 'rt-ix-mods' }, h('div', { class: 'rt-mono' }, 'Modules'), CFG.MODULES.map((x) => h('a', { href: '#os-m-' + x.id, class: curMod === 'os-m-' + x.id ? 'on' : '', onclick: close }, h('span', { class: 'n' }, x.n), h('span', { class: 't' }, x.name)))),
        h('nav', { class: 'rt-ix-more' }, h('div', { class: 'rt-mono' }, 'Workspace'),
          NAV().filter((n) => n && !String(n[0]).startsWith('os-m-')).map((n) => h('a', { href: '#' + n[0], class: curMod === n[0] ? 'on' : '', onclick: close }, n[1])),
          h('a', { href: '#briefs', onclick: close }, 'Briefs and brief tasks')),
        h('div', { class: 'rt-me' },
          h('div', { class: 'who' }, h('strong', {}, me.name || ''), h('span', {}, [me.designation, me.department].filter(Boolean).join(', '))),
          h('div', { class: 'row' }, h('button', { class: 'rt-link', onclick: () => RT.tone(layer.getAttribute('data-tone') === 'dark' ? 'light' : 'dark') }, 'Light / dark'),
            h('button', { class: 'rt-link', onclick: () => { try { localStorage.removeItem('redthread.session.v1'); } catch {} location.hash = ''; location.reload(); } }, 'Log out')),
          h('div', { class: 'rt-status' }, S.live ? 'Live. Shared with the team.' : S.ready ? 'Not syncing. Data stays in this browser.' : 'Connecting'))),
      h('button', { class: 'rt-ix-close', 'aria-label': 'Close the index', onclick: close }, 'Close'));
  };
  let raf = 0;
  const render = (RT.render = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
    const r = parse(); if (!r || layer.hidden) return;
    const same = r.v === route.v && r.id === route.id, top = same ? layer.querySelector('.rt-main').scrollTop : 0;
    route = r; paintNav();
    let el;
    try { el = !S.ready ? h('p', { class: 'rt-empty' }, 'Loading your workspace.') : (V[r.v] || V.home)(r.id); }
    catch (e) { console.error('[Red Thread OS]', e); el = h('p', { class: 'rt-empty' }, 'This page hit an error. Reload and try again.'); }
    RT.fill(pageEl, el); layer.querySelector('.rt-main').scrollTop = top;
  }); });
  const STATIC = new Set(['tool']);
  RT.onChange((key) => { if (!layer || layer.hidden) return; if (key === 'caps') return; if (key !== 'all' && STATIC.has(route.v) && S.ready && pageEl.firstChild && !pageEl.querySelector('.rt-empty:only-child')) return; if (modalOpen) { dirty = true; return; } const a = document.activeElement; if (key !== 'all' && a && pageEl.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { dirty = true; a.addEventListener('blur', () => { if (dirty && !modalOpen) { dirty = false; render(); } }, { once: true }); return; } render(); });
  const sync = () => {
    const r = parse(), me = RT.session();
    if (r && !me) { layer.hidden = true; document.documentElement.classList.remove('rt-on'); history.replaceState(null, '', location.pathname + location.search); return; }
    S.me = me; layer.hidden = !r; document.documentElement.classList.toggle('rt-on', !!r);
    if (r) { RT.start(); route = {}; render(); }
  };
  window.RTOS = { open: () => go('os'), enter: () => { if (!parse()) go('os'); } };
  const boot = () => { build(); addEventListener('hashchange', sync); if (RT.session() && !location.hash.slice(1)) go('os'); sync(); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();

  /* ---------- command: one line to reach any tool, module, client or page ---------- */
  const SYN = { mom: 'minutes meeting call notes', minutes: 'meeting mom', call: 'voicenote notes transcript', voicenote: 'call notes transcript', quote: 'cost proposal estimate', cost: 'proposal estimate', estimate: 'cost proposal ce email', price: 'ask scope rate card', invoice: 'proof service po', po: 'proof service', deck: 'slides presentation pitch', slides: 'deck', pitch: 'deck factory routes', idea: 'creative routes', ideas: 'creative routes', report: 'monthly reporting', contract: 'agreement addendum dpa msa review', sow: 'scope proposal', timeline: 'gantt engagement', gantt: 'timeline', calendar: 'social content', website: 'prototype site page', site: 'prototype website', email: 'reply draft gmail', mail: 'reply draft gmail', inbox: 'daily brief', lead: 'tag pipeline', leads: 'tag pipeline', renewal: 'renewal case upsell', feedback: 'revisions twin', brief: 'decode questionnaire vendor', rehearse: 'rehearsal pitch', case: 'case study', send: 'email reply draft', write: 'draft', review: 'qa check' };
  RT.command = (q) => {
    const words = String(q).toLowerCase().match(/[a-z0-9]+/g) || []; if (!words.length) return [];
    const want = words.flatMap((w) => [w, ...(SYN[w] || '').split(' ').filter(Boolean)]);
    const score = (hay, base = 0) => { hay = hay.toLowerCase(); let s = base; want.forEach((w, i) => { if (w.length > 2 && hay.includes(w)) s += i < words.length ? 3 : 1; }); return s; };
    const nameFit = (n) => { const t = n.toLowerCase().match(/[a-z]+/g).filter((w) => w.length > 2); return t.every((w) => want.includes(w)) && t.some((w) => words.includes(w)) ? 6 : 0; };
    const items = [
      ...CFG.TOOLS.filter((t) => !t.gated || RT.can()).map((t) => ({ kind: 'Tool', label: t.name, sub: CFG.MODULES.find((m) => m.id === t.mod).name, hash: 'os-t-' + t.id, tool: t, s: score(t.name + ' ' + t.name + ' ' + t.blurb) + nameFit(t.name) })),
      ...CFG.MODULES.map((m) => ({ kind: 'Module', label: m.name, sub: m.line, hash: 'os-m-' + m.id, s: score(m.name + ' ' + m.line) })),
      ...RT.clients().map((c) => ({ kind: 'Client', label: c.name, sub: c.agency || '', hash: 'os-c-' + c.id, s: score(c.name, words.some((w) => c.name.toLowerCase().startsWith(w)) ? 4 : 0) })),
      ...NAV().filter((n) => n && !String(n[0]).startsWith('os-m-')).map((n) => ({ kind: 'Page', label: n[1], sub: '', hash: n[0], s: score(n[1]) })),
    ];
    return items.filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 7);
  };
  const runCommand = (q, pick) => {
    const top = pick || RT.command(q)[0]; if (!top) { RT.toast('Nothing matches that yet. Try minutes, proposal, deck or a client name.'); return; }
    if (top.kind === 'Tool' && q.trim().split(/\s+/).length > 6) { const c = RT.command(q).find((x) => x.kind === 'Client'); RT.prefill = { tool: top.tool.id, client: c ? c.hash.slice(5) : '', material: q.trim() }; }
    go(top.hash);
  };
  const cmdBox = (big) => {
    const list = h('div', { class: 'rt-cmd-list' }), inp = h('input', { class: 'rt-search' + (big ? ' big' : ''), type: 'search', placeholder: 'Tell Red Thread what you need', 'aria-label': 'Tell Red Thread what you need', autocomplete: 'off' });
    let sel = 0, hits = [];
    const paint = () => { hits = RT.command(inp.value); sel = Math.min(sel, Math.max(0, hits.length - 1)); RT.fill(list, hits.map((x, i) => h('a', { href: '#' + x.hash, class: 'rt-cmd-row' + (i === sel ? ' on' : ''), onclick: (e) => { e.preventDefault(); runCommand(inp.value, x); RT.closePalette?.(); } }, h('span', { class: 'k' }, x.kind), h('span', { class: 'l' }, x.label), h('span', { class: 's' }, x.sub)))); };
    inp.addEventListener('input', () => { sel = 0; paint(); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(hits.length - 1, sel + 1); paint(); } if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); paint(); } if (e.key === 'Enter') { e.preventDefault(); runCommand(inp.value, hits[sel]); RT.closePalette?.(); } });
    return { inp, list, el: h('div', { class: 'rt-cmd' + (big ? ' big' : '') }, inp, list) };
  };
  RT.palette = () => {
    if (layer.querySelector('.rt-pal')) return;
    const c = cmdBox(true);
    const wrap = h('div', { class: 'rt-pal', onmousedown: (e) => e.target === wrap && close() }, h('div', { class: 'rt-pal-in' }, h('div', { class: 'rt-mono' }, 'Ask for a tool, a module, a client or a page. Paste a whole request and it opens the right tool with it filled in.'), c.el));
    const close = (RT.closePalette = () => { wrap.remove(); RT.closePalette = null; });
    wrap.addEventListener('keydown', (e) => e.key === 'Escape' && close());
    layer.append(wrap); setTimeout(() => c.inp.focus(), 20);
  };

  /* ---------- home ---------- */
  V.home = () => {
    const me = S.me, first = (me.name || '').split(/\s+/)[0], hr = new Date().getHours();
    const brands = RT.myBrands().map(slug), mine = (c) => !brands.length || brands.includes(c);
    const myTasks = RT.rows('tasks').filter((t) => !t.done && (t.owner ? t.owner.toLowerCase().startsWith(first.toLowerCase()) : t.department === me.department));
    const due = RT.rows('promises').filter((p) => (p.status || 'open') === 'open' && mine(p.client) && RT.daysTo(p.due) != null && RT.daysTo(p.due) <= 7);
    const wait = RT.rows('scope').filter((s) => s.inScope !== 'yes' && (s.status || 'logged') === 'logged' && mine(s.client));
    const renew = RT.can() ? RT.clients().filter((c) => { const d = RT.daysTo(c.contractEnd); return d != null && d <= 90 && d >= -30; }) : [];
    const needs = [
      myTasks.length && [myTasks.length, myTasks.length === 1 ? 'task is open for you' : 'tasks are open for you', 'os-tasks'],
      due.length && [due.length, due.length === 1 ? 'promise is due this week' : 'promises are due this week', 'os-m-meeting'],
      RT.can() && wait.length && [wait.length, wait.length === 1 ? 'client ask is waiting for approval' : 'client asks are waiting for approval', 'os-m-commercial'],
      RT.can() && RT.health && (() => { const n = RT.clients().filter((c) => c.id !== 'tsl' && RT.health(c).band === 'red').length; return n && [n, n === 1 ? 'account is red on client health' : 'accounts are red on client health', 'os-founder']; })(),
      renew.length && [renew.length, renew.length === 1 ? 'contract is in its renewal window' : 'contracts are in their renewal window', 'os-m-growth'],
    ].filter(Boolean);
    const cmd = cmdBox(true);
    const recentTools = [...new Set(RT.rows('runs').filter((r) => r.by === me.name).map((r) => r.tool))].slice(0, 4).map(tool).filter(Boolean);
    const quick = (recentTools.length ? recentTools : ['mom', 'pitch-factory', 'cost-proposal', 'deck-qa'].map(tool)).filter((t) => t && (!t.gated || RT.can()));
    const ring = h('nav', { class: 'rt-ring', 'aria-label': 'Modules' }, CFG.MODULES.map((m, i) => h('a', { href: '#os-m-' + m.id, style: (() => { const t = ((i / CFG.MODULES.length) * 360 - 90) * Math.PI / 180; return { left: (50 + 47 * Math.cos(t)).toFixed(2) + '%', top: (50 + 47 * Math.sin(t)).toFixed(2) + '%' }; })(), onmouseenter: () => RT.orb?.pulse(), title: m.line }, h('span', { class: 'n' }, m.n), h('span', { class: 't' }, m.name))));
    const orbHost = h('div', { class: 'rt-orb-host' });
    setTimeout(() => RT.orb?.mount(orbHost), 0);
    const recent = RT.rows('runs').filter((r) => r.by === me.name).slice(0, 5);
    return h('div', { class: 'rt-home' },
      h('div', { class: 'rt-deck' },
        h('div', { class: 'rt-deck-c' }, ring, orbHost),
        h('div', { class: 'rt-deck-t' },
          h('div', { class: 'rt-mono' }, new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })),
          h('h1', {}, `Good ${hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : 'evening'}, ${first}.`),
          needs.length ? h('p', { class: 'rt-needs' }, needs.map((n, i) => [i ? h('span', { class: 'sep' }, ' · ') : null, h('a', { href: '#' + n[2] }, h('strong', {}, n[0]), ' ' + n[1])])) : h('p', { class: 'rt-needs quiet' }, 'Nothing is waiting on you right now.'),
          cmd.el,
          h('p', { class: 'rt-quick' }, h('span', { class: 'rt-mono' }, recentTools.length ? 'Pick up' : 'Start with'), quick.map((t) => h('a', { href: '#os-t-' + t.id }, t.name))))),
      RT.loom ? RT.loom() : null,
      recent.length ? section('Your recent work', table([{ h: 'What', f: (r) => h('strong', {}, r.title) }, { h: 'Client', f: (r) => r.clientName || '' }, { h: 'When', f: (r) => RT.day(r.at), w: '120px' }], recent, { onRow: (r) => { RT.openRun = r.id; go('os-t-' + r.tool); } })) : null);
  };
  const toolRow = (t, showMod) => (!t.gated || RT.can()) && h('a', { href: '#os-t-' + t.id, class: 'rt-tool' }, h('div', {}, h('strong', {}, t.name), showMod && h('span', { class: 'rt-mono' }, CFG.MODULES.find((m) => m.id === t.mod).name), h('p', {}, t.blurb)), h('span', { class: 'go' }, '→'));

  /* ---------- module page ---------- */
  V.module = (id) => {
    const m = CFG.MODULES.find((x) => x.id === id); if (!m) return V.home();
    const tools = CFG.TOOLS.filter((t) => t.mod === id), locked = tools.some((t) => t.gated) && !RT.can();
    const runs = RT.rows('runs').filter((r) => r.mod === id).slice(0, 8);
    return h('div', {}, head(m.n, m.name, m.line),
      h('div', { class: 'rt-tools' }, tools.map((t) => toolRow(t))),
      locked && h('p', { class: 'rt-note' }, 'Some tools here carry commercial data and are shown to Account Management and managers only.'),
      RT.panels[id] ? RT.panels[id]() : null,
      runs.length ? section('Recent in ' + m.name, table([{ h: 'What', f: (r) => r.title }, { h: 'Client', f: (r) => r.clientName || '' }, { h: 'By', f: (r) => r.by }, { h: 'When', f: (r) => RT.day(r.at), w: '120px' }], runs, { onRow: (r) => { RT.openRun = r.id; go('os-t-' + r.tool); } })) : null,
      h('p', { class: 'rt-from' }, 'Built from: ' + m.from));
  };
  RT.panels = {};

  /* ---------- material sources ---------- */
  const pickList = ({ title, placeholder, initial, search, label, add }) => {
    const list = h('div', { class: 'rt-pick' }), q = h('input', { class: 'rt-in', placeholder, value: initial || '' }), picked = new Map();
    const run = async () => { RT.fill(list, h('p', { class: 'rt-empty' }, 'Searching.')); try { const rows = await search(q.value.trim()); RT.fill(list, rows.length ? rows.map((r) => h('label', { class: 'rt-pick-row' }, h('input', { type: 'checkbox', onchange: (e) => (e.target.checked ? picked.set(r.id, r) : picked.delete(r.id)) }), h('div', {}, label(r)))) : h('p', { class: 'rt-empty' }, 'Nothing found. Try other words.')); } catch (e) { RT.fill(list, h('p', { class: 'rt-note' }, e.msg || 'Could not search.')); } };
    q.addEventListener('keydown', (e) => e.key === 'Enter' && run());
    modal({ title, wide: true, body: [h('div', { class: 'rt-row' }, q, btn('Search', run)), list], actions: [{ label: 'Add selected', kind: 'primary', fn: async () => { if (!picked.size) { RT.toast('Tick at least one.'); return false; } await add([...picked.values()]); } }] });
    if (initial) run();
  };
  const micBtn = (RT.micBtn = (ta, state) => {
    let listening = false;
    const mic = h('button', { type: 'button', class: 'rt-chip', hidden: !S.mic, onclick: () => { const d = S.mic; if (!d) return; if (listening) { d.stop().catch(() => {}); return; } state.micTarget = ta; d.start().catch((e) => RT.toast(e?.code === 'not_granted' ? 'The mic was not allowed. Keep typing.' : 'The mic did not start.')); } }, 'Dictate');
    if (S.mic) { try { S.mic.onFinal(({ text }) => { if (document.contains(ta) && listening && state.micTarget === ta) ta.value += (ta.value && !/\s$/.test(ta.value) ? ' ' : '') + text; }); S.mic.onState(({ state: st }) => { listening = st === 'listening' && state.micTarget === ta; if (document.contains(mic)) { mic.textContent = listening ? 'Stop dictating' : 'Dictate'; mic.classList.toggle('on', listening); } }); } catch {} }
    return mic;
  });
  const sources = (ta, state, getClient) => {
    const files = h('div', { class: 'rt-files' });
    const append = (name, text) => { ta.value = (ta.value.trim() ? ta.value.trim() + '\n\n' : '') + `--- ${name} ---\n${text.trim()}\n`; ta.dispatchEvent(new Event('input')); };
    const fin = h('input', { type: 'file', multiple: true, hidden: true, onchange: async () => { for (const f of fin.files) { const chip = h('span', { class: 'rt-chip' }, 'Reading ' + f.name); files.append(chip); try { const r = await RT.readFile(f); if (r.image) state.images.push(r.image); append(f.name, r.text); chip.textContent = f.name + (r.skipped ? ' (not readable)' : r.image ? ' (image)' : ''); } catch (e) { chip.textContent = f.name + ' (could not be read)'; } } fin.value = ''; } });
    const cname = () => RT.client(getClient())?.name || '';
    const gm = () => pickList({ title: 'Pull threads from Gmail', placeholder: 'Gmail search, for example: from:client newer_than:14d', initial: cname() ? `${cname()} newer_than:30d` : 'newer_than:2d', search: (q) => RT.gmailSearch(q).catch((e) => { throw { msg: RT.mcpError(e, 'Gmail') }; }), label: (t) => [h('strong', {}, t.subject), h('span', {}, [t.from, RT.day(t.date), t.count && t.count + ' messages'].filter(Boolean).join(' · ')), h('p', {}, t.snippet)], add: async (rows) => { for (const t of rows) { try { append('Gmail thread: ' + t.subject, await RT.gmailThread(t.id)); } catch (e) { RT.toast(RT.mcpError(e, 'Gmail')); } } } });
    const dr = () => pickList({ title: 'Pull files from Google Drive', placeholder: 'Words in the file', initial: cname(), search: (q) => RT.driveSearch(q).catch((e) => { throw { msg: RT.mcpError(e, 'Google Drive') }; }), label: (f) => [h('strong', {}, f.title), h('span', {}, [f.mime.split('.').pop(), RT.day(f.modified)].filter(Boolean).join(' · '))], add: async (rows) => { for (const f of rows) { try { append('Drive file: ' + f.title, RT.clip(await RT.driveRead(f.id), 60000)); } catch (e) { RT.toast(RT.mcpError(e, 'Google Drive')); } } } });
    const br = () => { const bs = S.c.briefs.filter(Boolean).slice(0, 40); modal({ title: 'Use a decoded brief', wide: true, body: bs.length ? h('div', { class: 'rt-pick' }, bs.map((b) => h('button', { class: 'rt-pick-row', onclick: (e) => { const { material, ...rest } = b; append('Brief: ' + (b.name || b.title || 'Untitled'), RT.clip(JSON.stringify(rest, null, 1), 9000) + '\n\nORIGINAL MATERIAL\n' + RT.clip((material || []).map((m) => m.text || '').join('\n\n'), 40000)); e.target.closest('.rt-scrim').querySelector('.rt-x').click(); } }, h('div', {}, h('strong', {}, b.name || b.title || 'Untitled brief'), h('span', {}, RT.day(b.createdAt)))))) : h('p', { class: 'rt-empty' }, 'No briefs yet. Decode one in Brief Desk first.') }); };
    const mic = micBtn(ta, state);
    return h('div', { class: 'rt-sources' }, fin, h('button', { type: 'button', class: 'rt-chip', onclick: () => fin.click() }, 'Attach files'), S.mcp && h('button', { type: 'button', class: 'rt-chip', onclick: gm }, 'Pull from Gmail'), S.mcp && h('button', { type: 'button', class: 'rt-chip', onclick: dr }, 'Pull from Drive'), h('button', { type: 'button', class: 'rt-chip', onclick: br }, 'Use a brief'), mic, files);
  };
  RT.sources = sources;

  /* ---------- tool runner ---------- */
  const ACT_LABEL = { tasks: ['task', 'tasks', 'Add to Delivery Board'], promises: ['promise', 'promises', 'Log in Promise Ledger'], scope: ['client ask', 'client asks', 'Log in Scope Ledger'], rules: ['client rule', 'client rules', 'Teach the Client Twin'], pipeline: ['lead', 'leads', 'Add to pipeline'] };
  const applyAct = (key, items, clientId, toolName) => items.forEach((x) => {
    if (key === 'tasks') RT.put('tasks', { title: x.title, department: x.department || '', owner: x.owner || '', due: x.due || '', client: clientId, source: toolName, done: false });
    if (key === 'promises') RT.put('promises', { client: clientId, promise: x.promise, owner: x.owner || '', due: x.due || '', source: x.source || toolName, status: 'open' });
    if (key === 'scope') RT.put('scope', { client: clientId, ask: x.ask, match: x.match || '', inScope: /^y/i.test(x.inScope) ? 'yes' : /^n/i.test(x.inScope) ? 'no' : 'unclear', price: x.price || '', value: RT.num(x.value), approval: x.approval || '', status: 'logged' });
    if (key === 'rules') RT.put('rules', { client: clientId, rule: x.rule, source: x.source || toolName, active: true });
    if (key === 'pipeline') RT.put('pipeline', { brand: x.brand, category: x.category || '', side: x.side || '', notes: x.notes || '', stage: 'Lead' });
  });

  V.tool = (id) => {
    const t = tool(id); if (!t) return V.home();
    const m = CFG.MODULES.find((x) => x.id === t.mod);
    const back = h('a', { href: '#os-m-' + m.id, class: 'rt-back' }, m.n + ' ' + m.name);
    if (t.gated && !RT.can()) return h('div', {}, back, head(null, t.name, t.blurb), h('p', { class: 'rt-note' }, 'This tool carries commercial data and is open to Account Management and managers only.'));
    if (t.special === 'brief') return h('div', {}, back, head(null, t.name, t.blurb), h('div', { class: 'rt-row' }, btn('Start a new brief', () => { go('briefs'); setTimeout(() => window.__rt?.startBrief?.(''), 60); }, 'primary'), btn('Open my briefs', () => go('briefs'))), h('p', { class: 'rt-note' }, 'Once a brief is decoded you can pull it into any other tool with "Use a brief".'));

    const state = { images: [], raw: '', run: null, busy: false, ctrl: null, msgs: [] };
    const ins = {}, out = h('div', { class: 'rt-out' }), bar = h('div', { class: 'rt-outbar' }), using = h('div', { class: 'rt-using' });
    const vals = () => Object.fromEntries(Object.entries(ins).map(([k, i]) => [k, i.value.trim()]));
    const cl = () => RT.client(ins.client?.value);
    const refreshUsing = () => { const v = vals(); const { used } = RT.context(t, v, v.material); using.textContent = used.length ? 'Red Thread will also use: ' + used.join(', ') + '.' : v.client ? 'Nothing is on file for this client yet. Add rules and commercials on the client page to make this sharper.' : ''; };
    const fields = (t.fields || []).map((f) => {
      let i, extra = null;
      if (f.type === 'client') i = clientSelect(RT.lastClient || '', () => { RT.lastClient = i.value; refreshUsing(); });
      else if (f.type === 'material') { i = h('textarea', { class: 'rt-in rt-mat', rows: 9, placeholder: f.ph || '' }); extra = sources(i, state, () => ins.client?.value); }
      else if (f.type === 'select') i = h('select', { class: 'rt-in' }, f.options.map((o) => h('option', { value: o }, o)));
      else if (f.type === 'area') i = h('textarea', { class: 'rt-in', rows: 3, placeholder: f.ph || '' });
      else i = h('input', { class: 'rt-in', type: 'text', placeholder: f.ph || '' });
      ins[f.k] = i;
      return h('label', { class: 'rt-field' }, h('span', { class: 'rt-label' }, f.label + (f.req ? '' : f.type === 'material' || f.type === 'client' ? ' (optional)' : '')), i, extra);
    });
    const title = () => { const v = vals(); return [t.name, v.title || v.topic || v.month || v.period || v.vendor || ''].filter(Boolean).join(': '); };

    const show = (text, streaming) => {
      const { body } = RT.splitActs(text);
      if (t.special === 'html' && !streaming) { paintHtml(body); return; }
      out.innerHTML = t.special === 'html' ? `<pre>${esc(body.slice(-3000))}</pre>` : RT.mdHtml(body) + (streaming ? '<p class="rt-cursor">Writing</p>' : '');
      if (streaming) out.scrollTop = out.scrollHeight;
    };
    const htmlOf = (s) => { const i = s.search(/<!DOCTYPE html>/i); let x = i >= 0 ? s.slice(i) : s; const j = x.toLowerCase().lastIndexOf('</html>'); return j > 0 ? x.slice(0, j + 7) : x.replace(/```\s*$/, ''); };
    const paintHtml = (body) => { const code = htmlOf(body); const fr = h('iframe', { class: 'rt-frame', sandbox: 'allow-scripts', title: 'Prototype preview' }); fr.srcdoc = code; const pre = h('pre', { hidden: true }, code); RT.fill(out, h('div', { class: 'rt-row' }, btn('Preview', () => { fr.hidden = false; pre.hidden = true; }), btn('Code', () => { fr.hidden = true; pre.hidden = false; })), fr, pre, h('p', { class: 'rt-help' }, 'If the preview stays blank, download the file and open it in a browser.')); };

    const paintBar = () => {
      const { body, acts } = RT.splitActs(state.raw), c = cl(), cname = c?.name || '', what = t.name;
      const exp = (t.exports || []).map((x) => {
        if (x === 'docx') return btn('Word', async () => { try { await RT.save(RT.fileName(cname, what, 'docx'), await RT.toDocx(title(), body)); } catch (e) { RT.toast('Could not build the Word file.'); } });
        if (x === 'xlsx') return btn('Excel', async () => { try { await RT.save(RT.fileName(cname, what, 'xlsx'), await RT.toXlsx(body)); } catch (e) { RT.toast('Could not build the Excel file.'); } });
        if (x === 'pptx') return btn('PowerPoint skeleton', async () => { try { await RT.save(RT.fileName(cname, what, 'pptx'), await RT.toPptx(title(), cname, acts?.deck, body)); } catch (e) { RT.toast('Could not build the PowerPoint file.'); } });
        if (x === 'html') return btn('Download HTML', () => RT.save(RT.fileName(cname, 'Prototype', 'html'), htmlOf(body)));
        if (x === 'gmail') return S.mcp && btn('Save as Gmail draft', async (e) => { const b = e.target, em = RT.parseEmail(body), to = (vals().to || '').split(/[,;\s]+/).filter((a) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a)); if (!em.subject) { RT.toast('No "Subject:" line found in the draft.'); return; } b.disabled = true; try { await RT.gmailDraft({ to, subject: em.subject, body: em.body }); b.textContent = 'Draft saved in Gmail'; RT.toast('Saved as a draft. Nothing was sent.'); } catch (err) { b.disabled = false; RT.toast(RT.mcpError(err, 'Gmail')); } });
      });
      const actBtns = acts ? Object.keys(ACT_LABEL).filter((k) => Array.isArray(acts[k]) && acts[k].length && (k === 'pipeline' || c)).map((k) => { const n = acts[k].length, L = ACT_LABEL[k]; return btn(`${L[2]}: ${n} ${n === 1 ? L[0] : L[1]}`, (e) => { modal({ title: L[2], wide: true, body: h('ul', { class: 'rt-list' }, acts[k].map((x) => h('li', {}, x.title || x.promise || x.ask || x.rule || x.brand, h('span', {}, [x.department, x.owner, x.due, x.match, x.price, x.category, x.side].filter(Boolean).join(' · '))))), actions: [{ label: `Add ${n}`, kind: 'primary', fn: () => { applyAct(k, acts[k], c?.id || '', t.name); e.target.disabled = true; e.target.textContent = 'Added: ' + n + ' ' + (n === 1 ? L[0] : L[1]); RT.toast('Added.'); } }] }); }, 'act'); }) : [];
      const change = h('input', { class: 'rt-in', placeholder: 'Ask for a change, for example: make it shorter, drop section 3' });
      const mins = h('input', { class: 'rt-in sm', type: 'number', min: '0', placeholder: 'minutes', value: state.run?.minutes || '' });
      const teach = h('input', { class: 'rt-in', placeholder: c ? `Something Red Thread should always do for ${c.name}` : 'Choose a client to teach a rule' });
      RT.fill(bar, 
        h('div', { class: 'rt-row wrap' }, btn('Copy', () => RT.copy(RT.plain(body))), exp, btn('File in Agency Brain', () => RT.fileRun(state.run, body, c))),
        actBtns.length ? h('div', { class: 'rt-row wrap' }, actBtns) : null,
        h('div', { class: 'rt-row' }, change, btn('Revise', () => { if (change.value.trim()) go2(change.value.trim()); })),
        h('div', { class: 'rt-after' },
          h('div', {}, h('span', { class: 'rt-label' }, 'By hand this would have taken'), h('div', { class: 'rt-row' }, mins, btn('Log', () => { if (state.run) { RT.patch('runs', state.run.id, { minutes: RT.num(mins.value) }); RT.toast('Logged for the pilot scorecard.'); } }))),
          h('div', {}, h('span', { class: 'rt-label' }, 'Got something wrong? Teach it'), h('div', { class: 'rt-row' }, teach, btn('Save rule', () => { if (!c) { RT.toast('Choose a client first.'); return; } if (!teach.value.trim()) return; RT.put('rules', { client: c.id, rule: teach.value.trim(), source: 'Correction on ' + t.name, active: true }); teach.value = ''; RT.toast('Saved. Every future draft for ' + c.name + ' will follow it.'); refreshUsing(); })))));
    };

    const runBtn = btn('Run', () => go2(), 'primary');
    const stopBtn = btn('Stop', () => state.ctrl?.abort());
    stopBtn.hidden = true;
    const go2 = async (changeReq) => {
      if (state.busy) return;
      const v = vals();
      for (const f of t.fields || []) if (f.req && !v[f.k]) { RT.toast(`Fill in "${f.label}" first.`); ins[f.k].focus(); return; }
      const p = RT.prompt(t, v, v.material);
      const input = changeReq && state.raw ? [{ role: 'user', content: p.text }, { role: 'assistant', content: state.raw }, { role: 'user', content: `Change request: ${changeReq}\nReturn the full revised document${t.acts?.length ? ', followed by the json block again' : ''}.` }] : p.text;
      state.busy = true; RT.orb?.state('working'); state.ctrl = new AbortController(); runBtn.disabled = true; stopBtn.hidden = false; RT.fill(bar, ); out.innerHTML = '<p class="rt-cursor">Reading the material</p>';
      let last = 0;
      try {
        const raw = await RT.ask(input, { tier: t.tier, signal: state.ctrl.signal, images: state.images, onText: (txt) => { const now = Date.now(); if (now - last > 120) { last = now; show(txt, true); } } });
        state.raw = raw; show(raw, false);
        const c = cl();
        state.run = RT.put('runs', { id: changeReq && state.run ? state.run.id : undefined, tool: t.id, mod: t.mod, title: title(), client: c?.id || '', clientName: c?.name || '', output: RT.clip(raw, 45000), inputs: Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'material')), materialChars: (v.material || '').length, minutes: state.run?.minutes || 0 });
        if (state.scopeId) RT.patch('scope', state.scopeId, { estimateRun: state.run.id, estimateDrafted: RT.today() });
        paintBar();
      } catch (e) { out.innerHTML = `<p class="rt-note">${esc(RT.aiError(e))}</p>` + (e?.text ? RT.mdHtml(e.text) : ''); }
      finally { state.busy = false; RT.orb?.state('idle'); runBtn.disabled = false; stopBtn.hidden = true; }
    };

    // open a saved run
    const openRun = (r) => { state.run = r; state.raw = r.output || ''; if (r.client && ins.client) ins.client.value = r.client; Object.entries(r.inputs || {}).forEach(([k, val]) => { if (ins[k] && k !== 'client') ins[k].value = val; }); show(state.raw, false); paintBar(); refreshUsing(); };
    const past = RT.rows('runs').filter((r) => r.tool === t.id).slice(0, 8);
    const empty = () => { out.innerHTML = `<div class="rt-blank"><p>${esc(t.blurb)}</p><p>Fill in the left side and press Run. The draft appears here. You review it, change it, then copy or download it. Nothing is sent to anyone.</p></div>`; };

    if (t.special === 'chat') {
      const chat = RT.chat({ state, mic: true, placeholder: 'Start your pitch, or answer the client. Type "debrief" for feedback.', system: () => { const v = vals(); const ctx = RT.context(t, v, v.material); return `${CFG.HOUSE}\n\n${ctx.text}\n\n${t.prompt}\n\nPITCH MATERIAL\n<<<\n${RT.clip(v.material || '(none provided)', 60000)}\n>>>`; }, check: () => { if (!vals().client) { RT.toast('Choose the client first.'); return false; } return true; }, save: (msgs) => { const c = cl(); RT.put('runs', { tool: t.id, mod: t.mod, title: 'Pitch rehearsal', client: c?.id || '', clientName: c?.name || '', output: msgs.map((x) => `**${x.role === 'user' ? 'You' : 'Client'}:** ${x.content}`).join('\n\n') }); RT.toast('Rehearsal saved.'); } });
      setTimeout(refreshUsing, 0);
      return h('div', {}, back, head(null, t.name, t.blurb), h('div', { class: 'rt-run' }, h('div', { class: 'rt-run-l' }, fields, using), h('div', { class: 'rt-run-r' }, chat)));
    }
    empty();
    if (RT.prefill && RT.prefill.tool === t.id) { const pf = RT.prefill; RT.prefill = null; state.scopeId = pf.scopeId; setTimeout(() => { if (ins.client && pf.client) { if (![...ins.client.options].some((o) => o.value === pf.client)) ins.client.append(h('option', { value: pf.client }, RT.client(pf.client)?.name || pf.client)); ins.client.value = pf.client; } if (ins.material && pf.material) ins.material.value = pf.material; refreshUsing(); }, 0); }
    if (RT.openRun) { const r = RT.rows('runs').find((x) => x.id === RT.openRun); RT.openRun = null; if (r && r.tool === t.id) setTimeout(() => openRun(r), 0); }
    setTimeout(refreshUsing, 0);
    return h('div', {}, back, head(null, t.name, null),
      h('div', { class: 'rt-run' },
        h('div', { class: 'rt-run-l' }, fields, using, h('div', { class: 'rt-row' }, runBtn, stopBtn),
          past.length ? h('div', { class: 'rt-past' }, h('div', { class: 'rt-label' }, 'Earlier runs'), past.map((r) => h('button', { class: 'rt-past-row', onclick: () => openRun(r) }, h('span', {}, [r.clientName, r.title.replace(t.name + ': ', '').replace(t.name, '')].filter(Boolean).join(' · ') || t.name), h('span', {}, `${r.by.split(' ')[0]}, ${RT.day(r.at)}`)))) : null),
        h('div', { class: 'rt-run-r' }, out, bar)));
  };

  /* ---------- chat (pitch rehearsal, ask the Brain) ---------- */
  RT.chat = ({ state, system, placeholder, check, save, mic, intro }) => {
    const log = h('div', { class: 'rt-chatlog' }, intro && h('p', { class: 'rt-empty' }, intro)), ta = h('textarea', { class: 'rt-in', rows: 2, placeholder });
    const msgs = (state.msgs = []);
    const send = async (text) => {
      text = (text ?? ta.value).trim(); if (!text || state.busy) return; if (check && !check()) return;
      if (!msgs.length) RT.fill(log, );
      ta.value = ''; msgs.push({ role: 'user', content: text });
      log.append(h('div', { class: 'rt-msg me' }, text)); const b = h('div', { class: 'rt-msg' }, 'Thinking'); log.append(b); log.scrollTop = log.scrollHeight;
      state.busy = true;
      try {
        const sys = await system(text);
        const input = msgs.map((m, i) => (i === 0 ? { role: 'user', content: sys + '\n\nFIRST MESSAGE\n' + m.content } : m));
        const r = await RT.ask(input, { onText: (t) => { b.innerHTML = RT.mdHtml(t); log.scrollTop = log.scrollHeight; } });
        b.innerHTML = RT.mdHtml(r); msgs.push({ role: 'assistant', content: r });
      } catch (e) { b.textContent = RT.aiError(e); msgs.pop(); }
      state.busy = false; log.scrollTop = log.scrollHeight;
    };
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    return h('div', { class: 'rt-chat' }, log, h('div', { class: 'rt-chatin' }, ta, h('div', { class: 'rt-row' }, mic && micBtn(ta, state), btn('Send', () => send(), 'primary'), save && btn('Debrief', () => send('debrief')), save && btn('Save session', () => msgs.length && save(msgs)))));
  };

  /* ---------- file a run in the Agency Brain ---------- */
  RT.fileRun = (run, body, c) => formModal({ title: 'File in the Agency Brain', saveLabel: 'File it', fields: [{ k: 'title', label: 'Title', type: 'text' }, { k: 'outcome', label: 'Outcome', type: 'select', options: ['Draft', 'Sent to client', 'Approved', 'Won', 'Lost', 'Delivered'] }], values: { title: run?.title || '', outcome: 'Draft' }, save: (v) => { RT.put('brain', { title: v.title || run?.title || 'Untitled', client: c?.id || '', clientName: c?.name || '', category: c?.category || '', format: tool(run?.tool)?.name || 'Document', year: String(new Date().getFullYear()), outcome: v.outcome, summary: RT.plain(body).slice(0, 600), text: RT.clip(body, 14000), tags: [] }); RT.toast('Filed. Pitch Studio and BD answers can now draw on it.'); } });
})();
