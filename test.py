import asyncio, json, sys, http.server, threading, functools, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).parent
PORT = 8765
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT / 'dist'))
class Q(http.server.ThreadingHTTPServer):
    pass
srv = Q(('127.0.0.1', PORT), handler)
handler.log_message = lambda *a, **k: None
threading.Thread(target=srv.serve_forever, daemon=True).start()

MOCK = r"""
(() => {
  const store = {}; const subs = {};
  const emit = (c) => (subs[c]||[]).forEach(fn => fn({docs: Object.values(store[c]||{}).map(d => ({data: () => d}))}));
  const db = { collection: (c) => ({
    doc: (id) => ({ set: async (o) => { (store[c] ||= {})[id] = o; emit(c); }, update: async (o) => { if(!(store[c]||{})[id]) throw {code:'not_found'}; Object.assign(store[c][id], o); emit(c); }, delete: async () => { delete (store[c]||{})[id]; emit(c); } }),
    onSnapshot: (fn) => { (subs[c] ||= []).push(fn); setTimeout(() => emit(c), 20); return () => {}; } }) };
  const OUT = `## Verdict\nok\n\n## Follow-up email\nSubject: Minutes and next steps\n\nHi team,\n\nPlease find the minutes.\n\n## More\nFix then send.\n\n## Scope\n| Activity | Units | Description of Activities |\n|---|---|---|\n| Social media | 12 posts | Monthly calendar with **reels** |\n| Reporting | 1 | Monthly report |\n\n## Next steps\n- The agency sends the revised deck by Friday.\n- The client shares [MISSING: brand guidelines].\n\n1. First point.\n2. Second point.\n\n\`\`\`json\n{"tasks":[{"title":"Send the revised deck","department":"Account Management","owner":"Karan","due":"2026-11-20"},{"title":"Write captions","department":"Copy","owner":"","due":""}],"promises":[{"promise":"Revised deck by Friday","owner":"Karan","due":"2026-11-20","source":"MoM"}],"scope":[{"ask":"Hindi translation","match":"Item 52","inScope":"no","price":"INR 3,000","value":3000,"approval":"Written approval from client"}],"rules":[{"rule":"Keep decks light on content.","source":"Feedback"}],"pipeline":[{"brand":"Lesser Evil","category":"D2C Packaged Food & Snacking","side":"TSL","notes":"Snacks"}],"deck":[{"title":"The month in three sentences","bullets":["Reach grew.","Engagement fell."],"visual":"Line chart","notes":"Say why"}]}\n\`\`\``;
  const sample = async (input, opts = {}) => { window.__lastPrompt = typeof input === 'string' ? input : JSON.stringify(input); const text = /Reply with ONLY a JSON/.test(window.__lastPrompt) ? '{"title":"Mogu Mogu festive deck","summary":"A festive campaign deck. It used creators. Reach was strong.","format":"Deck","tags":["beverage","festive","creators"],"results":""}' : /self-contained HTML/.test(window.__lastPrompt) ? '<!DOCTYPE html><html><body><h1>Proto</h1></body></html>' : OUT; opts.onText && opts.onText({ text: text.slice(0, 80) }); await new Promise(r => setTimeout(r, 50)); opts.onText && opts.onText({ text }); return { text }; };
  sample.limits = async () => ({ images: 4 });
  const saved = (window.__saved = []);
  const downloads = { save: async ({ filename, data }) => { saved.push([filename, data.size ?? data.length ?? data.byteLength]); return { status: 'saved' }; } };
  const mcp = { callTool: async (s, t, i) => { (window.__calls ||= []).push([s, t, i]); if (t === 'search_threads') return { payload: { threads: [{ id: 't1', messageCount: 3, messages: [{ subject: 'Estimate for SA20', sender: 'client@x.com', date: '2026-11-10', snippet: 'Please share the CE' }] }] } }; if (t === 'get_thread') return { payload: { messages: [{ sender: 'client@x.com', subject: 'Estimate', date: '2026-11-10', plaintextBody: 'Please share the cost estimate.' }] } }; if (t === 'search_files') return { payload: { files: [{ id: 'f1', title: 'Mogu Q4 deck', mimeType: 'application/vnd.google-apps.presentation', viewUrl: 'https://drive.google.com/x' }] } }; if (t === 'read_file_content') return { payload: 'Slide 1 festive plan for Mogu Mogu with creators and sampling across five cities and a Diwali film.' }; return { payload: { id: 'd1' } }; } };
  const caps = { db, sample, downloads, mcp, dictation: null };
  window.claude = { use: async (n) => (window.__nocaps ? null : caps[n] ?? null) };
  window.__store = store;
})();
"""

