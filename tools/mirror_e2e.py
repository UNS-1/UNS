"""End-to-end check for My Emotional Mirror (real Chromium via Playwright).
Run:  python3 -m http.server 8765  (inside the site folder), then  python3 tools/mirror_e2e.py
Env: PW_CHROME=/path/to/chrome (optional)."""
import asyncio,os,re,sys,json
from playwright.async_api import async_playwright
URL=os.environ.get('UNS_URL','http://localhost:8765/index.html')
EMO=['happy','sad','angry','scared','worried','calm','lonely','tired','confused','excited','pain']
ok=0
def check(c,m):
    global ok
    if not c: print('FAIL',m); sys.exit(1)
    ok+=1
async def ev(pg,js): return await pg.evaluate(js)
async def fresh(pg,age,lang):
    await pg.goto(URL); await pg.wait_for_timeout(250)
    await ev(pg,f"ST.ab='{age}';ST.lang='{lang}';ST.av='🦊';go('feel')"); await pg.wait_for_timeout(80)
async def body_text(pg): return await ev(pg,"document.querySelector('#app').innerText")
async def no_overflow(pg,tag):
    w=await ev(pg,"[document.documentElement.scrollWidth,innerWidth]"); check(w[0]<=w[1]+1,f'{tag}: horizontal overflow {w}')
async def small_targets(pg,tag):
    bad=await ev(pg,"[...document.querySelectorAll('#app button')].filter(b=>b.offsetParent&&(b.getBoundingClientRect().height<44||b.getBoundingClientRect().width<44)).map(b=>b.textContent.trim().slice(0,12))")
    check(not bad,f'{tag}: touch targets < 44px: {bad}')
