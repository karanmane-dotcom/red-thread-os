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

head = '<link rel="stylesheet" href="fonts.css"><link rel="stylesheet" href="os.css">'
patch('<title>Red Thread</title>', '<title>Red Thread</title>' + head)
scripts = ''.join(f'<script src="{f}"></script>' for f in ['os-data.js', 'os-tools.js', 'os-core.js', 'os-ui.js', 'os-pages.js', 'os-founder.js'])
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
for f in ['os-tools.js', 'os-core.js', 'os-ui.js', 'os-pages.js', 'os-founder.js', 'os.css']:
    shutil.copy(R / 'os' / f, D / f)

shutil.rmtree(D / 'lib', ignore_errors=True)
print('built', sorted(p.name for p in D.iterdir()))
print({p.name: p.stat().st_size for p in D.rglob('*') if p.is_file()})
