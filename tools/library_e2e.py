"""End-to-end check for the library's videos and listen button (real Chromium). Run from the site folder (needs video/ present).
For the audio part the test creates a tiny temporary audio/skin-ar.mp3 and removes it afterwards."""
import asyncio,os,re,sys,subprocess
from playwright.async_api import async_playwright
URL=os.environ.get('UNS_URL','http://localhost:8765/index.html'); ok=0
def check(c,m):
    global ok
    if not c: print('FAIL',m); cleanup(); sys.exit(1)
    ok+=1
def cleanup():
    for f in ['audio/skin-ar.mp3']:
        try: os.remove(f)
        except OSError: pass
async def ev(pg,js): return await pg.evaluate(js)
async def open_art(pg,age,lang,a):
    await ev(pg,f"ST.ab='{age}';ST.lang='{lang}';go('acad');libOpen('{a}')"); await pg.wait_for_timeout(120)
async def main():
    ids=['skin','bones','blood','lungs','brain','tummy','kidney','team','xray','drip','pain','wash','when','cough','prevent','plate','water','sugar','sleep','move']
    check(all(os.path.exists(f'video/{i}-{l}.mp4') for i in ids for l in ('ar','en')),'all 40 videos present')
    async with async_playwright() as p:
        kw={'args':['--no-sandbox']}
        if os.environ.get('PW_CHROME'): kw['executable_path']=os.environ['PW_CHROME']
        b=await p.chromium.launch(**kw)
        for (W,H,tag) in [(390,844,'mobile'),(1100,800,'desktop')]:
            pg=await b.new_page(viewport={'width':W,'height':H}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m:errs.append(m.text) if m.type=='error' and 'Failed to load resource' not in m.text else None)
            await pg.goto(URL); await pg.wait_for_timeout(250)
            for lang in ['ar','en']:
                for a in ids:
                    T=f'{tag}/{lang}/{a}'; await open_art(pg,'9-10',lang,a)
                    check(await pg.locator('video').count()==1,T+' one video'); src=await pg.locator('video').get_attribute('src'); check(src==f'video/{a}-{lang}.mp4',T+f' right file for the language {src}')
                    check(await pg.locator('video').get_attribute('controls') is not None and len(await pg.locator('video').get_attribute('aria-label'))>2,T+' controls and a name')
                    if a in ('skin','pain','wash','xray'):
                        await pg.wait_for_function("document.querySelector('video').readyState>=1",timeout=8000); d=await ev(pg,"document.querySelector('video').duration"); check(10<d<40,T+f' video loads under the page policy ({d:.1f}s)')
                    w=await ev(pg,"[document.documentElement.scrollWidth,innerWidth]"); check(w[0]<=w[1]+1,T+f' overflow {w}')
                    txt=await ev(pg,"document.querySelector('#app').innerText"); check(not re.search(r'undefined|NaN|\bt_\w+',txt),T+' text ok')
                check(await pg.locator('#app details').count()>=1,f'{tag}/{lang} facts folded for parents')
            await open_art(pg,'9-10','en','wash'); check(await pg.locator('#app .grid .card').count()==5,'handwashing still has five steps'); check('20' in await ev(pg,"document.querySelector('#app').innerText"),'20 seconds shown')
            check(not [e for e in errs if 'Content Security' in e or 'Refused' in e],tag+f' no policy errors {errs}'); check(not errs,tag+f' errors {errs}')
            # a missing video hides itself instead of leaving a broken player
            await pg.route('**/video/skin-ar.mp4',lambda r:r.abort()); await open_art(pg,'9-10','ar','skin'); await pg.wait_for_timeout(500); check(await ev(pg,"document.querySelector('.lvid').style.display")=='none',tag+' a missing video disappears'); await pg.unroute('**/video/skin-ar.mp4')
            # listen button: absent without an audio file, appears by itself when the file exists
            await open_art(pg,'9-10','ar','skin'); await pg.wait_for_timeout(500); check(await pg.locator('button:has-text("🔊")').count()==0,tag+' no listen button without audio')
            subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','sine=frequency=440:duration=3','-q:a','9','audio/skin-ar.mp3'],check=True)
            await ev(pg,"delete LAU['audio/skin-ar.mp3']"); await open_art(pg,'9-10','ar','skin'); await pg.wait_for_selector('button:has-text("🔊")',timeout=5000); check(True,tag+' the listen button appears when the file exists')
            check(await ev(pg,"libProbe.toString().includes('HEAD')"),'probe is real')
            await pg.click('button:has-text("🔊")'); await pg.wait_for_timeout(300); check(await ev(pg,"!!window._la&&ST.lau===1"),tag+' playing'); check(await pg.locator('button:has-text("⏹️")').count()==1,tag+' stop button shown')
            await pg.click('button:has-text("⏹️")'); check(await ev(pg,"window._la===null&&ST.lau===0"),tag+' stopped by button')
            await pg.click('button:has-text("🔊")'); await pg.wait_for_timeout(200); await ev(pg,"libOpen('bones')"); check(await ev(pg,"window._la===null&&ST.lau===0"),tag+' stops when another article opens')
            await open_art(pg,'9-10','ar','skin'); await pg.click('button:has-text("🔊")'); await pg.wait_for_timeout(200); await ev(pg,"go('home')"); check(await ev(pg,"window._la===null&&ST.lau===0"),tag+' stops when leaving the library')
            await open_art(pg,'9-10','ar','skin'); await pg.click('button:has-text("🔊")'); await pg.wait_for_timeout(200); await ev(pg,"L()"); check(await ev(pg,"window._la===null&&ST.lau===0"),tag+' stops when the language changes'); await pg.wait_for_timeout(500); check(await pg.locator('button:has-text("🔊")').count()==0,tag+' no button for the language without audio')
            await pg.close(); cleanup()
        await b.close()
    print('ALL LIBRARY MEDIA E2E CHECKS PASSED:',ok)
asyncio.run(main())
