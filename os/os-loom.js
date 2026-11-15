/* Red Thread OS: the Loom. Every account as a thread across the next twelve weeks.
   Knots are promises, client asks, due tasks and renewals. A thread turns red or amber with client health
   and thickens with the retainer. Tap a thread to open the client; tap a knot to see what it is. */
(() => {
  'use strict';
  const RT = window.RT, { h, S, slug, go } = RT;
  let showAll = false;
  const DAY = 864e5;
  const toDate = (s) => { if (!s) return null; const d = new Date(String(s).slice(0, 10) + 'T00:00:00'); return isNaN(d) ? null : d; };

  RT.loom = () => {
    const today = toDate(RT.today()), start = new Date(today - 14 * DAY), end = new Date(+today + 70 * DAY);
    const mineIds = RT.myBrands().map(slug), mgr = RT.can();
    const pr = RT.rows('promises'), sc = RT.rows('scope'), tk = RT.rows('tasks').filter((t) => !t.done && t.client);
    let rows = RT.clients().filter((c) => c.id !== 'tsl' && (mgr || mineIds.includes(c.id))).map((c) => {
      const knots = [];
      pr.filter((p) => p.client === c.id && p.due).forEach((p) => { const d = toDate(p.due); if (!d) return; const open = (p.status || 'open') === 'open'; knots.push({ d, kind: open && d < today ? 'late' : p.status === 'kept' ? 'kept' : p.status === 'missed' ? 'missed' : 'promise', text: `Promise${open && d < today ? ', overdue' : p.status ? ', ' + p.status : ''}: ${p.promise}`, meta: `Due ${RT.day(p.due)}${p.owner ? ' · ' + p.owner : ''}`, tab: 'promises' }); });
      sc.filter((s) => s.client === c.id && s.inScope !== 'yes' && ['logged', 'approval asked'].includes(s.status || 'logged')).forEach((s) => { const d = toDate(s.at) || today; knots.push({ d: d < start ? start : d, kind: 'ask', text: `Client ask: ${s.ask}`, meta: `${s.value ? RT.inr(s.value) + ' · ' : ''}logged ${RT.day(s.at)}`, tab: 'scope' }); });
      tk.filter((t) => t.client === c.id && t.due).forEach((t) => { const d = toDate(t.due); if (d) knots.push({ d, kind: d < today ? 'tasklate' : 'task', text: `Task: ${t.title}`, meta: `Due ${RT.day(t.due)}${t.owner ? ' · ' + t.owner : t.department ? ' · ' + t.department : ''}`, tab: null }); });
      if (mgr && c.contractEnd) { const d = toDate(c.contractEnd); if (d) knots.push({ d, kind: 'renew', text: 'Contract ends', meta: RT.day(c.contractEnd), tab: 'profile' }); }
      const hl = RT.health ? RT.health(c) : { band: 'none', score: null };
      return { c, knots: knots.filter((k) => k.d >= start && k.d <= end), all: knots.length, hl, ret: RT.num(c.retainer), mine: mineIds.includes(c.id) };
    });
    const active = rows.filter((r) => r.all || r.ret || r.hl.band === 'red' || r.hl.band === 'amber');
    const rank = (r) => (r.hl.band === 'red' ? 0 : r.hl.band === 'amber' ? 1 : 2) * 1000 - r.knots.length * 10 - (r.mine ? 5 : 0);
    rows = (showAll ? rows : active.length ? active : rows.filter((r) => r.mine)).sort((a, b) => rank(a) - rank(b) || a.c.name.localeCompare(b.c.name)).slice(0, showAll ? 60 : 16);

    const LW = 150, RW = 24, rowH = 40, top = 44, W = 1000, Hh = top + rows.length * rowH + 16;
    const x = (d) => LW + ((d - start) / (end - start)) * (W - LW - RW);
    const maxRet = Math.max(1, ...rows.map((r) => r.ret));
    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.append(e); return e; };
    const svg = el('svg', { viewBox: `0 0 ${W} ${Hh}`, class: 'rt-loom-svg', role: 'img', 'aria-label': 'Accounts across the next twelve weeks' });
    // week grid
    for (let d = new Date(start); d <= end; d = new Date(+d + 7 * DAY)) { const X = x(d); el('line', { x1: X, x2: X, y1: top - 10, y2: Hh - 8, class: 'g' }, svg); const t = el('text', { x: X + 4, y: top - 18, class: 'wk' }, svg); t.textContent = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
    const tx = x(today); el('line', { x1: tx, x2: tx, y1: top - 26, y2: Hh - 4, class: 'today' }, svg); const tt = el('text', { x: tx + 5, y: top - 30, class: 'today-t' }, svg); tt.textContent = 'TODAY';
    const tip = h('div', { class: 'rt-loom-tip', hidden: true });
    const showTip = (e, k, c) => { tip.hidden = false; RT.fill(tip, h('span', { class: 'rt-mono' }, c.name), h('strong', {}, k.text), h('span', {}, k.meta)); const box = wrap.getBoundingClientRect(); tip.style.left = Math.min(box.width - 260, Math.max(0, e.clientX - box.left + 12)) + 'px'; tip.style.top = (e.clientY - box.top + 14) + 'px'; };
    rows.forEach((r, i) => {
      const y = top + i * rowH + rowH / 2, g = el('g', { class: 'th ' + (r.hl.band || 'none') + (r.all ? '' : ' faint'), tabindex: '0', role: 'link', 'aria-label': `${r.c.name}: open the client` }, svg);
      const open = () => go('os-c-' + r.c.id);
      g.addEventListener('click', (e) => { if (!e.target.closest('.k')) open(); }); g.addEventListener('keydown', (e) => e.key === 'Enter' && open());
      const name = el('text', { x: 0, y: y + 4, class: 'nm' }, g); name.textContent = r.c.name.length > 20 ? r.c.name.slice(0, 19) + '…' : r.c.name;
      const sw = 1.1 + (r.ret ? 3.4 * Math.sqrt(r.ret / maxRet) : 0), seedv = i * 1.7;
      let dd = `M ${LW} ${y}`; const steps = 24;
      for (let s = 1; s <= steps; s++) { const X0 = LW + ((s - 0.5) / steps) * (W - LW - RW), X1 = LW + (s / steps) * (W - LW - RW), amp = (r.hl.band === 'red' ? 5 : r.hl.band === 'amber' ? 3.4 : 2) * Math.sin(s * 0.9 + seedv); dd += ` Q ${X0} ${y + amp} ${X1} ${y}`; }
      el('path', { d: dd, class: 'ln', 'stroke-width': sw.toFixed(2) }, g);
      el('rect', { x: 0, y: y - rowH / 2, width: W, height: rowH, class: 'hit' }, g).parentNode.insertBefore(g.lastChild, g.firstChild);
      r.knots.sort((a, b) => a.d - b.d).forEach((k, j) => {
        const X = x(k.d), kg = el('g', { class: 'k ' + k.kind, transform: `translate(${X} ${y})`, tabindex: '0', role: 'button', 'aria-label': k.text }, g);
        if (k.kind === 'ask') el('rect', { x: -4.5, y: -4.5, width: 9, height: 9, transform: 'rotate(45)' }, kg);
        else if (k.kind === 'renew') { el('circle', { r: 8 }, kg); el('circle', { r: 2.5, class: 'c' }, kg); }
        else if (k.kind === 'task' || k.kind === 'tasklate') el('line', { x1: 0, x2: 0, y1: -7, y2: 7 }, kg);
        else el('circle', { r: k.kind === 'kept' ? 4 : 5 }, kg);
        if (k.kind === 'late' || k.kind === 'missed') el('circle', { r: 11, class: 'halo' }, kg);
        kg.addEventListener('mouseenter', (e) => showTip(e, k, r.c)); kg.addEventListener('mousemove', (e) => showTip(e, k, r.c)); kg.addEventListener('mouseleave', () => (tip.hidden = true));
        kg.addEventListener('focus', () => { const b = kg.getBoundingClientRect(); showTip({ clientX: b.left, clientY: b.bottom }, k, r.c); }); kg.addEventListener('blur', () => (tip.hidden = true));
        kg.addEventListener('click', (e) => { e.stopPropagation(); if (k.tab) RT.clientTab?.(k.tab); open(); });
      });
    });
    const wrap = h('div', { class: 'rt-loom-wrap' }, svg, tip);
    const nNot = RT.clients().filter((c) => c.id !== 'tsl' && (mgr || mineIds.includes(c.id))).length - rows.length;
    return h('section', { class: 'rt-loom' },
      h('div', { class: 'rt-loom-h' },
        h('div', {}, h('div', { class: 'rt-mono' }, 'The Loom'), h('h2', {}, mgr ? 'Every account, the next ten weeks.' : 'Your accounts, the next ten weeks.')),
        h('p', { class: 'rt-legend' }, h('span', { class: 'lg promise' }), 'promise', h('span', { class: 'lg late' }), 'overdue', h('span', { class: 'lg ask' }), 'client ask', h('span', { class: 'lg task' }), 'task', mgr ? [h('span', { class: 'lg renew' }), 'renewal'] : null, h('span', { class: 'lg thread' }), mgr ? 'thicker means a larger retainer, red means at risk' : 'red means at risk')),
      rows.length ? wrap : h('p', { class: 'rt-empty' }, 'Nothing on the loom yet. Promises, client asks and tasks appear here as the team and the inbox sweep log them.'),
      (nNot > 0 || showAll) ? h('button', { class: 'rt-link', onclick: () => { showAll = !showAll; RT.render(); } }, showAll ? 'Show active accounts only' : `Show all ${nNot + rows.length} accounts`) : null);
  };
})();