async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for name, vp in [('desk', {'width': 1440, 'height': 900}), ('phone', {'width': 390, 'height': 844})]:
            ctx = await b.new_context(viewport=vp)
            await ctx.add_init_script(MOCK)
            await ctx.add_init_script("try{localStorage.setItem('redthread.session.v1', JSON.stringify({email:'karan@thestarterlabs.com',name:'Karan Mane',department:'Account Management',designation:'Manager'}))}catch(e){}")
            pg = await ctx.new_page()
            pg.on('console', lambda m, n=name: errs.append(f'[{n}] console.{m.type}: {m.text}') if m.type in ('error',) else None)
            pg.on('pageerror', lambda e, n=name: errs.append(f'[{n}] pageerror: {e}'))
            await pg.goto(f'http://127.0.0.1:{PORT}/index.html'); await pg.wait_for_timeout(1500)
            print(name, 'hash', await pg.evaluate('location.hash'), 'layer hidden', await pg.evaluate("document.getElementById('rtos')?.hidden"))
            async def shot(tag, full=False):
                await pg.wait_for_timeout(350); await pg.screenshot(path=str(ROOT / f'shots/{name}-{tag}.png'))
            await shot('home')
            # horizontal overflow check on every route
            for r in ['os', 'os-m-brief', 'os-m-pitch', 'os-m-commercial', 'os-m-meeting', 'os-m-delivery', 'os-m-make', 'os-m-proof', 'os-m-growth', 'os-brain', 'os-clients', 'os-c-mogu-mogu', 'os-tasks', 'os-pilot', 'os-setup', 'os-t-mom', 'os-t-rehearsal', 'os-t-brief-decode', 'os-t-prototype', 'os-founder']:
                await pg.evaluate(f"location.hash='{r}'"); await pg.wait_for_timeout(300)
                ov = await pg.evaluate("(()=>{const m=document.querySelector('.rt-main');return [m.scrollWidth-m.clientWidth, document.querySelector('.rt-page').innerText.length]})()")
                if ov[0] > 2 or ov[1] < 40: print('  CHECK', r, ov)
            if name == 'desk':
                # run MoM
                await pg.evaluate("location.hash='os-t-mom'"); await pg.wait_for_timeout(300)
                await pg.select_option('.rt-run-l select', 'mogu-mogu')
                await pg.fill('.rt-mat', 'Client asked for Hindi translation. We promised the revised deck by Friday.')
                await pg.fill('.rt-run-l input[placeholder*="client@"]', 'client@example.com')
                await pg.click('text=Pull from Gmail'); await pg.wait_for_timeout(400); await pg.click('.rt-pick-row input'); await pg.click('text=Add selected'); await pg.wait_for_timeout(400)
                await pg.click('.rt-run-l .rt-btn.primary'); await pg.wait_for_timeout(600)
                await shot('mom')
                print('  prompt has house:', await pg.evaluate("window.__lastPrompt.includes('You are Red Thread') && window.__lastPrompt.includes('Gmail thread') && window.__lastPrompt.includes('\"tasks\"')"))
                for lab in ['Add to Delivery Board', 'Log in Promise Ledger', 'Log in Scope Ledger']:
                    await pg.click(f'button:has-text("{lab}")'); await pg.wait_for_timeout(200); await pg.click('.rt-modal-f .primary'); await pg.wait_for_timeout(200)
                for lab in ['Word', 'Save as Gmail draft']:
                    await pg.click(f'.rt-outbar button:has-text("{lab}")'); await pg.wait_for_timeout(1500)
                await pg.fill('.rt-after input[type=number]', '45'); await pg.click('.rt-after button:has-text("Log")')
                await pg.fill('.rt-after input[placeholder*="always"]', 'Always send minutes within 24 hours.'); await pg.click('button:has-text("Save rule")')
                await pg.fill('.rt-outbar input[placeholder*="Ask for a change"]', 'make it shorter'); await pg.click('button:has-text("Revise")'); await pg.wait_for_timeout(500)
                # cost proposal -> excel ; report -> pptx
                await pg.evaluate("location.hash='os-t-cost-proposal'"); await pg.wait_for_timeout(300)
                await pg.fill('.rt-mat', 'Two showcase sites maintenance'); await pg.click('.rt-run-l .rt-btn.primary'); await pg.wait_for_timeout(500)
                print('  costing in prompt:', await pg.evaluate("window.__lastPrompt.includes('1,125') && window.__lastPrompt.includes('CLIENT RULES')"))
                await pg.click('.rt-outbar button:has-text("Excel")'); await pg.wait_for_timeout(1500)
                await pg.evaluate("location.hash='os-t-report-builder'"); await pg.wait_for_timeout(300)
                await pg.fill('.rt-mat', 'Reach 100 from Meta 1-31 Oct'); await pg.click('.rt-run-l .rt-btn.primary'); await pg.wait_for_timeout(500)
                await pg.click('.rt-outbar button:has-text("PowerPoint")'); await pg.wait_for_timeout(2500)
                await pg.click('.rt-outbar button:has-text("File in Agency Brain")'); await pg.wait_for_timeout(200); await pg.click('.rt-modal-f .primary'); await pg.wait_for_timeout(200)
                # prototype
                await pg.evaluate("location.hash='os-t-prototype'"); await pg.wait_for_timeout(300)
                await pg.fill('.rt-mat', 'Pitch copy'); await pg.click('.rt-run-l .rt-btn.primary'); await pg.wait_for_timeout(600); await shot('proto')
                # rehearsal chat
                await pg.evaluate("location.hash='os-t-rehearsal'"); await pg.wait_for_timeout(300)
                await pg.fill('.rt-chatin textarea', 'Here is our idea'); await pg.click('.rt-chatin .primary'); await pg.wait_for_timeout(500); await shot('chat')
                # brain add via drive import + ask
                await pg.evaluate("location.hash='os-brain'"); await pg.wait_for_timeout(300)
                await pg.click('text=Import from Drive'); await pg.fill('.rt-modal input', 'Mogu'); await pg.click('.rt-modal button:has-text("Search")'); await pg.wait_for_timeout(300); await pg.click('.rt-pick-row'); await pg.wait_for_timeout(500)
                await pg.click('text=Write the summary and tags for me'); await pg.wait_for_timeout(500); await pg.click('.rt-modal-f .primary'); await pg.wait_for_timeout(300)
                await pg.fill('.rt-chatin textarea', 'festive beverage creators'); await pg.click('.rt-chatin .primary'); await pg.wait_for_timeout(400)
                print('  brain ask has entry:', await pg.evaluate("window.__lastPrompt.includes('Mogu')"))
                await shot('brain')
                # client page tabs
                await pg.evaluate("location.hash='os-c-mogu-mogu'"); await pg.wait_for_timeout(300); await shot('client-twin')
                for tabn in ['Promise Ledger', 'Scope Ledger', 'Account P&L', 'Profile', 'History']:
                    await pg.click(f'.rt-tabs button:has-text("{tabn}")'); await pg.wait_for_timeout(250)
                    if tabn == 'Scope Ledger': await shot('client-scope')
                    if tabn == 'Profile':
                        await pg.click('.rt-sec:nth-of-type(2) button:has-text("Edit")'); await pg.fill('.rt-modal input[type=number]', '325000'); await pg.fill('.rt-modal input[type=date]', '2027-01-20'); await pg.click('.rt-modal-f .primary'); await pg.wait_for_timeout(250)
                await pg.click('.rt-tabs button:has-text("Account P&L")'); await pg.click('button:has-text("Log hours")'); await pg.fill('.rt-modal input[type=number]', '120'); await pg.click('.rt-modal-f .primary'); await pg.wait_for_timeout(300); await shot('client-pl')
                # growth
                await pg.evaluate("location.hash='os-t-lead-tag'"); await pg.wait_for_timeout(300); await pg.fill('.rt-mat', 'Lesser Evil'); await pg.click('.rt-run-l .rt-btn.primary'); await pg.wait_for_timeout(500)
                await pg.click('button:has-text("Add to pipeline")'); await pg.click('.rt-modal-f .primary'); await pg.wait_for_timeout(200)
                await pg.evaluate("location.hash='os-m-growth'"); await pg.wait_for_timeout(300); await shot('growth')
                await pg.evaluate("location.hash='os-tasks'"); await pg.wait_for_timeout(300); await pg.click('.rt-table input[type=checkbox]'); await pg.wait_for_timeout(200); await shot('tasks')
                await pg.evaluate("location.hash='os-pilot'"); await shot('pilot')
                await pg.evaluate("location.hash='os-m-commercial'"); await shot('commercial')
                await pg.evaluate("location.hash='os'"); await shot('home2')
                await pg.fill('.rt-search', 'minutes'); await shot('home-search')
                print('  saved files:', await pg.evaluate('window.__saved'))
                print('  mcp calls:', await pg.evaluate('(window.__calls||[]).map(c=>c[1])'))
                print('  store sizes:', await pg.evaluate('Object.fromEntries(Object.entries(window.__store).map(([k,v])=>[k,Object.keys(v).length]))'))
                # founder view
                await pg.evaluate("location.hash='os-founder'"); await pg.wait_for_timeout(400)
                await pg.click('button:has-text("Enter retainers")'); await pg.fill('.rt-modal textarea', 'Mogu Mogu, 500000, 2027-01-10\nSA Tourism, 120000\nNew Brand Co, 90000\nbad line'); await pg.click('.rt-modal-f .primary'); await pg.wait_for_timeout(300)
                await pg.click('button:has-text("Set allocations")'); await pg.wait_for_timeout(200); await pg.fill('.rt-modal input[type=number] >> nth=0', '60'); await pg.click('.rt-modal-f .primary'); await pg.wait_for_timeout(200); await pg.click('.rt-modal .rt-x'); await pg.wait_for_timeout(300)
                await pg.evaluate("RT.S.c.signals=[{id:'mogu-mogu-2026-W46',client:'mogu-mogu',week:'2026-W46',tone:-1.5,escalation:true,revisionRounds:4,replyHours:30}]")
                await pg.evaluate("location.hash='os-tasks'"); await pg.wait_for_timeout(100); await pg.evaluate("location.hash='os-founder'"); await pg.wait_for_timeout(400)
                await pg.screenshot(path=str(ROOT / 'shots/desk-founder.png'), full_page=False)
                await pg.evaluate("document.querySelector('.rt-main').scrollTop=700"); await pg.wait_for_timeout(200); await pg.screenshot(path=str(ROOT / 'shots/desk-founder2.png'))
                print('  health:', await pg.evaluate("JSON.stringify(RT.health(RT.client('mogu-mogu')))")); print('  founder text:', (await pg.evaluate("document.querySelector('.rt-page').innerText"))[:900].replace('\n',' | '))
                await pg.click('button:has-text("Draft the estimate")'); await pg.wait_for_timeout(500)
                print('  prefill:', await pg.evaluate("[location.hash, document.querySelector('.rt-run-l select').value, document.querySelector('.rt-mat').value.slice(0,60)]"))
                await pg.click('.rt-run-l .rt-btn.primary'); await pg.wait_for_timeout(500)
                print('  estimate flag:', await pg.evaluate("Object.values(window.__store.os_scope).map(s=>s.estimateDrafted||null)"))
                await pg.evaluate("location.hash='os-founder'"); await pg.wait_for_timeout(300); await pg.click('button:has-text("Absorb")'); await pg.fill('.rt-modal textarea', 'Goodwill'); await pg.click('.rt-modal-f .primary'); await pg.wait_for_timeout(300)
                print('  absorbed:', await pg.evaluate("Object.values(window.__store.os_scope).map(s=>[s.status,s.absorbReason])"))
                await pg.evaluate("location.hash='os'"); await pg.wait_for_timeout(300); print('  home needs:', await pg.evaluate("document.querySelector('.rt-needs')?.innerText"))
                # the brief flow underneath
                await pg.evaluate("location.hash='briefs'"); await pg.wait_for_timeout(700); await shot('briefs')
                print('  modules button in brief flow:', await pg.evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent==='All modules')"))
                await pg.click('button:has-text("All modules"):visible'); await pg.wait_for_timeout(300)
                print('  back in os:', await pg.evaluate('location.hash'))
                await pg.evaluate("location.hash='os-t-brief-decode'"); await pg.wait_for_timeout(300); await pg.click('text=Start a new brief'); await pg.wait_for_timeout(900); await shot('newbrief')
            else:
                await pg.evaluate("location.hash='os'"); await shot('home')
                await pg.click('.rt-menu'); await shot('nav'); await pg.click('.rt-menu')
                await pg.evaluate("location.hash='os-t-mom'"); await pg.wait_for_timeout(300)
                await pg.fill('.rt-mat', 'notes'); await pg.select_option('.rt-run-l select', 'mogu-mogu'); await pg.click('.rt-run-l .rt-btn.primary'); await pg.wait_for_timeout(500)
                await pg.screenshot(path=str(ROOT / 'shots/phone-mom.png'), full_page=False)
                await pg.evaluate("document.querySelector('.rt-main').scrollTop=900"); await shot('mom2')
                await pg.evaluate("location.hash='os-clients'"); await shot('clients')
                await pg.evaluate("location.hash='os-m-pitch'"); await shot('module')
            await ctx.close()
        # signed-out: layer must stay hidden; no-capability fallback
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800}); await ctx.add_init_script(MOCK); pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(f'[out] pageerror: {e}'))
        await pg.goto(f'http://127.0.0.1:{PORT}/index.html#os'); await pg.wait_for_timeout(1200)
        print('signed out: hidden', await pg.evaluate("document.getElementById('rtos').hidden"), 'hash', await pg.evaluate('location.hash'))
        await pg.screenshot(path=str(ROOT / 'shots/signedout.png')); await ctx.close()
        await b.close()
    print('ERRORS', len(errs)); [print(' ', e[:300]) for e in errs[:25]]

pathlib.Path(ROOT / 'shots').mkdir(exist_ok=True)
asyncio.run(main())