async def main():
    async with async_playwright() as p:
        kw={'args':['--no-sandbox']}
        if os.environ.get('PW_CHROME'): kw['executable_path']=os.environ['PW_CHROME']
        b=await p.chromium.launch(**kw)
        for (W,H,tag) in [(390,844,'mobile'),(1100,800,'desktop')]:
            pg=await b.new_page(viewport={'width':W,'height':H}); errs=[]
            pg.on('pageerror',lambda e:errs.append(str(e)))
            for age in ['7-8','9-10','11-12']:
                for lang in ['ar','en']:
                    T=f'{tag}/{age}/{lang}'
                    await fresh(pg,age,lang)
                    check(await ev(pg,"document.documentElement.dir")==('rtl' if lang=='ar' else 'ltr'),T+' dir')
                    check(await pg.locator('.mm-card').count()==12,T+' 11 emotions + dont-know')
                    check(await pg.locator('.mm-mirror svg').count()==1,T+' mirror present')
                    # every emotion changes the mirror and respects the age cap
                    seen=set(); cap={'7-8':2,'9-10':3,'11-12':4}[age]
                    for e in EMO:
                        await pg.click(f'[data-mk="e:{e}"]'); h=await ev(pg,"document.querySelector('.mm-mirror svg').innerHTML"); seen.add(h)
                        check(await ev(pg,f"ST.f[ST.f.length-1]")==e,T+' last pick '+e)
                        check(await ev(pg,"ST.f.length")<=cap,T+' cap')
                    check(len(seen)==11,T+f' mirror differs per emotion ({len(seen)})')
                    await pg.click('[data-mk="e:pain"]')  # deselect last
                    check(await ev(pg,"ST.f.includes('pain')")==False,T+' toggle off')
                    await no_overflow(pg,T+' s0'); await small_targets(pg,T+' s0')
                    txt=await body_text(pg); check(not re.search(r'\bmm_[a-z0-9_]+\b',txt),T+' raw key shown')
                    # step 1 causes (optional)
                    await pg.click('.mm-act .pri'); check(await ev(pg,"ST.step")==1,T+' to causes')
                    n=await pg.locator('.mm-card').count(); check(n=={'7-8':6,'9-10':8,'11-12':9}[age],T+f' causes count {n}')
                    await pg.click('[data-mk="c:body"]'); check(await ev(pg,"ST.mc.includes('body')"),T+' cause toggled')
                    check((await pg.locator('textarea').count())==(0 if age=='7-8' else 1),T+' text box by age')
                    await no_overflow(pg,T+' s1'); await small_targets(pg,T+' s1')
                    await pg.click('.mm-act .pri'); check(await ev(pg,"ST.step")==2,T+' to supports')
                    n=await pg.locator('.mm-card').count(); check(n=={'7-8':9,'9-10':12,'11-12':12}[age],T+f' supports count {n}')
                    for k in ['teddy','hug','draw','music','quiet','talk','fam','nurse','pet']:
                        check(await pg.locator(f'[data-mk="w:{k}"]').count()==1,T+' support '+k)
                    await pg.click('[data-mk="w:teddy"]'); await pg.click('[data-mk="w:fam"]')
                    check(await pg.locator('.mm-mirror .mm-comp').count()==2,T+' support appears in mirror')
                    await no_overflow(pg,T+' s2'); await small_targets(pg,T+' s2')
                    await pg.click('.mm-act .pri'); check(await ev(pg,"ST.step")==3,T+' to share')
                    check(await pg.locator('.mm-act .pri').is_disabled(),T+' send disabled until a choice')
                    await no_overflow(pg,T+' s3'); await small_targets(pg,T+' s3')
                    n0=await ev(pg,"D.reports.length")
                    await pg.click('[data-mk="s:p"]'); await pg.click('.mm-act .pri')
                    check(await ev(pg,"D.reports.length")==n0,T+' private saves nothing'); check(await ev(pg,"ST.step")==4,T+' done')
                    await no_overflow(pg,T+' s4'); await small_targets(pg,T+' s4')
                    txt=await body_text(pg); check(not re.search(r'\bmm_[a-z0-9_]+\b',txt),T+' raw key done')
                    check(not errs,T+f' page errors {errs}')
            # full sharing path, nurse + care, nurse dashboard, care area (age 9-10, ar)
            await fresh(pg,'9-10','ar')
            await ev(pg,"D.fam=[{id:1,name:'سلمى',rel:'mom',loves:[]},{id:2,name:'',rel:'dad',loves:[]}];D.pid=3;R()")
            await pg.click('[data-mk="e:pain"]'); await pg.click('[data-mk="e:sad"]'); await pg.click('.mm-act .pri')
            await pg.click('[data-mk="c:test"]'); await pg.click('summary'); await pg.fill('textarea','كلمات خاصة'); await pg.click('.mm-act .pri')
            await pg.click('[data-mk="w:fam"]'); await pg.click('[data-mk="w:nurse"]')
            check(await pg.locator('.mm-who button').count()==2,'people from My People shown'); await pg.click('[data-mk="p:1"]')
            await pg.click('.mm-act .pri'); await pg.click('[data-mk="s:n"]'); await pg.click('[data-mk="s:c"]'); await pg.click('.mm-act .pri')
            r=await ev(pg,"D.reports[D.reports.length-1]")
            check(r['k']=='feel' and r['v']==['pain','sad'] and r['c']==['test'] and r['w']==['fam','nurse'] and r['rl']==['mom'] and r['sh']=='nc' and r['txt']=='كلمات خاصة','report content '+json.dumps(r,ensure_ascii=False))
            check(await pg.locator('.mm-note').count()>=1,'sent status shown')
            check(await ev(pg,"flagged(D.reports[D.reports.length-1])"),'pain is flagged for the nurse')
            # done page: health link + safety + try-now
            check(await pg.locator('.mm-link').count()>=1,'My Health shortcut when pain/body')
            for k in ['fam','nurse']:
                check(await pg.locator(f'[data-mk="t:{k}"]').count()==1,'try card '+k)
            await pg.click('[data-mk="t:fam"]'); check(await ev(pg,"ST.view")=='people','family card opens My People')
            await ev(pg,"go('nurse')"); await ev(pg,"ST.nok=1;ST.nt=1;R()")
            nt=await body_text(pg); check('سلمى' not in nt and 'أمي' in nt,'nurse sees relation only'); check('كلمات خاصة' in nt,'nurse sees text'); check(await pg.locator('.mm-mini svg').count()>=2,'nurse sees faces')
            await ev(pg,"ST.cok=1;D.cons.f=1;go('care');ST.ct='set';R()");
            ct=await body_text(pg); check('كلمات خاصة' not in ct and 'test' not in ct,'care does not see text/causes'); check(await pg.locator('.mm-care .mm-mini').count()>=1,'care sees faces with consent')
            await ev(pg,"D.cons.f=0;R()"); check(await pg.locator('.mm-care').count()==0,'care sees nothing without consent')
            # nurse-only report is hidden from care; care-only hidden from nurse
            await fresh(pg,'9-10','en'); await pg.click('[data-mk="e:calm"]'); await pg.click('.mm-act .pri'); await pg.click('.mm-act button:nth-child(2)'); await pg.click('.mm-act button:nth-child(2)')
            await pg.click('[data-mk="s:c"]'); await pg.click('.mm-act .pri')
            check(await ev(pg,"D.reports[D.reports.length-1].sh")=='c','care-only report'); check(await ev(pg,"nurseSees(D.reports[D.reports.length-1])")==False,'nurse does not see care-only')
            # private pain gets a gentle nudge to tell the nurse
            await fresh(pg,'9-10','en'); await pg.click('[data-mk="e:pain"]'); await pg.click('.mm-act .pri'); await pg.click('.mm-act button:nth-child(2)'); await pg.click('.mm-act button:nth-child(2)'); await pg.click('.mm-act button:nth-child(2)')
            check(await ev(pg,"ST.step")==4,'skip path ends at done'); check(await pg.locator('.mm-link',has_text='nurse').count()==1,'nudge to tell nurse')
            n0=await ev(pg,"D.reports.length"); await pg.click('.mm-link >> text=nurse'); check(await ev(pg,"D.reports.length")==n0+1,'nudge shares with nurse on demand')
            # not today
            await fresh(pg,'7-8','ar'); n0=await ev(pg,"D.reports.length"); await pg.click('.mm-act button:not(.pri)'); check(await ev(pg,"ST.step")==4 and await ev(pg,"D.reports.length")==n0,'not today saves nothing')
            # try-now actions
            await pg.click('[data-mk="t:breathe"]'); check(await pg.locator('.mm-do').count()==1,'do breathe')
            check(await pg.locator('.mm-bc').count()==1,'breathing guide')
            await pg.screenshot(path=f'/tmp/mm_done_{tag}.png')
            await pg.click('.mm-do button'); check(await pg.locator('.mm-do').count()==0,'finish exercise')
            # every support card does something
            for k,v in {'draw':'draw','story':'story','play':'happy','quiet':'album','talk':'people','fam':'people','hug':'people','pet':'pets','teddy':'pets'}.items():
                await fresh(pg,'9-10','en'); await ev(pg,"ST.f=['calm'];ST.w=['%s'];ST.step=4;R()"%k); await pg.click(f'[data-mk="t:{k}"]'); check(await ev(pg,"ST.view")==v,'support '+k+' navigates')
            await fresh(pg,'9-10','en'); await ev(pg,"ST.f=['calm'];ST.w=['music'];ST.step=4;R()"); await pg.click('[data-mk="t:music"]'); check(await pg.locator('.mm-do').count()==1 and await pg.locator('.mm-mirror .mm-heart').count()>0,'music reacts inside the mirror')
            check(not errs,tag+f' page errors {errs}')
            # reduced motion: the in-app toggle and the OS setting
            await fresh(pg,'7-8','en'); await pg.click('#rm'); check(await ev(pg,"getComputedStyle(document.querySelector('.mm-face')).animationName")=='none','in-app reduce motion stops animation')
            await pg.close()
            pg=await b.new_page(viewport={'width':W,'height':H},reduced_motion='reduce'); await fresh(pg,'7-8','en')
            check(await ev(pg,"getComputedStyle(document.querySelector('.mm-face')).animationName")=='none','OS reduced-motion stops animation'); await pg.close()
            # keyboard
            pg=await b.new_page(viewport={'width':W,'height':H}); await fresh(pg,'9-10','en')
            await pg.focus('[data-mk="e:sad"]'); await pg.keyboard.press('Enter'); check(await ev(pg,"ST.f")==['sad'],'keyboard select'); check(await ev(pg,"document.activeElement.dataset.mk")=='e:sad','focus kept after selecting')
            await pg.close()
        await b.close()
    print('ALL MIRROR E2E CHECKS PASSED:',ok)
asyncio.run(main())
