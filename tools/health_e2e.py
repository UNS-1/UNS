"""End-to-end check for My Health (real Chromium). Same usage as mirror_e2e.py."""
import asyncio,os,re,sys
from playwright.async_api import async_playwright
URL=os.environ.get('UNS_URL','http://localhost:8765/index.html'); ok=0
def check(c,m):
    global ok
    if not c: print('FAIL',m); sys.exit(1)
    ok+=1
async def ev(pg,js): return await pg.evaluate(js)
async def fresh(pg,age,lang):
    await pg.goto(URL); await pg.wait_for_timeout(250)
    await ev(pg,f"ST.ab='{age}';ST.lang='{lang}';go('health')"); await pg.wait_for_timeout(60)
async def txt(pg): return await ev(pg,"document.querySelector('#app').innerText")
async def layout(pg,T):
    w=await ev(pg,"[document.documentElement.scrollWidth,innerWidth]"); check(w[0]<=w[1]+1,f'{T} overflow {w}')
    bad=await ev(pg,"[...document.querySelectorAll('#app button')].filter(b=>b.offsetParent&&(b.getBoundingClientRect().height<44||b.getBoundingClientRect().width<44)).map(b=>b.textContent.trim().slice(0,10))"); check(not bad,f'{T} small targets {bad}')
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
                    check(await pg.locator('.hl-card').count()==7,T+' seven places'); check('⚠️' in await txt(pg) and await pg.locator('.card.c3').count()>=1,T+' safety box on step 0')
                    check(await pg.locator('.mm-dots i').count()==6,T+' progress'); await layout(pg,T+' s0')
                    await pg.click('.hl-card >> nth=2'); check(await ev(pg,"ST.a")==['stomach'],T+' choose stomach'); check(await pg.locator('.hl-card.on').count()==1,T+' selected state')
                    await pg.click('.hl-card >> nth=3'); check(await ev(pg,"ST.a")==['stomach','back'],T+' multi-select')
                    await pg.click('.hl-bar .pri'); check(await ev(pg,"ST.step")==1 and await pg.locator('#bmsvg').count()==1,T+' body map step'); check(await pg.locator('.card.c3').count()>=1,T+' safety box on the map step'); await layout(pg,T+' s1')
                    # draw a dot and a line
                    bb=await pg.locator('#bmsvg').bounding_box(); await pg.locator('#bmsvg').click(position={'x':bb['width']*.5,'y':bb['height']*.45})
                    check(await ev(pg,"ST.bm.front.length")==1,T+' dot drawn')
                    await pg.click('text='+('Skip drawing' if lang=='en' else 'تخطَّ الرسم')); check(await ev(pg,"ST.step")==2,T+' skip drawing')
                    check(await pg.locator('.faces button').count()==6,T+' six faces'); check(('Point to the face' in await txt(pg)) or ('أشر إلى الوجه' in await txt(pg)),T+' pain wording unchanged'); await layout(pg,T+' s2')
                    r=await ev(pg,"[...document.querySelectorAll('.faces button')].map(b=>b.getBoundingClientRect().left)"); check(len(set(round(x) for x in r))==6,T+' faces in one row')
                    nums=await ev(pg,"[...document.querySelectorAll('.faces .hl-num')].map(e=>e.textContent)"); check(nums==['0','2','4','6','8','10'],T+f' numbers under faces {nums}')
                    check(await ev(pg,"new Set([...document.querySelectorAll('.faces svg')].map(s=>s.innerHTML)).size")==6,T+' six distinct faces')
                    check(await ev(pg,"(()=>{const b=document.querySelectorAll('.faces button');return b[0].getBoundingClientRect().left<b[5].getBoundingClientRect().left})()"),T+' scale runs 0 to 10 left to right')
                    check(await pg.locator('.hl-pick').count()==0,T+' no preview before choosing')
                    await pg.click('.faces button >> nth=2'); check(await ev(pg,"ST.pain")==4,T+' pain 4'); check('4' in await pg.locator('.hl-pick').inner_text(),T+' big preview of the choice'); await pg.click('.hl-bar .pri')
                    check(await ev(pg,"ST.step")==3 and await pg.locator('.hl-card').count()==6,T+' pain types'); await pg.click('.hl-card >> nth=2'); check(await ev(pg,"ST.q")=='ache',T+' type chosen'); await layout(pg,T+' s3')
                    await pg.click('.hl-bar button:not(.pri)'); check(await ev(pg,"ST.step")==4 and await pg.locator('.hl-card').count()==7,T+' skip to symptoms')
                    await pg.click('.hl-card >> nth=0'); await pg.click('.hl-bar .pri'); check(await ev(pg,"ST.step")==5,T+' wishes'); await pg.click('.hl-card >> nth=0'); await pg.click('.hl-card >> nth=3')
                    check(await pg.locator('.hl-sum').count()==1,T+' summary shown'); await layout(pg,T+' s5')
                    n0=await ev(pg,"D.reports.length"); await pg.click('.hl-bar .pri')
                    r=await ev(pg,"D.reports[D.reports.length-1]"); check(await ev(pg,"D.reports.length")==n0+1 and r['k']=='sym' and r['a']==['stomach','back'] and r['pain']==4 and r['q']=='ache' and r['s']==['nausea'] and r['h']==['nurse','rest'] and r['bm'] and len(r['bm']['front'])==1,T+' report content')
                    check(await ev(pg,"ST.step")==6,T+' thanks step'); check('⚠️' in await txt(pg),T+' safety on the last step'); check(await pg.locator('.hl-sum').count()==1,T+' summary on thanks'); await layout(pg,T+' s6')
                    bad=re.findall(r'\b[a-z]{1,4}_[a-z0-9_]+\b|undefined',await txt(pg)); check(not bad,T+f' raw keys {bad}')
                    check(not errs,T+f' errors {errs}')
            # the body figure: valid SVG, a different figure per age, highlights only for zones on that side, unique gradient ids, marks still drawn
            r=await ev(pg,"""(()=>{const out={ok:true,heads:new Set(),ids:0};for(const a of ['7-8','9-10','11-12'])for(const v of ['front','back']){const s=bodySvg(a,v,[],{label:'x',areas:['head','chest','stomach','back','arms','legs']});if(new DOMParser().parseFromString(s,'image/svg+xml').querySelector('parsererror'))out.ok=false;if(v==='front')out.heads.add(s.replace(/bmg\\d+/g,''))}
              const f=bodySvg('9-10','front',[],{areas:['back','chest']}),b=bodySvg('9-10','back',[],{areas:['back','chest']});out.dash=[(f.match(/stroke-dasharray/g)||[]).length,(b.match(/stroke-dasharray/g)||[]).length];
              out.same=bodySvg('9-10','front',[],{})!==bodySvg('9-10','front',[],{});out.heads=out.heads.size;out.noDash=(bodySvg('9-10','front',[],{}).match(/stroke-dasharray/g)||[]).length;out.dot=strokesSvg([[[500,500]]],FIGP['9-10']).includes('<circle');return out})()""")
            check(r['ok'],'every figure is well-formed SVG'); check(r['heads']==3,'a different figure for each age'); check(r['dash']==[1,1],'only zones on this side are highlighted'); check(r['same'],'gradient ids are unique per figure'); check(r['noDash']==0,'no highlight without areas'); check(r['dot'],'marks still drawn')
            # one pain scale everywhere: the library article uses the very same faces, numbers and colours as My Health
            await fresh(pg,'9-10','en'); await ev(pg,"ST.step=2;R()"); h=await ev(pg,"[...document.querySelectorAll('.faces svg')].map(s=>s.outerHTML)"); hn=await ev(pg,"[...document.querySelectorAll('.faces .hl-num')].map(e=>e.textContent)")
            await ev(pg,"go('acad');libOpen('pain')"); l=await ev(pg,"[...document.querySelectorAll('.pain-lib .pf svg')].map(s=>s.outerHTML)"); ln=await ev(pg,"[...document.querySelectorAll('.pain-lib .pf .hl-num')].map(e=>e.textContent)")
            check(len(h)==6 and h==l and hn==ln==['0','2','4','6','8','10'],'the library scale is the same as the My Health scale (faces, numbers 0 to 10)'); check(await ev(pg,"document.querySelectorAll('.pain-lib .hl-scale').length")==1,'same colour bar')
            lt=await ev(pg,"document.querySelector('.pain-lib').innerText"); check(not re.search(r'None|A little|A lot|Very bad|No pain|Worst',lt),'no extra verbal labels that the other scale lacks')
            w=await ev(pg,"[document.documentElement.scrollWidth,innerWidth]"); check(w[0]<=w[1]+1,'library scale fits the screen')
            await ev(pg,"ST.nok=1;ST.nt=2;go('nurse')"); check('FPS' not in await ev(pg,"document.querySelector('#app').innerText"),'we no longer claim the licensed FPS-R name')
            # back navigation through every step
            await fresh(pg,'9-10','en')
            for k in range(1,5): await pg.click('.hl-bar .pri') if k!=1 else await pg.click('.hl-bar .pri')
            check(await ev(pg,"ST.step")>=2,'advanced')
            while await ev(pg,"ST.step")>0: await pg.click('.mm-top button >> nth=0')
            check(await ev(pg,"ST.step")==0,'back reaches the first step'); await pg.click('.mm-top button >> nth=0'); check(await ev(pg,"ST.view")=='home','back from step 0 goes home')
            # one-tap "no pain today" shortcut jumps to the last step and saves pain 0 with no places
            await fresh(pg,'9-10','ar'); await pg.click('.hl-ok'); check(await ev(pg,"ST.step")==5 and await ev(pg,"ST.pain")==0 and await ev(pg,"ST.a.length")==0,'no-pain shortcut'); await pg.click('.hl-bar .pri')
            r=await ev(pg,"D.reports[D.reports.length-1]"); check(r['k']=='sym' and r['pain']==0 and r['a']==[],'no-pain report'); await ev(pg,"ST.nok=1;ST.nt=1;go('nurse')"); check(await pg.locator('.mm-mini svg').count()>=1,'nurse row shows the face')
            # audio: button present, toggles
            await fresh(pg,'7-8','en'); check(await pg.locator('.mm-aud').count()==1,'audio button'); await pg.click('.mm-aud'); check(await ev(pg,"ST.maud")==True,'audio on'); await pg.click('.hl-bar .pri'); check(await ev(pg,"ST.step")==1,'moves on with audio on')
            # nurse sees the report; skipping everything still works
            await fresh(pg,'9-10','en')
            for k in range(5): await pg.click('.hl-bar .pri')
            await pg.click('.hl-bar .pri'); check(await ev(pg,"ST.step")==6,'sending with nothing chosen is allowed')
            await ev(pg,"ST.nok=1;ST.nt=2;go('nurse')"); check(len(await txt(pg))>20,'nurse view renders with the new report')
            # reduced motion
            await fresh(pg,'7-8','en'); await pg.click('#rm'); check(await ev(pg,"getComputedStyle(document.querySelector('.hl-in')).animationName")=='none','in-app reduce motion')
            await pg.close()
            pg=await b.new_page(viewport={'width':W,'height':H},reduced_motion='reduce'); await fresh(pg,'7-8','en'); check(await ev(pg,"getComputedStyle(document.querySelector('.hl-in')).animationName")=='none','OS reduce motion')
            await pg.focus('.hl-card >> nth=1'); await pg.keyboard.press('Enter'); check(await ev(pg,"ST.a")==['chest'],'keyboard select'); await pg.close()
        await b.close()
    print('ALL HEALTH E2E CHECKS PASSED:',ok)
asyncio.run(main())
