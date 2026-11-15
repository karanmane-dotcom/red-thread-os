import asyncio, http.server, threading, functools, pathlib, json
from playwright.async_api import async_playwright
R = pathlib.Path(__file__).parent
h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(R/'dist')); h.log_message=lambda *a,**k:None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8767), h); threading.Thread(target=srv.serve_forever, daemon=True).start()
MOCK = open(R/'test.py').read().split('MOCK = r"""')[1].split('"""')[0]
SEED = """(()=>{const S=window.RT.S,t=new Date(),d=(n)=>new Date(+t+n*864e5).toISOString().slice(0,10);
S.c.profiles=[{id:'mogu-mogu',name:'Mogu Mogu',retainer:500000,contractEnd:d(50)},{id:'sa-tourism',name:'SA Tourism',retainer:300000,contractEnd:d(120)},{id:'bhor',name:'Bhor',retainer:250000},{id:'spunge',name:'Spunge',retainer:180000}];
S.c.promises=[{id:'p1',client:'mogu-mogu',promise:'Revised Diwali deck',due:d(-3),owner:'Karan',status:'open'},{id:'p2',client:'sa-tourism',promise:'ETA factsheet v3',due:d(4),status:'open'},{id:'p3',client:'bhor',promise:'Booth videos',due:d(20),status:'open'},{id:'p4',client:'spunge',promise:'OND deck',due:d(-10),status:'kept'},{id:'p5',client:'bhor',promise:'Kiosk build',due:d(35),status:'open'}];
S.c.scope=[{id:'s1',client:'sa-tourism',ask:'Hindi translation',value:3000,status:'logged',inScope:'no',at:d(-9)},{id:'s2',client:'mogu-mogu',ask:'Extra reel',status:'logged',inScope:'unclear',at:d(-2)}];
S.c.tasks=[{id:'t1',client:'bhor',title:'Render aerospace film',due:d(6),done:false},{id:'t2',client:'mogu-mogu',title:'Share scripts',due:d(-1),done:false},{id:'t3',client:'spunge',title:'Captions',due:d(12),done:false}];
S.c.signals=[{id:'x',client:'mogu-mogu',week:'2026-W46',tone:-1.5,escalation:true}];
RT.render();})()"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        errs=[]
        for name, vp in [('desk', {'width':1440,'height':900}), ('phone', {'width':390,'height':844})]:
            ctx = await b.new_context(viewport=vp); await ctx.add_init_script(MOCK)
            await ctx.add_init_script("localStorage.setItem('redthread.session.v1', JSON.stringify({email:'k@t.com',name:'Karan Mane',department:'Account Management',designation:'Manager'}))")
            pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('http://127.0.0.1:8767/index.html#os'); await pg.wait_for_timeout(1500)
            await pg.evaluate(SEED); await pg.wait_for_timeout(700)
            await pg.screenshot(path=str(R/f'shots/v-{name}-home.png'))
            await pg.evaluate("document.querySelector('.rt-main').scrollTop=document.querySelector('.rt-loom').offsetTop-20"); await pg.wait_for_timeout(400)
            await pg.screenshot(path=str(R/f'shots/v-{name}-loom.png'))
            await pg.dispatch_event('.rt-loom-svg .k.late', 'mouseenter'); await pg.wait_for_timeout(300); await pg.screenshot(path=str(R/f'shots/v-{name}-tip.png'))
            for r in ['os-m-commercial','os-t-mom','os-c-mogu-mogu','os-founder','os-tasks']:
                await pg.evaluate(f"location.hash='{r}'"); await pg.wait_for_timeout(500); await pg.screenshot(path=str(R/f'shots/v-{name}-{r}.png'))
            await pg.evaluate("location.hash='os'"); await pg.wait_for_timeout(300)
            await pg.click('.rt-menu'); await pg.wait_for_timeout(400); await pg.screenshot(path=str(R/f'shots/v-{name}-index.png')); await pg.keyboard.press('Escape')
            await pg.keyboard.press('Control+k'); await pg.wait_for_timeout(200); await pg.keyboard.type('send the mogu cost estimate'); await pg.wait_for_timeout(300); await pg.screenshot(path=str(R/f'shots/v-{name}-pal.png'))
            await pg.evaluate("document.getElementById('rtos').setAttribute('data-tone','light')"); await pg.keyboard.press('Escape'); await pg.evaluate("location.hash='os-t-mom'"); await pg.wait_for_timeout(400); await pg.screenshot(path=str(R/f'shots/v-{name}-light.png'))
            await ctx.close()
        print('errors', errs); await b.close()
asyncio.run(main())
