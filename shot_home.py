import asyncio, http.server, threading, functools, pathlib
from playwright.async_api import async_playwright
R = pathlib.Path(__file__).parent
h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(R/'dist')); h.log_message=lambda *a,**k:None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8766), h); threading.Thread(target=srv.serve_forever, daemon=True).start()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        errs=[]
        for name, vp in [('desk', {'width':1440,'height':900}), ('phone', {'width':390,'height':844})]:
            pg = await (await b.new_context(viewport=vp)).new_page()
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('http://127.0.0.1:8766/index.html'); await pg.wait_for_timeout(2500)
            sc = "(()=>{const el=document.getElementById('rt-land');let p=el;while(p&&!(getComputedStyle(p).overflowY==='auto'))p=p.parentElement;return p})()"
            print(name, 'mounted', await pg.evaluate("!!document.querySelector('#rt-land.rtl .rtl-stop')"))
            for k, frac in enumerate([0, .22, .38, .55, .75, 1.0]):
                await pg.evaluate(f"(()=>{{const s={sc};s.scrollTop=(s.scrollHeight-s.clientHeight)*{frac}}})()"); await pg.wait_for_timeout(500)
                await pg.screenshot(path=str(R/f'shots/home-{name}-{k}.png'))
            print(name, 'lit stops', await pg.evaluate("document.querySelectorAll('.rtl-stop.on').length"), 'overflow', await pg.evaluate(f"(()=>{{const s={sc};return s.scrollWidth-s.clientWidth}})()"))
        print('errors', errs)
        await b.close()
asyncio.run(main())
