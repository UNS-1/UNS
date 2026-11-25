"""End-to-end check for the simplified settings page (real Chromium). Same usage as mirror_e2e.py."""
import asyncio,os,re,sys
from playwright.async_api import async_playwright
URL=os.environ.get('UNS_URL','http://localhost:8765/index.html'); ok=0
def check(c,m):
    global ok
    if not c: print('FAIL',m); sys.exit(1)
    ok+=1
async def ev(pg,js): return await pg.evaluate(js)
async def fresh(pg,age,lang):
    await pg.goto(URL); await ev(pg,"localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(250)
    await ev(pg,f"ST.ab='{age}';ST.lang='{lang}';go('settings')"); await pg.wait_for_timeout(60)
async def layout(pg,T):
    w=await ev(pg,"[document.documentElement.scrollWidth,innerWidth]"); check(w[0]<=w[1]+1,f'{T} overflow {w}')
    bad=await ev(pg,"[...document.querySelectorAll('#app button')].filter(b=>b.getBoundingClientRect().height>0&&(b.getBoundingClientRect().height<44||b.getBoundingClientRect().width<44)).map(b=>b.textContent.trim().slice(0,10))"); check(not bad,f'{T} small targets {bad}')
async def main():
    async with async_playwright() as p:
        kw={'args':['--no-sandbox']}
        if os.environ.get('PW_CHROME'): kw['executable_path']=os.environ['PW_CHROME']
        b=await p.chromium.launch(**kw)
        for (W,H,tag) in [(390,844,'mobile'),(1100,800,'desktop')]:
            pg=await b.new_page(viewport={'width':W,'height':H}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
            for age in ['7-8','9-10','11-12']:
                for lang in ['ar','en']:
                    T=f'{tag}/{age}/{lang}'; await fresh(pg,age,lang)
                    check(await pg.locator('.set-sec').count()==7,T+' seven simple sections'); check(await pg.locator('.set .chips').first.locator('button').count()==3,T+' the first chips row is the three age groups')
                    check(await pg.locator('.set-av').count()==6 and await pg.locator('.set-th').count()==5 and await pg.locator('.set-card').count()==4 and await pg.locator('.set-sw').count()==3,T+' avatars, worlds, talk styles, switches')
                    await layout(pg,T+' start')
                    ages=await ev(pg,"[...document.querySelectorAll('.set .chips')[0].querySelectorAll('button')].map(b=>b.innerText)"); want='مغامرة' if lang=='ar' else 'Adventure'
                    check(want in ages[1] and not any(('استكشاف' in x or 'Exploration' in x) for x in ages),T+f' the 9 to 10 group is called {want}')
                    # avatar + name
                    await pg.locator('.set-av').nth(2).click(); check(await ev(pg,"ST.av")=='🐰',T+' avatar'); await pg.fill('#nk','Sara'); check(await ev(pg,"ST.nick")=='Sara',T+' nickname')
                    # world (theme)
                    await pg.locator('.set-th').nth(2).click(); check(await ev(pg,"ST.theme")=='sea' and await ev(pg,"document.documentElement.getAttribute('data-th')")=='sea',T+' world changes the whole page'); check(await pg.locator('.set-th.on').count()==1,T+' selected world marked')
                    # talk style
                    await pg.locator('.set-card').nth(1).click(); check(await ev(pg,"ST.cm")=='aud',T+' talk style')
                    # switches
                    await pg.locator('.set-sw').nth(1).click(); check(await ev(pg,"ST.rm")==True and await ev(pg,"document.body.classList.contains('rm')"),T+' reduce motion switch'); check(await pg.locator('.set-sw').nth(1).get_attribute('aria-checked')=='true',T+' switch state announced')
                    await pg.locator('.set-sw').nth(2).click(); check(await ev(pg,"ST.maud")==True,T+' sound switch'); await pg.locator('.set-sw').nth(2).click(); check(await ev(pg,"ST.maud")==False,T+' sound off')
                    # age
                    await pg.locator('.set .chips').first.locator('button').nth(0).click(); check(await ev(pg,"ST.ab")=='7-8' and await ev(pg,"document.documentElement.getAttribute('data-age')")=='7-8',T+' age changes the world')
                    # games: simple choices; advanced levels + confirmed reset
                    await pg.locator('.set-sec >> nth=4 >> .chips >> nth=0 >> button >> nth=1').click(); check(await ev(pg,"PS.p.settings.challenge")=='keep',T+' keep my levels')
                    await pg.locator('.set-sec >> nth=4 >> .chips >> nth=1 >> button >> nth=1').click(); check(await ev(pg,"PS.p.settings.hints")==True,T+' hints on')
                    check(await pg.locator('details.set-ad').count()==2,T+' advanced and account are folded away'); check(await pg.locator('details.set-ad').first.get_attribute('open') is None,T+' advanced closed by default')
                    await pg.locator('details.set-ad >> nth=0 >> summary').click(); await layout(pg,T+' advanced open'); check(await pg.locator('details.set-ad >> nth=0 >> .card').count()==4,T+' four game levels inside advanced')
                    await pg.locator('details.set-ad >> nth=0 >> button >> nth=-1').click(); check(await ev(pg,"PS.confirm")==1 and await pg.locator('details.set-ad').first.get_attribute('open') is not None,T+' reset asks first and stays open'); await pg.locator('details.set-ad >> nth=0 >> button >> nth=-1').click(); check(await ev(pg,"PS.confirm")==0,T+' confirmed reset')
                    check('device' in await ev(pg,"document.querySelector('details.set-ad:last-of-type').textContent") or 'الجهاز' in await ev(pg,"document.querySelector('details.set-ad:last-of-type').textContent"),T+' account note about local saving')
                    await layout(pg,T+' end')
                    txt=await ev(pg,"document.querySelector('#app').innerText"); bad=re.findall(r'\b[a-z]{1,4}_[a-z0-9_]+\b|undefined',txt); check(not bad,T+f' raw keys {bad}')
                    check(not errs,T+f' errors {errs}')
            # the language switch flips the page and the direction
            await fresh(pg,'9-10','ar'); await pg.locator('.set-sw').nth(0).click(); check(await ev(pg,"ST.lang")=='en' and await ev(pg,"document.documentElement.dir")=='ltr','language switch')
            # home still greets with the chosen avatar and name
            await fresh(pg,'9-10','en'); await pg.locator('.set-av').nth(3).click(); await pg.fill('#nk','Omar'); await pg.click('.set .pri'); check(await ev(pg,"ST.view")=='home' and 'Omar' in await ev(pg,"document.querySelector('#app h1').innerText") and '🐼' in await ev(pg,"document.querySelector('#app h1').innerText"),'home greets with the chosen avatar and name')
            # keyboard
            await fresh(pg,'9-10','en'); await pg.focus('.set-th >> nth=1'); await pg.keyboard.press('Enter'); check(await ev(pg,"ST.theme")=='gar','keyboard picks a world')
            await pg.close()
            pg=await b.new_page(viewport={'width':W,'height':H},reduced_motion='reduce'); await fresh(pg,'9-10','en'); check(await pg.locator('.set').count()==1,'renders with reduced motion'); await pg.close()
        await b.close()
    print('ALL SETTINGS E2E CHECKS PASSED:',ok)
asyncio.run(main())
