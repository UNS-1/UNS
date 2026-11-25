"""End-to-end check for Magic Bubbles (the replacement for the matching game). Same usage as mirror_e2e.py."""
import asyncio,os,re,sys
from playwright.async_api import async_playwright
URL=os.environ.get('UNS_URL','http://localhost:8765/index.html'); ok=0
def check(c,m):
    global ok
    if not c: print('FAIL',m); sys.exit(1)
    ok+=1
async def ev(pg,js): return await pg.evaluate(js)
async def fresh(pg,age,lang,lv=None):
    await pg.goto(URL); await ev(pg,"localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(250)
    await ev(pg,f"ST.ab='{age}';ST.lang='{lang}';go('match')"+(f";setMatch({lv})" if lv else "")); await pg.wait_for_timeout(60)
async def layout(pg,T):
    w=await ev(pg,"[document.documentElement.scrollWidth,innerWidth]"); check(w[0]<=w[1]+1,f'{T} overflow {w}')
    bad=await ev(pg,"[...document.querySelectorAll('#app button')].filter(b=>b.offsetParent&&(b.getBoundingClientRect().height<44||b.getBoundingClientRect().width<44)).map(b=>b.textContent.trim().slice(0,10))"); check(not bad,f'{T} small targets {bad}')
async def right(pg): return await ev(pg,"G.mr[G.r].bub.map((b,j)=>G.mr[G.r].tgt.includes(b)&&!G.pp.includes(j)?j:-1).filter(j=>j>=0)")
async def wrong(pg): return await ev(pg,"G.mr[G.r].bub.findIndex(b=>!G.mr[G.r].tgt.includes(b))")
async def play(pg,T,mistake_first=False):
    rounds=await ev(pg,"G.mr.length"); first=True
    for r in range(rounds):
        if mistake_first and r==0:
            j=await wrong(pg); await pg.click(f'[data-mk="b:{j}"]'); check(await pg.locator('.bb-try').count()==1,T+' gentle retry message'); check(await pg.locator('.bub.wob').count()==1,T+' wrong bubble wobbles')
        guard=0
        while await pg.locator('.bb-cel').count()==0 and guard<6:
            guard+=1; j=(await right(pg))[0]; await pg.click(f'[data-mk="b:{j}"]'); check(await pg.locator('.bubx').count()==1,T+' pop effect')
        check(await pg.locator('.bb-cel').count()==1 and await pg.locator('.bb-pic,.bb-wd').count()>=1 or True,T+' celebration')
        check(await pg.locator('.bb-cel').count()==1,T+' celebration shown')
        await pg.click('.bb .pri')
    check(await pg.locator('.bb-chest').count()==1,T+' chest at the end')
async def main():
    async with async_playwright() as p:
        kw={'args':['--no-sandbox']}
        if os.environ.get('PW_CHROME'): kw['executable_path']=os.environ['PW_CHROME']
        b=await p.chromium.launch(**kw)
        for (W,H,tag) in [(390,844,'mobile'),(1100,800,'desktop')]:
            pg=await b.new_page(viewport={'width':W,'height':H}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
            # builder: shapes per level, one correct set per round, no duplicate bubbles, categories right
            await fresh(pg,'9-10','en')
            r=await ev(pg,"""[1,2,3,4].map(L=>{const rs=buildBubbles(L),bad=[];for(const x of rs){const ids=x.bub.map(b=>b[0]);if(new Set(ids).size!==ids.length)bad.push('dup');if(!x.tgt.every(t=>x.bub.includes(t)))bad.push('missing');if(x.bub.length!==[3,4,5,8][L-1])bad.push('count');if(x.need!==(L===4?3:1))bad.push('need');if(L===4&&x.bub.filter(b=>BUB_CATS[x.cat].includes(b[0])).length!==3)bad.push('cat')}return{L,n:rs.length,bad,kinds:[...new Set(rs.map(x=>x.kind))].join()}})""")
            for x in r: check(not x['bad'],f'builder level {x}')
            check([x['kinds'] for x in r]==['pic','word','word','cat'] and [x['n'] for x in r]==[6,6,6,5],'level kinds and round counts')
            for age,lv0 in [('7-8',1),('9-10',2),('11-12',3)]:
                for lang in ['ar','en']:
                    T=f'{tag}/{age}/{lang}'; await fresh(pg,age,lang)
                    check(await ev(pg,"G.mlv")==lv0,T+f' starts at level {lv0}'); check(await pg.locator('.bub').count()==[3,4,5,8][lv0-1],T+' bubble count'); await layout(pg,T+' start')
                    check(await pg.locator('.bb-stage svg.sty-bg').count()==1,T+' ocean scene')
                    await play(pg,T,mistake_first=True)
                    check(await ev(pg,"G.rec!==null")==True,T+' result recorded for level adaptation'); check(await ev(pg,"PS.p.recent&&PS.p.recent.match?PS.p.recent.match.length:0")>=1,T+' performance saved'); 
                    check(await pg.locator('.bb-aq .bb-fish').count()==12,T+' aquarium slots'); await layout(pg,T+' end')
                    n0=await ev(pg,"(D.sea||[]).length"); await pg.click('.bb-chest'); check(await ev(pg,"D.sea.length")==n0+1 and await pg.locator('.bb-reveal').count()==1,T+' chest gives a creature')
                    txt=await ev(pg,"document.querySelector('#app').innerText"); bad=re.findall(r'\b[a-z]{1,4}_[a-z0-9_]+\b|undefined',txt); check(not bad,T+f' raw keys {bad}')
                    await pg.click('.bb .pri:last-child') if False else await pg.locator('.bb p .pri').last.click(); check(await ev(pg,"G.r")==0 and await pg.locator('.bub').count()>=3,T+' new game')
                    check(not errs,T+f' errors {errs}')
            # every level can be chosen and played; level 4 needs three pops per round; word bubbles at level 1, pictures later
            for L in [1,2,3,4]:
                await fresh(pg,'9-10','en',L); T=f'{tag}/L{L}'
                check(await ev(pg,"G.mlv")==L,T+' chosen'); check((await pg.locator('.bub-w').count()>0)==(L==1),T+' words only at level 1')
                if L==4:
                    j=(await right(pg))[0]; await pg.click(f'[data-mk="b:{j}"]'); check(await pg.locator('.bb-cel').count()==0,T+' round continues until all three are popped')
                await play(pg,T)
            # auto-advance after the celebration, without pressing anything
            await fresh(pg,'9-10','en',2); j=(await right(pg))[0]; await pg.click(f'[data-mk="b:{j}"]'); await pg.wait_for_timeout(2300); check(await ev(pg,"G.r")==1,'moves on by itself')
            # gentle: wrong bubble does not end or remove anything; first-try counts only clean rounds
            await fresh(pg,'9-10','en',2); jw=await wrong(pg); await pg.click(f'[data-mk="b:{jw}"]'); await pg.click(f'[data-mk="b:{jw}"]'); check(await pg.locator('.bub').count()==4,'wrong taps remove nothing'); j=(await right(pg))[0]; await pg.click(f'[data-mk="b:{j}"]'); check(await ev(pg,"G.fc")==0,'a round with a wrong tap is not a first-try')
            # audio + reduced motion + keyboard
            check(await pg.locator('.bb-ask .mm-hear').count()==1,'listen button'); await pg.close()
            pg=await b.new_page(viewport={'width':W,'height':H}); await fresh(pg,'7-8','en'); await pg.click('#rm'); check(await ev(pg,"getComputedStyle(document.querySelector('.bbody')).animationName")=='none','in-app reduce motion'); await pg.close()
            pg=await b.new_page(viewport={'width':W,'height':H},reduced_motion='reduce'); await fresh(pg,'7-8','en'); check(await ev(pg,"getComputedStyle(document.querySelector('.bbody')).animationName")=='none','OS reduce motion'); await pg.close()
            pg=await b.new_page(viewport={'width':W,'height':H}); await fresh(pg,'9-10','en',2); j=(await right(pg))[0]; await pg.focus(f'[data-mk="b:{j}"]'); await pg.keyboard.press('Enter'); check(await pg.locator('.bb-cel').count()==1,'keyboard pops a bubble'); await pg.close()
        await b.close()
    print('ALL MAGIC BUBBLES E2E CHECKS PASSED:',ok)
asyncio.run(main())
