/* Red Thread OS: core. Helpers, data store, Claude calls, files, exports, connectors. */
(() => {
  'use strict';
  const CFG = window.RT_CFG, DATA = window.RT_DATA || { roster: [], logo: null };
  const RT = (window.RT = { CFG, DATA });

  /* ---------- small helpers ---------- */
  const h = (RT.h = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'value') e.value = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(Infinity).forEach((c) => c != null && c !== false && e.append(c.nodeType ? c : document.createTextNode(String(c))));
    return e;
  });
  RT.fill = (el, ...kids) => { el.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false).map((k) => (k.nodeType ? k : document.createTextNode(String(k))))); return el; };
  const esc = (RT.esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const slug = (RT.slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  const uid = (RT.uid = (p = 'x') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
  const iso = () => new Date().toISOString();
  RT.today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  RT.day = (s) => { if (!s) return ''; const d = new Date(s); return isNaN(d) ? String(s) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
  RT.daysTo = (s) => { if (!s) return null; const d = new Date(s); return isNaN(d) ? null : Math.round((d - new Date(RT.today())) / 864e5); };
  RT.inr = (n) => (n == null || n === '' || isNaN(n) ? '' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 }));
  RT.num = (v) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };
  const clip = (RT.clip = (s, n) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n) + '\n[cut here: the rest was too long to include]' : s; });
  const ls = { get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  RT.ls = ls;

  /* ---------- session (shared with the brief flow) ---------- */
  const S = (RT.S = { me: null, db: null, ai: null, dl: null, mcp: null, mic: null, live: false, ready: false, c: {}, settings: { hoursPerFte: 160, fteRate: 180000 } });
  RT.session = () => ls.get('redthread.session.v1', null);
  RT.can = () => { const m = S.me || {}; return m.department === 'Account Management' || /Manager|Director|Controller/i.test(m.designation || ''); };
  RT.myBrands = () => { const f = (S.me?.name || '').split(/\s+/)[0].toLowerCase(); const r = DATA.roster.filter((p) => p.name.toLowerCase() === f); return r.length === 1 ? r[0].brands : []; };

  /* ---------- data store ---------- */
  const COLS = { clients: 'clients', briefs: 'briefs', members: 'members', profiles: 'os_clients', runs: 'os_runs', brain: 'os_brain', rules: 'os_rules', promises: 'os_promises', scope: 'os_scope', tasks: 'os_tasks', pipeline: 'os_pipeline', effort: 'os_effort', settings: 'os_settings', alloc: 'os_alloc', signals: 'os_signals', agent: 'os_agent' };
  const OWN = ['profiles', 'runs', 'brain', 'rules', 'promises', 'scope', 'tasks', 'pipeline', 'effort', 'settings', 'alloc', 'signals', 'agent'];
  Object.keys(COLS).forEach((k) => (S.c[k] = []));
  const listeners = new Set();
  RT.onChange = (fn) => listeners.add(fn);
  const changed = (key) => listeners.forEach((fn) => { try { fn(key); } catch (e) { console.warn('[Red Thread OS]', e); } });
  const clean = (o) => JSON.parse(JSON.stringify(o));
  const LOCAL = 'redthread.os.local.v1';
  const saveLocal = () => { if (!S.live) ls.set(LOCAL, Object.fromEntries(OWN.map((k) => [k, S.c[k]]))); };
  const warn = (what) => (e) => { console.warn('[Red Thread OS] could not save', what, e?.code || e); RT.toast?.('That did not save. Check your connection and try again.'); };

  RT.rows = (key) => S.c[key].filter((r) => r && !r.archived);
  RT.put = (key, obj) => {
    const o = { by: S.me?.name || '', at: iso(), ...obj, id: obj.id || uid(key[0]) };
    S.c[key] = [o, ...S.c[key].filter((r) => r.id !== o.id)];
    if (S.db) S.db.collection(COLS[key]).doc(o.id).set(clean(o)).catch(warn(key)); else saveLocal();
    changed(key); return o;
  };
  RT.patch = (key, id, fields) => {
    const cur = S.c[key].find((r) => r.id === id); if (!cur) return;
    S.c[key] = S.c[key].map((r) => (r.id === id ? { ...r, ...fields } : r));
    if (S.db) S.db.collection(COLS[key]).doc(id).update(clean(fields)).catch(warn(key)); else saveLocal();
    changed(key);
  };
  // Nothing is deleted. Archived rows are hidden and can be restored.
  RT.archive = (key, id, label) => { RT.patch(key, id, { archived: true }); RT.toast((label || 'Item') + ' archived.', { label: 'Undo', fn: () => RT.patch(key, id, { archived: false }) }); };

  RT.start = async () => {
    if (RT.start.done) return; RT.start.done = true;
    const c = window.claude, use = (n) => Promise.resolve().then(() => (c && typeof c.use === 'function' ? c.use(n) : null)).catch(() => null);
    use('sample').then((v) => (S.ai = v)); use('downloads').then((v) => (S.dl = v)); use('mcp').then((v) => { S.mcp = v; changed('caps'); }); use('dictation').then((v) => { S.mic = v; changed('caps'); });
    const db = await use('db');
    if (!db) { const l = ls.get(LOCAL, {}); OWN.forEach((k) => (S.c[k] = l[k] || [])); const st = ls.get('redthread.studio.v1', {}); S.c.briefs = st.briefs || []; S.c.clients = st.clients || []; S.ready = true; applySettings(); changed('all'); return; }
    S.db = db; S.live = true;
    let pending = Object.keys(COLS).length;
    const done = () => { if (--pending <= 0 && !S.ready) { S.ready = true; changed('all'); } };
    Object.entries(COLS).forEach(([key, col]) => {
      let first = true;
      const next = () => { if (first) { first = false; done(); } };
      try {
        db.collection(col).onSnapshot((snap) => { S.c[key] = snap.docs.map((d) => d.data()).filter(Boolean); if (key === 'settings') applySettings(); next(); if (S.ready) changed(key); }, () => next());
      } catch { next(); }
    });
    setTimeout(() => { if (!S.ready) { S.ready = true; changed('all'); } }, 6000);
  };
  const applySettings = () => { const m = S.c.settings.find((s) => s.id === 'main'); if (m) S.settings = { ...S.settings, ...m }; };
  RT.rates = () => { const s = S.settings; return { hoursPerFte: +s.hoursPerFte || 160, fteRate: +s.fteRate || 180000, hourRate: Math.round((+s.fteRate || 180000) / (+s.hoursPerFte || 160)) }; };

  /* ---------- clients ---------- */
  RT.clients = () => {
    const map = new Map();
    DATA.roster.forEach((p) => p.brands.forEach((b) => map.set(slug(b), { id: slug(b), name: b })));
    S.c.clients.forEach((c) => c && c.name && map.set(slug(c.name), { id: slug(c.name), name: c.name }));
    RT.rows('profiles').forEach((p) => map.set(p.id, { ...(map.get(p.id) || {}), ...p }));
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  };
  RT.client = (id) => RT.clients().find((c) => c.id === id || c.name === id) || null;
  RT.saveClient = (id, fields) => { const cur = RT.client(id) || { id, name: fields.name }; const o = { ...cur, ...fields, id: cur.id || slug(fields.name) }; return RT.put('profiles', o); };
  RT.team = (name) => DATA.roster.filter((p) => p.brands.some((b) => slug(b) === slug(name)));
  RT.rulesFor = (id) => RT.rows('rules').filter((r) => r.client === id && r.active !== false);

  /* ---------- Agency Brain search ---------- */
  const STOP = new Set('the a an and or of to in for on with from by at is are was were be been it this that as our we you your their they has have had not but can will would should what which who how when where why into over about than then them these those its also more most'.split(' '));
  const toks = (s) => String(s || '').toLowerCase().match(/[a-z0-9][a-z0-9&.\-]{1,}/g)?.filter((w) => !STOP.has(w)) || [];
  RT.brainFind = (query, clientId, k = 6) => {
    const q = [...new Set(toks(query))].slice(0, 60); if (!q.length) return [];
    return RT.rows('brain').map((b) => {
      const hay = { t: toks(b.title).join(' '), s: toks([b.summary, (b.tags || []).join(' '), b.category, b.format, b.clientName].join(' ')).join(' '), x: String(b.text || '').toLowerCase() };
      let sc = 0; q.forEach((w) => { if (hay.t.includes(w)) sc += 5; if (hay.s.includes(w)) sc += 3; if (hay.x.includes(w)) sc += 1; });
      if (clientId && b.client === clientId) sc += 4;
      return { b, sc };
    }).filter((x) => x.sc > 3).sort((a, b) => b.sc - a.sc).slice(0, k).map((x) => x.b);
  };

  /* ---------- Claude ---------- */
  RT.aiError = (e) => {
    switch (e?.code) {
      case 'not_granted': case 'sampling_disabled': case 'capability_disabled': case 'not_declared': case 'unavailable': return 'Red Thread was not allowed to use Claude in this view. Open the page on claude.ai, signed in, and allow it when asked.';
      case 'rate_limited': return 'Claude is busy or your usage limit was reached. Wait a minute and run it again.';
      case 'cancelled': case 'aborted': return 'Stopped.';
      default: return e?.name === 'AbortError' ? 'Stopped.' : 'Claude did not answer. Try again. (' + (e?.code || e?.message || 'unknown error') + ')';
    }
  };
  RT.ask = async (input, o = {}) => {
    if (!S.ai) { const c = window.claude; S.ai = c && c.use ? await c.use('sample').catch(() => null) : null; }
    if (!S.ai) throw { code: 'unavailable' };
    const opts = { cache: false, modelTier: o.tier || 'default', signal: o.signal, onText: (t) => o.onText && o.onText(t.text) };
    if (o.images?.length) { try { const lim = await S.ai.limits(); if (lim?.images) opts.images = o.images.slice(0, typeof lim.images === 'number' ? lim.images : 4); } catch {} }
    const r = await S.ai(input, opts);
    return (r && r.text) || '';
  };
  RT.askJson = async (input, o = {}) => { const t = await RT.ask(input + '\n\nReply with ONLY a JSON object, no prose and no code fence.', o); const m = t.match(/\{[\s\S]*\}/); return JSON.parse(m ? m[0] : t); };

  // Everything Red Thread knows that is relevant to this tool and client.
  RT.context = (tool, vals, material) => {
    const out = [], used = [], me = S.me || {}, r = RT.rates();
    out.push(`TODAY: ${RT.today()}\nUSER: ${me.name || 'Unknown'}, ${me.designation || ''}, ${me.department || ''}`);
    const c = vals.client ? RT.client(vals.client) : null;
    if (c) {
      const team = RT.team(c.name).map((p) => `${p.name} (${p.department})`).join(', ');
      out.push('CLIENT PROFILE\n' + [`Name: ${c.name}`, c.agency && `Agency on the account: ${c.agency}`, c.category && `Category: ${c.category}`, c.contacts && `Contacts: ${c.contacts}`, c.brand && `Brand and design rules: ${c.brand}`, c.notes && `Notes: ${c.notes}`, team && `TSL team on the allocation sheet: ${team}`, tool.gated && c.retainer && `Monthly retainer: INR ${c.retainer}`, tool.gated && c.contractEnd && `Contract ends: ${c.contractEnd}`].filter(Boolean).join('\n'));
      const rules = RT.rulesFor(c.id);
      if (rules.length) { out.push('CLIENT RULES (learned from past feedback and corrections; follow every one)\n' + rules.map((x, i) => `${i + 1}. ${x.rule}${x.source ? ' [from: ' + x.source + ']' : ''}`).join('\n')); used.push(`${rules.length} client rule${rules.length > 1 ? 's' : ''}`); }
      if (tool.commercials) { if (c.commercials) { out.push('COMMERCIALS: SOW AND RATE CARD FOR THIS CLIENT\n' + clip(c.commercials, 60000)); used.push('SOW or rate card on file'); } else out.push('COMMERCIALS: none saved for this client.'); }
      if (tool.ledger) {
        const p = RT.rows('promises').filter((x) => x.client === c.id), s = RT.rows('scope').filter((x) => x.client === c.id);
        out.push('PROMISE LEDGER\n' + (p.length ? p.map((x) => `- ${x.promise} | owner ${x.owner || 'not set'} | due ${x.due || 'not set'} | status ${x.status || 'open'}${x.evidence ? ' | evidence: ' + x.evidence : ''}`).join('\n') : 'Empty.'));
        out.push('SCOPE LEDGER\n' + (s.length ? s.map((x) => `- ${x.ask} | maps to ${x.match || 'not matched'} | in scope: ${x.inScope || 'unclear'} | price ${x.price || 'none'} | status ${x.status || 'logged'}`).join('\n') : 'Empty.'));
        used.push(`${p.length} promises, ${s.length} scope items`);
      }
    }
    if (tool.costing) out.push(CFG.COSTING.replace(/\{hoursPerFte\}/g, r.hoursPerFte).replace(/\{fteRate\}/g, r.fteRate.toLocaleString('en-IN')).replace(/\{hourRate\}/g, r.hourRate.toLocaleString('en-IN')));
    if (tool.pipeline) { const p = RT.rows('pipeline'); out.push('PIPELINE DATA\n' + (p.length ? p.map((x) => `- ${x.brand} | ${x.category || 'untagged'} | ${x.side || ''} | stage ${x.stage || 'Lead'} | pitch date ${x.pitchDate || 'not set'} | owner ${x.owner || ''} | ${x.notes || ''}`).join('\n') : 'The pipeline is empty.')); used.push(`${p.length} pipeline rows`); }
    if (tool.brain) {
      const q = [c?.name, c?.category, ...Object.entries(vals).filter(([k]) => k !== 'client').map(([, v]) => v), String(material || '').slice(0, 1500)].join(' ');
      const hits = RT.brainFind(q, c?.id);
      if (hits.length) { out.push('AGENCY BRAIN: RELEVANT PAST WORK\n' + hits.map((b) => `- "${b.title}" | ${b.clientName || 'no client'} | ${b.format || ''} | ${b.year || ''} | outcome: ${b.outcome || 'not recorded'}\n  ${clip(b.summary || b.text || '', 700)}`).join('\n')); used.push(`${hits.length} Brain match${hits.length > 1 ? 'es' : ''}`); }
      else out.push('AGENCY BRAIN: nothing relevant is filed yet.');
    }
    return { text: out.join('\n\n'), used };
  };
  RT.prompt = (tool, vals, material) => {
    const ctx = RT.context(tool, vals, material);
    const fields = (tool.fields || []).filter((f) => f.type !== 'material' && f.type !== 'client' && vals[f.k]).map((f) => `${f.label}: ${vals[f.k]}`).join('\n');
    const acts = tool.acts?.length ? `\n\nAfter the document, end with one fenced block that starts with \`\`\`json and holds exactly this object. Use empty arrays where nothing applies. Only include items the material supports.\n{\n  ${tool.acts.map((a) => CFG.ACT[a]).join(',\n  ')}\n}` : '';
    return { ctx, text: `${CFG.HOUSE}\n\n${ctx.text}\n\nTASK: ${tool.name}\n${tool.prompt}${fields ? '\n\nINPUTS\n' + fields : ''}\n\nMATERIAL\n<<<\n${clip(material || '(none provided)', 120000)}\n>>>${acts}` };
  };
  RT.splitActs = (text) => {
    const i = text.lastIndexOf('```json');
    if (i < 0) return { body: text.trim(), acts: null };
    let acts = null; const m = text.slice(i).match(/```json\s*([\s\S]*?)(```|$)/);
    try { acts = JSON.parse(m[1]); } catch {}
    return { body: text.slice(0, i).trim(), acts };
  };

  /* ---------- Markdown ---------- */
  const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>').replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/\[(MISSING|NEEDS REVIEW|Placeholder)([^\]]*)\]/g, '<mark>[$1$2]</mark>');
  const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  RT.md = (text) => {
    const L = String(text || '').replace(/\r/g, '').split('\n'), B = []; let i = 0;
    while (i < L.length) {
      const l = L[i];
      if (!l.trim()) { i++; continue; }
      let m;
      if ((m = l.match(/^```(\w*)/))) { const buf = []; i++; while (i < L.length && !L[i].startsWith('```')) buf.push(L[i++]); i++; B.push({ t: 'code', text: buf.join('\n') }); continue; }
      if ((m = l.match(/^(#{1,4})\s+(.*)/))) { B.push({ t: 'h', n: m[1].length, text: m[2].replace(/\*\*/g, '') }); i++; continue; }
      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < L.length && /^\s*\|?[\s:\-|]+\|?\s*$/.test(L[i + 1]) && L[i + 1].includes('-')) {
        const head = cells(l), rows = []; i += 2;
        while (i < L.length && /^\s*\|.*\|\s*$/.test(L[i])) rows.push(cells(L[i++]));
        B.push({ t: 'table', head, rows }); continue;
      }
      if (/^\s*([-*•]|\d+[.)])\s+/.test(l)) {
        const ord = /^\s*\d+[.)]\s+/.test(l), items = [];
        while (i < L.length && /^\s*([-*•]|\d+[.)])\s+/.test(L[i])) { let it = L[i].replace(/^\s*([-*•]|\d+[.)])\s+/, ''); i++; while (i < L.length && /^\s{2,}\S/.test(L[i]) && !/^\s*([-*•]|\d+[.)])\s+/.test(L[i])) it += ' ' + L[i++].trim(); items.push(it); }
        B.push({ t: 'list', ord, items }); continue;
      }
      if (/^(-{3,}|\*{3,})$/.test(l.trim())) { B.push({ t: 'hr' }); i++; continue; }
      const buf = [l]; i++;
      while (i < L.length && L[i].trim() && !/^(#{1,4}\s|```|\s*([-*•]|\d+[.)])\s+|\s*\|)/.test(L[i])) buf.push(L[i++]);
      B.push({ t: 'p', text: buf.join(' ') });
    }
    return B;
  };
  RT.mdHtml = (text) => RT.md(text).map((b) => {
    if (b.t === 'h') return `<h${Math.min(4, b.n + 1)}>${inline(b.text)}</h${Math.min(4, b.n + 1)}>`;
    if (b.t === 'p') return `<p>${inline(b.text)}</p>`;
    if (b.t === 'list') return `<${b.ord ? 'ol' : 'ul'}>${b.items.map((x) => `<li>${inline(x)}</li>`).join('')}</${b.ord ? 'ol' : 'ul'}>`;
    if (b.t === 'table') return `<div class="rt-tw"><table><thead><tr>${b.head.map((x) => `<th>${inline(x)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((x) => `<td>${inline(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    if (b.t === 'code') return `<pre>${esc(b.text)}</pre>`;
    return '<hr>';
  }).join('');
  const plain = (RT.plain = (s) => String(s || '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/^#{1,4}\s+/gm, '').replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '$1 ($2)'));

  /* ---------- libraries (loaded on first use from the script hosts the page is allowed to use) ---------- */
  const CJ = 'https://cdnjs.cloudflare.com/ajax/libs/';
  const CDN = { 'xlsx.full.min.js': CJ + 'xlsx/0.18.5/xlsx.full.min.js', 'jszip.min.js': CJ + 'jszip/3.10.1/jszip.min.js', 'mammoth.browser.min.js': CJ + 'mammoth/1.6.0/mammoth.browser.min.js', 'pdf.min.js': CJ + 'pdf.js/3.11.174/pdf.min.js', 'docx.umd.js': 'https://unpkg.com/docx@8.5.0/build/index.umd.js', 'pptxgen.bundle.js': 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js' };
  const libs = {};
  RT.lib = (name, test) => (libs[name] ||= new Promise((res, rej) => { if (test()) return res(test()); const s = document.createElement('script'); s.src = CDN[name]; s.onload = () => (test() ? res(test()) : rej(new Error('library did not load'))); s.onerror = () => { delete libs[name]; rej(new Error('library did not load')); }; document.head.append(s); }));
  const XLSXlib = () => RT.lib('xlsx.full.min.js', () => window.XLSX);
  const ZIPlib = () => RT.lib('jszip.min.js', () => window.JSZip);

  /* ---------- reading files ---------- */
  RT.readFile = async (file) => {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (/^(txt|md|markdown|csv|tsv|eml|json|html|htm|xml|srt|vtt)$/.test(ext) || file.type.startsWith('text/')) return { text: await file.text() };
    if (/^(png|jpe?g|webp|gif)$/.test(ext)) return { image: file, text: `[Image attached: ${file.name}]` };
    if (ext === 'docx') { const m = await RT.lib('mammoth.browser.min.js', () => window.mammoth); return { text: (await m.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value }; }
    if (ext === 'pdf') {
      const pdf = await RT.lib('pdf.min.js', () => window.pdfjsLib); pdf.GlobalWorkerOptions.workerSrc = CJ + 'pdf.js/3.11.174/pdf.worker.min.js';
      const doc = await pdf.getDocument({ data: await file.arrayBuffer() }).promise, out = [];
      for (let p = 1; p <= Math.min(doc.numPages, 200); p++) { const tc = await (await doc.getPage(p)).getTextContent(); out.push(`[Page ${p}]\n` + tc.items.map((i) => i.str).join(' ')); }
      const text = out.join('\n\n'); return { text: text.replace(/\[Page \d+\]/g, '').trim() ? text : `[${file.name}: this PDF has no readable text. It is probably scanned images.]` };
    }
    if (ext === 'pptx') {
      const zip = await (await ZIPlib()).loadAsync(await file.arrayBuffer());
      const grab = (xml) => [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")).filter((s) => s.trim()).join(' | ');
      const n = (f) => +f.match(/(\d+)\.xml$/)[1];
      const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f)).sort((a, b) => n(a) - n(b)), out = [];
      for (const f of slides) { const notes = zip.files[`ppt/notesSlides/notesSlide${n(f)}.xml`]; out.push(`[Slide ${n(f)}] ${grab(await zip.files[f].async('string'))}` + (notes ? `\n  Notes: ${grab(await notes.async('string'))}` : '')); }
      return { text: out.join('\n') };
    }
    if (/^(xlsx|xls|ods)$/.test(ext)) { const X = await XLSXlib(), wb = X.read(await file.arrayBuffer()); return { text: wb.SheetNames.map((s) => `[Sheet: ${s}]\n` + X.utils.sheet_to_csv(wb.Sheets[s], { blankrows: false })).join('\n\n') }; }
    if (/^(mp3|m4a|ogg|opus|wav|mp4|mov|webm)$/.test(ext)) return { text: `[${file.name}: audio and video cannot be read in this build. Paste a transcript, or dictate with the mic.]`, skipped: true };
    return { text: `[${file.name}: this file type cannot be read here.]`, skipped: true };
  };

  /* ---------- exports ---------- */
  RT.fileName = (clientName, what, ext) => `${(clientName || 'TSL').replace(/[^A-Za-z0-9]+/g, '')}_${String(what).replace(/[^A-Za-z0-9]+/g, ' ').trim().split(' ').map((w) => w[0].toUpperCase() + w.slice(1)).join('')}_${RT.today().replace(/-/g, '')}.${ext}`;
  RT.save = async (filename, data) => {
    if (!S.dl) { RT.toast('Downloads are not available in this view. Use Copy instead.'); return false; }
    try { await S.dl.save({ filename, data }); RT.toast('Saved ' + filename); return true; }
    catch (e) { RT.toast(e?.code === 'declined' ? 'Download cancelled.' : e?.code === 'rate_limited' ? 'Another download prompt is open. Close it and try again.' : 'Could not save the file (' + (e?.code || 'error') + ').'); return false; }
  };
  RT.copy = async (text) => { try { await navigator.clipboard.writeText(text); RT.toast('Copied.'); } catch { RT.toast('Could not copy. Select the text on the page instead.'); } };

  RT.toDocx = async (title, text) => {
    const D = await RT.lib('docx.umd.js', () => window.docx), F = 'Poppins';
    const runs = (s, base = {}) => String(s).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((p) => new D.TextRun({ text: p.replace(/^\*\*|\*\*$/g, '').replace(/`/g, ''), bold: /^\*\*/.test(p) || base.bold, font: F, size: base.size || 20, color: base.color }));
    const kids = [new D.Paragraph({ spacing: { after: 240 }, children: [new D.TextRun({ text: title, bold: true, font: F, size: 36 })] })];
    const bd = { style: D.BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, borders = { top: bd, bottom: bd, left: bd, right: bd };
    RT.md(text).forEach((b) => {
      if (b.t === 'h') kids.push(new D.Paragraph({ spacing: { before: 260, after: 100 }, keepNext: true, children: runs(b.text, { bold: true, size: b.n <= 2 ? 26 : 22 }) }));
      else if (b.t === 'p') kids.push(new D.Paragraph({ spacing: { after: 120, line: 290 }, children: runs(b.text) }));
      else if (b.t === 'list') b.items.forEach((it) => kids.push(new D.Paragraph({ numbering: { reference: b.ord ? 'num' : 'bul', level: 0 }, spacing: { after: 70, line: 280 }, children: runs(it) })));
      else if (b.t === 'code') b.text.split('\n').forEach((l) => kids.push(new D.Paragraph({ children: [new D.TextRun({ text: l, font: 'Courier New', size: 18 })] })));
      else if (b.t === 'table') {
        const n = Math.max(b.head.length, ...b.rows.map((r) => r.length)), W = 9746, w = Math.floor(W / n);
        const cell = (t, head) => new D.TableCell({ width: { size: w, type: D.WidthType.DXA }, borders, margins: { top: 60, bottom: 60, left: 90, right: 90 }, shading: head ? { fill: '111111', type: D.ShadingType.CLEAR, color: 'auto' } : undefined, children: [new D.Paragraph({ children: runs(t ?? '', { size: 16, bold: head, color: head ? 'FFFFFF' : undefined }) })] });
        const row = (r, head) => new D.TableRow({ tableHeader: head, cantSplit: true, children: Array.from({ length: n }, (_, i) => cell(r[i] ?? '', head)) });
        kids.push(new D.Table({ width: { size: w * n, type: D.WidthType.DXA }, columnWidths: Array(n).fill(w), rows: [row(b.head, true), ...b.rows.map((r) => row(r, false))] }), new D.Paragraph({ spacing: { after: 120 }, children: [] }));
      }
    });
    const lvl = (format, t) => [{ level: 0, format, text: t, alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 260 } } } }];
    const doc = new D.Document({ numbering: { config: [{ reference: 'bul', levels: lvl(D.LevelFormat.BULLET, '•') }, { reference: 'num', levels: lvl(D.LevelFormat.DECIMAL, '%1.') }] }, sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } }, children: kids }] });
    return D.Packer.toBlob(doc);
  };
  RT.toXlsx = async (text) => {
    const X = await XLSXlib(), wb = X.utils.book_new(), B = RT.md(text), used = new Set(); let lastH = '';
    const name = (s) => { let n = (plain(s) || 'Sheet').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 28) || 'Sheet', k = n, i = 2; while (used.has(k.toLowerCase())) k = n.slice(0, 25) + ' ' + i++; used.add(k.toLowerCase()); return k; };
    B.forEach((b) => { if (b.t === 'h') lastH = b.text; if (b.t === 'table') { const ws = X.utils.aoa_to_sheet([b.head, ...b.rows].map((r) => r.map((c) => { const p = plain(c); return /^-?[\d,]+(\.\d+)?$/.test(p) && p.replace(/,/g, '').length < 15 ? +p.replace(/,/g, '') : p; }))); ws['!cols'] = b.head.map((_, i) => ({ wch: Math.min(60, Math.max(12, ...[b.head, ...b.rows].map((r) => String(r[i] ?? '').length + 2))) })); X.utils.book_append_sheet(wb, ws, name(lastH)); } });
    if (!wb.SheetNames.length) X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(plain(text).split('\n').map((l) => [l])), 'Notes');
    return new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })]);
  };
  RT.toPptx = async (title, clientName, deck, text) => {
    const P = await RT.lib('pptxgen.bundle.js', () => window.PptxGenJS), p = new P(), OR = 'F5851F', INK = '111111';
    p.layout = 'LAYOUT_WIDE';
    if (!deck?.length) { deck = []; let cur = null; RT.md(text).forEach((b) => { if (b.t === 'h') deck.push((cur = { title: b.text, bullets: [] })); else if (cur && b.t === 'list') cur.bullets.push(...b.items.map(plain)); else if (cur && b.t === 'p') cur.bullets.push(plain(b.text)); }); }
    const s0 = p.addSlide(); s0.background = { color: INK };
    s0.addText(title, { x: 0.7, y: 2.3, w: 11.9, h: 1.6, fontFace: 'Poppins', fontSize: 40, bold: true, color: 'FFFFFF' });
    s0.addText(`${clientName || ''}  |  ${RT.day(RT.today())}  |  Skeleton from Red Thread. Design to follow.`, { x: 0.7, y: 4.1, w: 11.9, h: 0.4, fontFace: 'Poppins', fontSize: 12, color: OR });
    deck.slice(0, 60).forEach((d, i) => {
      const s = p.addSlide(); s.background = { color: 'FFFFFF' };
      s.addText(String(i + 1).padStart(2, '0'), { x: 0.6, y: 0.4, w: 1, h: 0.3, fontFace: 'Poppins', fontSize: 10, color: OR, bold: true });
      s.addText(plain(d.title || ''), { x: 0.6, y: 0.75, w: 12.1, h: 1.1, fontFace: 'Poppins', fontSize: 26, bold: true, color: INK, valign: 'top' });
      const bl = (d.bullets || []).slice(0, 8).map((t) => ({ text: plain(t), options: { bullet: { indent: 16 }, breakLine: true, paraSpaceAfter: 8 } }));
      if (bl.length) s.addText(bl, { x: 0.6, y: 2.0, w: 7.6, h: 4.3, fontFace: 'Poppins', fontSize: 15, color: '333333', valign: 'top' });
      if (d.visual) s.addText([{ text: 'VISUAL', options: { bold: true, color: OR, fontSize: 9, breakLine: true } }, { text: plain(d.visual), options: { color: '666666', fontSize: 12 } }], { x: 8.6, y: 2.0, w: 4.1, h: 4.3, fontFace: 'Poppins', valign: 'top', line: { color: 'DDDDDD', width: 0.75, dashType: 'dash' }, margin: 12 });
      if (d.notes) s.addNotes(plain(d.notes));
    });
    return p.write({ outputType: 'blob' });
  };

  /* ---------- connectors (the viewer's own Gmail and Drive) ---------- */
  RT.mcpError = (e, server) => {
    switch (e?.code) {
      case 'server_not_connected': return `${server} is not connected for you. Add it in claude.ai Settings, under Connectors.`;
      case 'needs_reauth': return `${server} needs reconnecting in claude.ai Settings, under Connectors.`;
      case 'not_in_manifest': case 'consent_required': case 'approval_required': return `You have not allowed Red Thread to use ${server}. Try again and choose Allow when claude.ai asks.`;
      case 'blocked_by_policy': return `Your organisation blocks ${server} for this page.`;
      case 'selection_required': return `You have more than one ${server} connector. Choose one when claude.ai asks, then try again.`;
      case 'tool_error': return `${server} answered with an error: ${String(e.message || '').slice(0, 160)}`;
      case 'not_granted': case 'capability_disabled': case 'capability_removed': return `Connectors are not available in this view. Paste the content instead.`;
      default: return `${server} did not respond. Try again in a moment.`;
    }
  };
  const call = async (server, tool, input) => { if (!S.mcp) throw { code: 'capability_disabled' }; const r = await S.mcp.callTool(server, tool, input); return r?.payload ?? r?.structuredContent ?? r?.content?.map((c) => c.text || '').join('\n') ?? r; };
  const arr = (p, keys) => { if (Array.isArray(p)) return p; for (const k of keys) if (Array.isArray(p?.[k])) return p[k]; return []; };
  RT.gmailSearch = async (query) => arr(await call('Gmail', 'search_threads', { query, pageSize: 15, view: 'THREAD_VIEW_SUMMARY' }), ['threads', 'items']).map((t) => { const m = (t.messages || [])[0] || t; return { id: t.id, subject: m.subject || t.subject || '(no subject)', from: m.sender || '', date: m.date || '', snippet: m.snippet || '', count: t.messageCount }; });
  RT.gmailThread = async (id) => { const p = await call('Gmail', 'get_thread', { threadId: id, messageFormat: 'PLAIN_TEXT' }); const ms = arr(p, ['messages']); return ms.length ? ms.map((m) => `From: ${m.sender || ''}\nTo: ${[].concat(m.toRecipients || []).join(', ')}\nDate: ${m.date || ''}\nSubject: ${m.subject || ''}\n\n${m.plaintextBody || m.snippet || ''}`).join('\n\n-----\n\n') : typeof p === 'string' ? p : JSON.stringify(p); };
  RT.gmailDraft = async ({ to, subject, body }) => call('Gmail', 'create_draft', { ...(to?.length ? { to } : {}), subject, body });
  RT.driveSearch = async (q) => arr(await call('Google Drive', 'search_files', { query: `fullText contains '${String(q).replace(/'/g, "\\'")}'`, pageSize: 15, excludeContentSnippets: true }), ['files', 'items', 'results']).map((f) => ({ id: f.id || f.fileId, title: f.title || f.name || '(untitled)', mime: f.mimeType || '', url: f.viewUrl || f.webViewLink || f.url || '', modified: f.modifiedTime || '' }));
  RT.driveRead = async (id) => { const p = await call('Google Drive', 'read_file_content', { fileId: id }); return typeof p === 'string' ? p : p?.content || p?.text || p?.fileContent || JSON.stringify(p); };
  RT.parseEmail = (text) => { const i = text.search(/^\**Subject:\**/im); if (i < 0) return { subject: '', body: plain(text) }; const rest = text.slice(i), nl = rest.indexOf('\n'); const subject = plain(rest.slice(0, nl < 0 ? undefined : nl)).replace(/^Subject:\s*/i, '').trim(); let body = nl < 0 ? '' : rest.slice(nl + 1); const stop = body.search(/^#{1,4}\s/m); if (stop > 0) body = body.slice(0, stop); return { subject, body: plain(body).trim() }; };
})();
