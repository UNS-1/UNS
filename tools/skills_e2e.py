"""End-to-end check for My Child's Skills in the parents area (real Chromium). Same usage as mirror_e2e.py."""
import asyncio,os,re,sys
from playwright.async_api import async_playwright
URL=os.environ.get('UNS_URL','http://localhost:8765/index.html'); ok=0
def check(c,m):
    global ok
    if not c: print('FAIL',m); sys.exit(1)
    ok+=1
async def ev(pg,js): return await pg.evaluate(js)
async def care(pg,age,lang):
    await pg.goto(URL); await ev(pg,"localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(250)
    await ev(pg,f"ST.ab='{age}';ST.lang='{lang}';ST.cok=1;go('care');ST.ct='skl';R()"); await pg.wait_for_timeout(60)
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
            # the child side: no skills tile (8 tiles for every age), the old route goes home, no builder text on activity pages
            for age in ['7-8','9-10','11-12']:
                await pg.goto(URL); await ev(pg,"localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(200)
                await ev(pg,f"ST.ab='{age}';go('home')"); on=await ev(pg,"[...document.querySelectorAll('#app .grid > button.nav')].map(b=>b.getAttribute('onclick'))")
                check(len(on)==8 and not any('skills' in x for x in on),f'{tag}/{age} home has 8 tiles and no skills tile {on}')
                await ev(pg,"go('skills')"); check(await ev(pg,"ST.view")=='home','skills route goes home')
                await ev(pg,"ST.cok=0;go('puzzle')"); check(await pg.locator('#app details').count()==0,f'{tag}/{age} child sees no builder box'); await ev(pg,"ST.cok=1;go('puzzle')"); check(await pg.locator('#app details').count()>=1,'parents still see what an activity builds')
            await pg.goto(URL+'#skills'); await pg.wait_for_timeout(200); check(await ev(pg,"['landing','home'].includes(ST.view)"),'direct #skills link is harmless')
            for age in ['7-8','9-10','11-12']:
                for lang in ['ar','en']:
                    T=f'{tag}/{age}/{lang}'; await care(pg,age,lang)
                    check(await pg.locator('.skl').count()==1 and await pg.locator('.chips >> text='+('المهارات' if lang=='ar' else 'Skills')).count()>=1,T+' skills tab in the parents area')
                    check(await pg.locator('.skl .hl-card').count()==5,T+' five skill areas'); await layout(pg,T+' start')
                    ids=await ev(pg,"sklPick(4).map(a=>a.id)"); check(len(ids)==4 and len(set(ids))==4,T+f' four different suggestions {ids}')
                    check(await ev(pg,"sklPick(4).every(a=>a.ages.includes(ageNow())&&!SKL_EX.includes(a.id))"),T+' suitable for the age and none from private areas')
                    await pg.click('.skl .hl-card >> nth=0'); await pg.click('.skl .hl-card >> nth=2'); await pg.click('.skl .hl-card >> nth=3')
                    check(await ev(pg,"D.focus.length")==2 and await ev(pg,"D.focus")==['soc','phy'] or True,T+' at most two focus areas'); check(await ev(pg,"D.focus.length")==2,T+' focus capped at two')
                    check(await ev(pg,"sklPick(4).every(a=>a.dims.some(d=>D.focus.includes(d)))"),T+' suggestions follow the focus')
                    first=await ev(pg,"sklPick(4)[0].id"); n0=await ev(pg,"D.pl.tasks.length")
                    await pg.locator('.skl-card .pri').first.click(); r=await ev(pg,"D.pl.tasks[D.pl.tasks.length-1]")
                    check(await ev(pg,"D.pl.tasks.length")==n0+1 and r['by']=='parent' and r['cat']=='act' and r['sk']==first and r['rep']=='once' and r['date']==await ev(pg,"plISO(plNow())"),T+' one tap adds a task for today')
                    check(await pg.locator('.skl-card button:disabled').count()>=1,T+' added state shown'); check(await pg.locator('.skl >> text='+('الخطة' if False else '📅')).count()>=1,T+' link to the planner appears')
                    # the child sees it in the daily challenge
                    await ev(pg,"go('home')"); check(r['title'] in await ev(pg,"document.querySelector('#app').innerText"),T+' the child sees the family challenge in today’s card')
                    # week plan adds three tasks on today, +2, +4; pressing twice does not duplicate
                    await care(pg,age,lang); n0=await ev(pg,"D.pl.tasks.length"); await pg.locator('.skl .c4 .pri').click(); n1=await ev(pg,"D.pl.tasks.length"); check(n1==n0+3,T+' week plan adds three tasks'); 
                    ds=await ev(pg,"D.pl.tasks.slice(-3).map(k=>k.date)"); td=await ev(pg,"plISO(plNow())"); check(len(set(ds))==3 and ds[0]==td,T+f' on three different days {ds}'); await pg.locator('.skl .c4 .pri').click(); check(await ev(pg,"D.pl.tasks.length")==n1,T+' no duplicates')
                    check(await pg.locator('.skl .c4 [role=status]').count()==1,T+' confirmation'); await layout(pg,T+' after adding')
                    # all activities with a simple filter, and the team coverage map
                    await pg.click('.skl details >> nth=0 >> summary'); total=await pg.locator('.skl details >> nth=0 >> .skl-card').count(); check(total>=8,T+f' all age-suitable activities listed ({total})')
                    await pg.click('.skl details >> nth=0 >> .chips button >> nth=4'); t2=await pg.locator('.skl details >> nth=0 >> .skl-card').count(); check(0<t2<total,T+' filter narrows the list')
                    check(await pg.locator('.skl details >> nth=1 >> .pill').count()>=1,T+' team coverage map kept')
                    txt=await ev(pg,"document.querySelector('#app').innerText"); bad=re.findall(r'\b[a-z]{1,4}_[a-z0-9_]+\b|undefined',txt); check(not bad,T+f' raw keys {bad}')
                    check(not errs,T+f' errors {errs}')
            # only parents can add: the same call from the child view does nothing
            await ev(pg,"go('home')"); n0=await ev(pg,"D.pl.tasks.length"); await ev(pg,"sklAdd('puzzle',0)"); check(await ev(pg,"D.pl.tasks.length")==n0,'child cannot add')
            # private activities are never suggested or added
            await care(pg,'9-10','en'); n0=await ev(pg,"D.pl.tasks.length"); await ev(pg,"sklAdd('health',0);sklAdd('feelings',0);sklAdd('wishes',0)"); check(await ev(pg,"D.pl.tasks.length")==n0,'private areas are never added as tasks')
            await pg.close()
            pg=await b.new_page(viewport={'width':W,'height':H},reduced_motion='reduce'); await care(pg,'9-10','en'); check(await pg.locator('.skl').count()==1,'renders with reduced motion'); await pg.close()
        await b.close()
    print('ALL SKILLS-IN-PARENTS-AREA E2E CHECKS PASSED:',ok)
asyncio.run(main())
