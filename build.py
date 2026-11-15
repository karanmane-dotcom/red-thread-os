"""Builds dist/ for Red Thread OS: the existing Red Thread page with three small patches,
TSL fonts, and the OS layer as separate readable files."""
import json, re, shutil, pathlib, urllib.request, sys

R = pathlib.Path(__file__).parent
D = R / 'dist'
D.mkdir(parents=True, exist_ok=True)
t = (R / 'src/redthread_live.html').read_text(encoding='utf8')

def patch(old, new):
    global t
    assert t.count(old) == 1, ('patch anchor not unique', old[:60], t.count(old))
    t = t.replace(old, new)

# 1. After sign-in, land on the OS home.
patch('onComplete:m=>Qe.default.startTransition(()=>o(m?"open":r))',
      'onComplete:m=>{m&&window.RTOS&&window.RTOS.enter();Qe.default.startTransition(()=>o(m?"open":r))}')
# 2. A way back to the OS from the brief screens.
patch('M.default.createElement(la,{size:"sm",variant:"ghost",onClick:()=>a({view:"tasks"})},"Tasks")',
      'M.default.createElement(la,{size:"sm",variant:"ghost",onClick:()=>{window.RTOS&&window.RTOS.open()}},"All modules"),M.default.createElement(la,{size:"sm",variant:"ghost",onClick:()=>a({view:"tasks"})},"Tasks")')
# 2b. The same link in the desktop sidebar of the brief screens.
patch('M.default.createElement("button",{className:u(a.view==="home"),onClick:()=>e({view:"home"})},M.default.createElement(_t,{size:16})," Dashboard")',
      'M.default.createElement("button",{className:u(!1),onClick:()=>{window.RTOS&&window.RTOS.open()}},M.default.createElement(io,{size:16})," All modules"),M.default.createElement("button",{className:u(a.view==="home"),onClick:()=>e({view:"home"})},M.default.createElement(_t,{size:16})," Dashboard")')
# 3. Let the OS start a new brief.
patch(',c=Qe.default.useCallback(m=>{Ms(m),e(m),o("revealing")},[])',
      ',__rt=(window.__rt={startBrief:m=>f({client:m,n:Date.now()})}),c=Qe.default.useCallback(m=>{Ms(m),e(m),o("revealing")},[])')

# 4. Homepage: new hero copy, the OS sections mounted in place of the brief-only ones, the orb kept small near the footer.
patch('"Drop in a brief. Get the plan, the gaps and the next move."', '"Run the agency on one thread."')
patch('"The agency\'s operating system for briefs, from the first client email to every team\'s task list."',
      '"Every brief, pitch, estimate, meeting, report and renewal at TSL in one place. It drafts the work, remembers every client and keeps the money in view."')
ORB0 = 'j.default.createElement("section",{className:"mx-auto flex max-w-[1080px] flex-col items-center px-6 pb-16 pt-4"}'
WHAT0 = ',j.default.createElement("section",{className:"mx-auto max-w-[1080px] border-t border-[#f3f2ef]/10 px-6 py-16 sm:px-10"},j.default.createElement("h2",{className:"display text-[26px] sm:text-[32px]"},"What Red Thread does")'
CTA0 = ',j.default.createElement("section",{className:"mx-auto flex max-w-[1080px] flex-col items-start gap-5'
FOOT0 = ',j.default.createElement("footer",{className:"px-5 pb-6 text-[11.5px]'
a, b, c, d = t.index(ORB0), t.index(WHAT0), t.index(CTA0), t.index(FOOT0)
assert a < b < c < d and t.count(ORB0) == 1 and t.count(WHAT0) == 1
orb = t[a:b].replace('style:{height:"min(380px, 42vh)"}', 'style:{height:"min(190px, 24vh)"}').replace('px-6 pb-16 pt-4"', 'px-6 pb-10 pt-10 border-t border-[#f3f2ef]/10"')
cta = t[c:d]
t = t[:a] + 'j.default.createElement("div",{id:"rt-land"})' + cta + ',' + orb + t[d:]
patch('"For the ",Ft.name," team. Sign in with your work email."', '"For everyone at ",Ft.short,". Sign in with your work email."')
patch('"Built for the whole ",Ft.short," team."', '"Built for every desk at ",Ft.short,"."')
patch('"Sign up with your work email. Your department decides which briefs and tasks land on your dashboard."', '"Sign up with your work email. Your department decides what lands on your dashboard."')
patch('"Prototype \\xB7 ",Ft.name', '"Test build \\xB7 ",Ft.name')
head = '<link rel="stylesheet" href="fonts.css"><link rel="stylesheet" href="os.css">'
patch('<title>Red Thread</title>', '<title>Red Thread</title>' + head)
scripts = ''.join(f'<script src="{f}"></script>' for f in ['os-data.js', 'os-tools.js', 'os-core.js', 'os-orb.js', 'os-ui.js', 'os-loom.js', 'os-pages.js', 'os-founder.js', 'os-landing.js'])
i = t.rindex('</body>')
t = t[:i] + scripts + t[i:]
(D / 'index.html').write_text(t, encoding='utf8')

# TSL fonts, taken from the TSL production credentials page.
prod = (R / 'src/tslprod.html').read_text(encoding='utf8')
faces = re.findall(r'@font-face\s*\{[^}]+\}', prod)
assert len(faces) >= 5, len(faces)
(D / 'fonts.css').write_text('\n'.join(faces), encoding='utf8')

roster = json.loads((R / 'src/roster.json').read_text())
logo = json.loads((R / 'src/logo.json').read_text())
(D / 'os-data.js').write_text('window.RT_DATA=' + json.dumps({'roster': roster, 'logo': logo}, separators=(',', ':')) + ';', encoding='utf8')
for f in ['os-tools.js', 'os-core.js', 'os-orb.js', 'os-ui.js', 'os-loom.js', 'os-pages.js', 'os-founder.js', 'os-landing.js', 'os.css']:
    shutil.copy(R / 'os' / f, D / f)

shutil.rmtree(D / 'lib', ignore_errors=True)
print('built', sorted(p.name for p in D.iterdir()))
print({p.name: p.stat().st_size for p in D.rglob('*') if p.is_file()})
