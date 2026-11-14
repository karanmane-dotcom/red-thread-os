/* Red Thread OS: the public homepage sections. Mounted into #rt-land, which the homepage renders
   in place of the old brief-only sections. No client names and no figures: this page is seen before sign-in. */
(() => {
  'use strict';
  const STOPS = [
    { k: 'Brief', mod: '01 Brief Desk', line: 'Reads what the client sent, asks only what is missing and routes the work to each team.' },
    { k: 'Pitch', mod: '02 Pitch Studio', line: 'Turns the brief into an insight, routes and a deck, then lets you rehearse against the client.' },
    { k: 'Contract', mod: '03 Commercial Engine', line: 'Prices every scope and every new ask against the rate card before anyone says yes.' },
    { k: 'Delivery', mod: '04 Meeting Room, 05 Delivery Board, 06 Make Lab', line: 'Minutes, tasks, timelines and first drafts, with every promise logged as it is made.' },
    { k: 'Report', mod: '07 Proof and Reports', line: 'Reports that explain why the numbers moved, and case studies built only on sourced results.' },
    { k: 'Renewal', mod: '08 Growth Desk', line: 'What we promised against what we delivered, and every renewal flagged 90 days out.' },
  ];
  const ROLES = [
    { k: 'Account Management', head: 'Every account, held in one place.', items: ['Briefs decoded, gaps listed and work routed in minutes.', 'Minutes and follow-ups drafted from your notes, saved to Gmail as drafts.', 'Every client ask priced against the rate card before you reply.', 'Every promise tracked from the first email to the renewal.'] },
    { k: 'Creative and Copy', head: 'Briefs that arrive with the client\'s rules attached.', items: ['Every draft follows what this client has liked and rejected before.', 'Creative routes, key visual direction and copy to react to, not a blank page.', 'Image and video prompts written from the approved idea.', 'Feedback turned into a clean revision list with the exact change for each asset.'] },
    { k: 'Media', head: 'Numbers with a reason next to them.', items: ['Activity grids and KOL sheets built from the plan, ready for Sheets.', 'Monthly reports that read every number against last month and target.', 'Content analysis at creative level: format, hook, story and who is speaking.', 'Every figure carries its source and date range.'] },
    { k: 'Tech', head: 'A working starting point, in the client\'s brand.', items: ['Art direction briefs page by page, from the reference and the brief.', 'Working one-page prototypes for pitches, previewed and downloaded as HTML.', 'Brand and design rules that travel with each client.', 'Scope that separates maintenance from new development from the start.'] },
    { k: 'Leadership', head: 'The agency on one screen.', items: ['What each account earns against the team time it uses.', 'Which clients are cooling, with the evidence, before renewal.', 'Out-of-scope work logged, billed or absorbed, every month.', 'Pipeline, win rate and renewals coming up.'] },
  ];
  const RULES = [
    ['It drafts. People send.', 'Nothing leaves Red Thread on its own. Emails are saved as drafts for a person to check.'],
    ['It never invents a number.', 'A missing figure is marked as missing, not guessed.'],
    ['Every figure carries its source.', 'Performance numbers come with where they came from and the dates they cover.'],
    ['Each client\'s rules apply every time.', 'What a client has asked for before is applied to every draft made for them.'],
    ['Commercials stay with the people who own them.', 'Pricing, contracts and account economics are shown to Account Management and leadership.'],
  ];

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mount = (el) => {
    if (el.dataset.ready) return; el.dataset.ready = '1'; el.className = 'rtl';
    el.innerHTML = `
      <section class="rtl-sec rtl-thread">
        <div class="rtl-label">How work moves</div>
        <h2>One thread from the first brief to the renewal.</h2>
        <p class="rtl-sub">Eight modules sit along the life of a client. Each one hands its work to the next, so nothing is retyped and nothing is lost between teams.</p>
        <div class="rtl-line" role="list">
          <svg class="rtl-svg" aria-hidden="true" preserveAspectRatio="none"><path class="rtl-bg"/><path class="rtl-fg"/></svg>
          ${STOPS.map((s, i) => `<div class="rtl-stop" role="listitem" style="--i:${i}"><span class="rtl-dot"></span><div class="rtl-k"><span>0${i + 1}</span>${esc(s.k)}</div><div class="rtl-mod">${esc(s.mod)}</div><p>${esc(s.line)}</p></div>`).join('')}
        </div>
        <p class="rtl-under"><span></span>Underneath the thread, the Agency Brain keeps every piece of past work searchable and the Client Twin keeps each client's preferences, so every draft starts from what the agency already knows.</p>
      </section>
      <section class="rtl-sec rtl-roles">
        <div class="rtl-label">By desk</div>
        <h2>What lands on your dashboard.</h2>
        <div class="rtl-tabs" role="tablist">${ROLES.map((r, i) => `<button role="tab" type="button" aria-selected="${i === 0}" data-i="${i}">${esc(r.k)}</button>`).join('')}</div>
        <div class="rtl-role" role="tabpanel"></div>
      </section>
      <section class="rtl-sec rtl-rules">
        <div class="rtl-label">Ground rules</div>
        <h2>Five rules it never breaks.</h2>
        <ol>${RULES.map((r, i) => `<li><span class="n">0${i + 1}</span><div><strong>${esc(r[0])}</strong><p>${esc(r[1])}</p></div></li>`).join('')}</ol>
      </section>`;

    // role switcher
    const panel = el.querySelector('.rtl-role'), tabs = [...el.querySelectorAll('.rtl-tabs button')];
    let cur = 0, timer = null, touched = false;
    const show = (i) => { cur = i; tabs.forEach((t, j) => t.setAttribute('aria-selected', String(j === i))); const r = ROLES[i]; panel.classList.remove('in'); void panel.offsetWidth; panel.innerHTML = `<h3>${esc(r.head)}</h3><ul>${r.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`; panel.classList.add('in'); };
    tabs.forEach((t) => t.addEventListener('click', () => { touched = true; clearInterval(timer); show(+t.dataset.i); }));
    tabs.forEach((t) => t.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); touched = true; clearInterval(timer); const n = (cur + (e.key === 'ArrowRight' ? 1 : ROLES.length - 1)) % ROLES.length; show(n); tabs[n].focus(); } }));
    show(0);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) timer = setInterval(() => { if (!touched && el.isConnected) show((cur + 1) % ROLES.length); else clearInterval(timer); }, 5200);

    // the thread: draw the red line through the stops as the section scrolls into view
    const line = el.querySelector('.rtl-line'), svg = el.querySelector('.rtl-svg'), bg = el.querySelector('.rtl-bg'), fg = el.querySelector('.rtl-fg'), stops = [...el.querySelectorAll('.rtl-stop')];
    let len = 0;
    const layout = () => {
      const box = line.getBoundingClientRect(); if (!box.width) return;
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`); svg.setAttribute('width', box.width); svg.setAttribute('height', box.height);
      const pts = stops.map((s) => { const d = s.querySelector('.rtl-dot').getBoundingClientRect(); return [d.left - box.left + d.width / 2, d.top - box.top + d.height / 2]; });
      let dd = `M ${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; if (Math.abs(y1 - y0) < 4) { const mx = (x0 + x1) / 2; dd += ` C ${mx} ${y0 - 26}, ${mx} ${y1 + 26}, ${x1} ${y1}`; } else { const my = (y0 + y1) / 2; dd += ` C ${x0 + 26} ${my}, ${x1 - 26} ${my}, ${x1} ${y1}`; } }
      bg.setAttribute('d', dd); fg.setAttribute('d', dd); len = fg.getTotalLength(); fg.style.strokeDasharray = len; progress();
    };
    const scroller = (() => { let p = el.parentElement; while (p && p !== document.body) { const o = getComputedStyle(p).overflowY; if (o === 'auto' || o === 'scroll') return p; p = p.parentElement; } return window; })();
    const progress = () => {
      if (!len) return;
      let t = 1;
      if (!reduced) { const r = line.getBoundingClientRect(), vh = (scroller === window ? window.innerHeight : scroller.getBoundingClientRect().height); t = Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (r.height + vh * 0.35))); }
      fg.style.strokeDashoffset = String(len * (1 - t));
      stops.forEach((s, i) => s.classList.toggle('on', t >= i / (stops.length - 1) - 0.02));
    };
    let raf = 0; const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(progress); };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(() => layout()); ro.observe(line);
    document.fonts?.ready.then(layout, () => {});
    setTimeout(layout, 50);
    const gone = new MutationObserver(() => { if (!el.isConnected) { scroller.removeEventListener('scroll', onScroll); ro.disconnect(); clearInterval(timer); gone.disconnect(); } });
    gone.observe(document.body, { childList: true, subtree: true });
  };
  const find = () => { const el = document.getElementById('rt-land'); if (el && !el.dataset.ready) mount(el); };
  new MutationObserver(find).observe(document.documentElement, { childList: true, subtree: true });
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', find) : find();
})();
