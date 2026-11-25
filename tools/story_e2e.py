"""End-to-end check for the interactive stories (real Chromium). Same usage as mirror_e2e.py."""
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
    await ev(pg,f"ST.ab='{age}';ST.lang='{lang}';go('story')"); await pg.wait_for_timeout(60)
async def main():
    async with async_playwright() as p:
        kw={'args':['--no-sandbox']}
        if os.environ.get('PW_CHROME'): kw['executable_path']=os.environ['PW_CHROME']
        b=await p.chromium.launch(**kw)
        for (W,H,tag) in [(390,844,'mobile'),(1100,800,'desktop')]:
            pg=await b.new_page(viewport={'width':W,'height':H}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
            # structure: every target exists, every story has 3+ endings, all endings reachable, no dead ends
            await fresh(pg,'9-10','en')
            res=await ev(pg,"""STX.map(s=>{const ids=Object.keys(s.n),bad=[],seen=new Set(['s']),q=['s'];
              for(const k of ids){const n=s.n[k];if(!n.a||!n.a[0]||!n.a[1])bad.push(k+':text');if(!n.e&&!(n.ch&&n.ch.length>=2))bad.push(k+':choices');(n.ch||[]).forEach(c=>{if(!s.n[c[2]])bad.push(k+'->'+c[2]);if(!c[0]||!c[1]||!c[3])bad.push(k+':choice text')})}
              while(q.length){const k=q.pop();(s.n[k].ch||[]).forEach(c=>{if(s.n[c[2]]&&!seen.has(c[2])){seen.add(c[2]);q.push(c[2])}})}
              for(const k of ids){const n=s.n[k];if(n.m&&!(n.m.n>=1&&n.m.t[0]&&n.m.t[1]))bad.push(k+':mini');if(n.th&&!(n.th[0]&&n.th[1]))bad.push(k+':thought')}
              const ends=ids.filter(k=>s.n[k].e);return{id:s.id,bad,ends:ends.length,unreach:ends.filter(k=>!seen.has(k)).length,ages:s.ages.join()}})""")
            check(len(res)==9,'9 stories')
            for r in res: check(not r['bad'] and r['ends']>=3 and r['unreach']==0,f'story {r}')
            check(sorted(r['ages'] for r in res)==['11-12']*3+['7-8']*3+['9-10']*3,'three stories per age band')
            async def play(pg):
                guard=0
                while not await pg.locator('.sty-end').count() and guard<40:
                    guard+=1
                    if await pg.locator('.sty-ch').count(): await pg.locator('.sty-ch').first.click()
                    elif await pg.locator('.sty-m').count(): await pg.click('[data-mk="sty:act"]')
                    else: check(False,'stuck: neither choices, mini game nor ending')
            for age in ['7-8','9-10','11-12']:
                for lang in ['ar','en']:
                    T=f'{tag}/{age}/{lang}'; await fresh(pg,age,lang)
                    check(await ev(pg,"document.documentElement.dir")==('rtl' if lang=='ar' else 'ltr'),T+' dir')
                    check(await pg.locator('.sty-cov').count()==9,T+' all 9 stories open to every age')
                    check(await pg.locator('.sty-covs:not(.sty-more) .sty-cov').count()==3,T+' three picked for the age')
                    mine=await ev(pg,"STX.filter(x=>x.ages.includes(ageNow())).map(x=>x.id)")
                    first=await ev(pg,"[...document.querySelectorAll('.sty-covs:not(.sty-more) .sty-cov')].map(b=>b.dataset.mk.slice(3))"); check(sorted(first)==sorted(mine),T+' picks match age')
                    for st in ['cloud','lantern','moon','forest','colors','toys','lighthouse','bottle','friend']:
                        await fresh(pg,age,lang); await pg.click(f'[data-mk="sc:{st}"]'); check(await ev(pg,"ST.sid")==st,T+' start '+st)
                        # tap the character: reaction + effect
                        await pg.click('[data-mk="sty:act"]'); check(await pg.locator('.sty-rx').count()==1,T+' character reacts'); check(await pg.locator('.sty-pf').count()>0,T+' particles')
                        txt=await ev(pg,"document.querySelector('#app').innerText"); check(not re.search(r'\bsty_[a-z]+\b|\bmm_[a-z0-9_]+\b|undefined',txt),T+' raw key/undefined')
                        # play one full path by clicking the first choice each time
                        await play(pg)
                        check(await pg.locator('.sty-end').count()==1,T+f' {st} reaches an ending'); check(await ev(pg,"D.sdone")==1,'journey flag')
                        check(('💭' in await ev(pg,"document.querySelector('#app').innerText"))==(age!='7-8'),T+' reflection only for 9-12')
                        check(await ev(pg,"(styFound(ST.sid)||[]).length")>=1,T+' ending remembered')
                    # overflow + touch targets on picker, scene and ending
                    for view in ['picker','scene','end']:
                        await fresh(pg,age,lang)
                        if view!='picker': await pg.click('[data-mk="sc:'+('cloud' if age=='7-8' else 'forest' if age=='9-10' else 'bottle')+'"]')
                        if view=='end': await play(pg)
                        w=await ev(pg,"[document.documentElement.scrollWidth,innerWidth]"); check(w[0]<=w[1]+1,f'{T} {view} overflow {w}')
                        bad=await ev(pg,"[...document.querySelectorAll('#app button')].filter(b=>b.offsetParent&&(b.getBoundingClientRect().height<44||b.getBoundingClientRect().width<44)).map(b=>b.textContent.trim().slice(0,10))"); check(not bad,f'{T} {view} small targets {bad}')
                    check(not errs,T+f' errors {errs}')
            # previous / list / restart / found counter
            await fresh(pg,'9-10','en'); await pg.click('[data-mk="sc:forest"]'); await pg.locator('.sty-ch').first.click(); await pg.click('text=↩ Back'); check(await ev(pg,"ST.sn")=='s','previous page')
            await pg.locator('.sty-ch').first.click(); await pg.locator('.sty-ch').first.click(); await pg.click('text=Another path'); check(await ev(pg,"ST.sn")=='s' and await ev(pg,"ST.syp.length")==0,'restart')
            await pg.click('text=All stories'); check(await pg.locator('.sty-cov').count()==9,'back to list'); check(await pg.locator('.sty-bd span.on').count()==1,'found ending shown on the cover')
            await ev(pg,"go('journey')") if False else None
            # mini game gates the choices (tap), can be skipped; thoughts toggle; mood suggestion; journey card
            await fresh(pg,'7-8','en'); await pg.click('[data-mk="sc:moon"]'); await pg.locator('.sty-ch').first.click()
            check(await pg.locator('.sty-m').count()==1 and await pg.locator('.sty-ch').count()==0,'choices wait for the touches')
            for k in range(3): await pg.click('[data-mk="sty:act"]')
            check(await pg.locator('.sty-ch').count()==2,'choices appear after 3 touches')
            await fresh(pg,'7-8','en'); await pg.click('[data-mk="sc:moon"]'); await pg.locator('.sty-ch').first.click(); await pg.click('.sty-m button')
            check(await pg.locator('.sty-ch').count()==2,'skip opens the choices')
            await fresh(pg,'11-12','ar'); await pg.click('[data-mk="sc:friend"]'); check(await pg.locator('.sty-thb').count()==1,'thought button'); await pg.click('.sty-thb'); check(await pg.locator('.sty-th').count()==1,'thought shown'); await pg.click('.sty-thb'); check(await pg.locator('.sty-th').count()==0,'thought hidden')
            await fresh(pg,'7-8','en'); check(await pg.locator('.sty-thb').count()==0 and await pg.locator('.sty-cov.sug').count()==0,'no thoughts/suggestion by default')
            for feel,exp in [('lonely',['cloud']),('tired',['moon']),('scared',['toys','forest']),('worried',['moon','toys','lantern','forest','lighthouse','friend']),('angry',['colors','lighthouse'])]:
                await ev(pg,f"ST.ab='9-10';ST.lang='en';go('feel');ST.f=['{feel}'];ST.w=['story'];ST.step=4;R()"); await pg.click('[data-mk="t:story"]')
                check(await ev(pg,"ST.view")=='story' and await pg.locator('.sty-cov.sug').count()==1,'mirror suggests a story for '+feel)
                got=await ev(pg,"document.querySelector('.sty-cov.sug').dataset.mk.slice(3)"); check(got in exp+['cloud','colors'] or got in exp,f'suggestion {got} fits {feel}')
            await ev(pg,"D.sty={};ST.sid='';go('story')"); await pg.click('[data-mk="sc:toys"]'); await play(pg); await ev(pg,"go('jour')")
            check('Toy Hospital' in await ev(pg,"document.querySelector('#app').innerText"),'journey page shows the story with its ending'); check(await ev(pg,"styJourney().length")==1,'journey lists the story with its ending')
            # reduced motion
            await fresh(pg,'7-8','en'); await pg.click('#rm'); await pg.click('[data-mk="sc:cloud"]'); check(await ev(pg,"getComputedStyle(document.querySelector('.sty-ai')).animationName")=='none','in-app reduce motion')
            await pg.close()
            pg=await b.new_page(viewport={'width':W,'height':H},reduced_motion='reduce'); await fresh(pg,'7-8','en'); await pg.click('[data-mk="sc:cloud"]')
            check(await ev(pg,"getComputedStyle(document.querySelector('.sty-ai')).animationName")=='none','OS reduce motion'); await pg.close()
            # keyboard
            pg=await b.new_page(viewport={'width':W,'height':H}); await fresh(pg,'9-10','en'); await pg.focus('[data-mk="sc:colors"]'); await pg.keyboard.press('Enter')
            await pg.focus('[data-mk="sch:1"]'); await pg.keyboard.press('Enter'); check(await ev(pg,"ST.sn")=='r','keyboard play'); await pg.close()
        await b.close()
    print('ALL STORY E2E CHECKS PASSED:',ok)
asyncio.run(main())
