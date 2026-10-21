"""All seven visual cue patterns in local Chromium. Real cue times; no Firebase access.
Ordinary reel/free-spin waits are shortened only in response copies for this suite.
"""
import asyncio, functools, http.server, importlib.util, json, os, subprocess, threading
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('slot_fixture',ROOT/'tests/slot-any-bonus.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
WIDTH=int(os.environ.get('EMOJIN_TEST_WIDTH','390'));HEIGHT=int(os.environ.get('EMOJIN_TEST_HEIGHT','844'))
FIXTURES=r'''
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),source=fs.readFileSync('app.js','utf8');
const c={crypto:crypto.webcrypto};vm.createContext(c);vm.runInContext(source.slice(0,source.indexOf('/* Firebase configuration is public.')),c);const S=c.MojiSpinEngine;
const plans=[['A','blank'],['A','wild'],['B','blank'],['B','wild'],['C','blank'],['C','wild'],['D','wild'],[null,'bell'],['C','blank'],['A','blank']];
function round(i,center){const cells=Array(9).fill('blank');cells[4]=center;const freeCount=center==='wild'?4:0;
 const spins=Array.from({length:freeCount+1},(_,j)=>({...S.evaluate(cells),free:j>0}));
 return {id:'slot-cue-'+i,version:2,bet:8,freeCount,spins,total:0,createdAt:Date.now()};}
console.log(JSON.stringify({plans:plans.map(([cue,center],i)=>({cue,round:round(i,center)})),authority:round('authority','wild')}));
'''
TRACE=r'''
audit.events=[];audit.choices=[];audit.starts=[];audit.results=[];
window.cueDelay=async ms=>{audit.events.push({kind:'hold',ms,time:performance.now(),
 black:!!document.querySelector('.slot-cue-blackout'),giant:!!document.querySelector('.slot-cue-giant'),confetti:document.querySelectorAll('.slot-cue-confetti').length});
 await new Promise(resolve=>setTimeout(resolve,ms));};
const decoratedAnimate=Element.prototype.animate;
Element.prototype.animate=function(frames,options){
 const cue=this.matches('.cue-shaking,.slot-cue-clown,.slot-cue-giant,.slot-cue-blackout');
 if(window.failCue&&this.matches('.cue-shaking')&&!audit.failedOnce){audit.failedOnce=true;throw Error('Simulated visual error');}
 const start=performance.now(),a=decoratedAnimate.call(this,frames,options);
 if(cue){const el=this;const event={kind:'animation',cls:el.className,start,duration:options.duration,iterations:options.iterations||1,frames};audit.events.push(event);
  a.finished.then(()=>{const r=el.getBoundingClientRect();event.end=performance.now();event.rect={left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};}).catch(()=>{});}
 return a;
};
'''
WRAPPERS=r'''
const chooseOriginal=chooseSlotCue;
chooseSlotCue=(center)=>{audit.choices.push(center);return fixture.plans[audit.draws-1].cue;};
const reelOriginal=startSlotReels;
startSlotReels=(session,free)=>{const value=reelOriginal(session,free);audit.starts.push({free,cue:session.cue,
 special:!!document.querySelector('.cue-special'),layer:!!document.querySelector('.slot-cue-blackout,.slot-cue-flight-layer')});return value;};
const spinOriginal=animateSlotSpin;
animateSlotSpin=async(session,spin)=>{const started=performance.now();await spinOriginal(session,spin);
 audit.results.push({free:spin.free,elapsed:performance.now()-started,cells:slotCells().map(el=>el.dataset.symbol),
 expected:spin.cells,leaks:!!document.querySelector('.cue-special,.cue-shaking,.slot-cue-track,.slot-cue-blackout,.slot-cue-flight-layer')});};
const confettiOriginal=slotCueConfetti;
slotCueConfetti=(layer)=>{audit.events.push({kind:'confetti',time:performance.now()});return confettiOriginal(layer);};
'''

async def main():
 fixture=json.loads(subprocess.check_output(['node','-e',FIXTURES],cwd=ROOT,text=True))
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(base.Quiet,directory=str(ROOT)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   ctx=await browser.new_context(viewport={'width':WIDTH,'height':HEIGHT},is_mobile=True,has_touch=True,service_workers='block')
   mock=base.MOCK.replace('duration:Math.min(options.duration||0,8)',"duration:(this.matches('.cue-shaking')||this.closest('.slot-cue-flight-layer,.slot-cue-blackout'))?options.duration:Math.min(options.duration||0,8)")
   await ctx.add_init_script('window.fixture='+json.dumps(fixture)+';'+mock+TRACE)
   await ctx.route('https://**/*',lambda r:r.abort())
   source=(ROOT/'app.js').read_text().replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{')
   source=source.replace('reduced()?Math.min(ms,55):ms','Math.min(ms,10)')
   a=source.index('const SLOT_CUES=');b=source.index('function installSlotButton()',a)
   source=source[:a]+source[a:b].replace('await delay(','await window.cueDelay(')+source[b:]
   source=source.replace('/* Firebase configuration is public.',r'''
const cueEngine=window.MojiSpinEngine;
function frozen(value){if(value&&typeof value==='object'){Object.values(value).forEach(frozen);Object.freeze(value);}return value;}
window.MojiSpinEngine=Object.freeze({...cueEngine,createRound(){return frozen(structuredClone(fixture.plans[audit.draws++].round));}});
/* Firebase configuration is public.''')
   source=source.replace('async function slotFreeRoulette(count){','async function slotFreeRoulette(count){setSlotFreeRemaining(count);return;')
   source=source.replace('async function showSlotTotal(total){','async function showSlotTotal(total){return;')
   source=source.replace('init().catch(err=>{',WRAPPERS+'\ninit().catch(err=>{')
   await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))
   page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/')
   await page.wait_for_function("document.querySelector('#bootScreen').classList.contains('hidden')")
   await page.locator('#mojiSpinButton').click();await base.idle(page)
   for index,plan in enumerate(fixture['plans'][:8]):
    kind=plan['cue'];hit=plan['round']['freeCount']>0
    await page.evaluate('audit.events=[]')
    if kind=='C':await page.evaluate('holdSave=true;window.releaseSave=null')
    await page.locator('#slotSpinButton').click()
    assert await page.locator('#slotSpinButton').is_disabled()
    assert await page.locator('#slotOddsButton').is_disabled()
    if kind=='A':
     await page.wait_for_selector('.cue-shaking')
     assert await page.locator('.spin-cell.spinning').count()==1
     before=await page.locator('.spin-cell').nth(4).get_attribute('data-symbol')
     await page.wait_for_timeout(110)
     after=await page.locator('.spin-cell').nth(4).get_attribute('data-symbol')
     assert before!=after
     await page.screenshot(path=f'/tmp/emojin-cue-A-{int(hit)}-{WIDTH}.png')
    elif kind=='B':
     await page.wait_for_selector('.slot-cue-flight-layer')
     assert await page.locator('.spin-cell').nth(4).get_attribute('data-symbol')=='blank'
     await page.wait_for_function("audit.events.some(e=>e.kind==='animation'&&e.cls==='slot-cue-clown'&&e.duration===2200&&e.end)")
     aligned=await page.evaluate('''()=>{const a=document.querySelector('.slot-cue-clown').getBoundingClientRect(),b=document.querySelectorAll('.spin-cell')[4].getBoundingClientRect();return Math.abs(a.left+a.width/2-b.left-b.width/2)<1&&Math.abs(a.top+a.height/2-b.top-b.height/2)<1;}''')
     assert aligned
     await page.screenshot(path=f'/tmp/emojin-cue-B-{int(hit)}-{WIDTH}.png')
    elif kind=='C':
     await page.wait_for_selector('.slot-cue-track')
     assert await page.locator('.slot-cue-face').count()==10
     assert await page.locator('.slot-cue-face.cue-blank').count()==2
     assert await page.locator('.slot-cue-track').is_visible()
     await page.wait_for_function('!!window.releaseSave')
     await page.screenshot(path=f'/tmp/emojin-cue-C-{int(hit)}-{WIDTH}.png')
     await page.evaluate('holdSave=false;releaseSave()')
    elif kind=='D':
     await page.wait_for_selector('.slot-cue-blackout',timeout=12000)
     assert await page.locator('.slot-cue-giant').count()==0
     assert await page.locator('.spin-cell.spinning').count()==0
     assert await page.locator('.slot-cue-blackout').evaluate('(el)=>{const r=el.getBoundingClientRect();return el.parentElement===document.body&&r.x===0&&r.y===0&&r.width===innerWidth&&r.height===innerHeight;}')
     await page.screenshot(path=f'/tmp/emojin-cue-D-black-{WIDTH}.png')
     await page.wait_for_selector('.slot-cue-confetti')
     assert await page.locator('.slot-cue-giant').evaluate('(el)=>{const r=el.getBoundingClientRect();return Math.abs(r.x+r.width/2-innerWidth/2)<2&&Math.abs(r.y+r.height/2-innerHeight/2)<2;}')
     await page.wait_for_timeout(100)
     await page.screenshot(path=f'/tmp/emojin-cue-D-land-{WIDTH}.png')
    await page.wait_for_function("!document.querySelector('#slotSpinButton').disabled",timeout=18000)
    events=await page.evaluate('audit.events')
    if kind=='A':
     event=next(e for e in events if e['kind']=='animation' and 'cue-shaking' in e['cls'])
     assert 2900<=event['end']-event['start']<=3200,event
    elif kind=='B':
     flight=next(e for e in events if e['kind']=='animation' and e['cls']=='slot-cue-clown' and e['duration']==2200)
     assert 2100<=flight['end']-flight['start']<=2400
     holds=[e for e in events if e['kind']=='hold'];assert [h['ms'] for h in holds]==[2000,1000]
     assert flight['start']-holds[0]['time']>=1950
     exits=[e for e in events if e['kind']=='animation' and e['duration']==900]
     assert len(exits)==(0 if hit else 1)
     if exits:
      rect=exits[0]['rect'];assert rect['right']<0 or rect['left']>WIDTH or rect['bottom']<0 or rect['top']>HEIGHT
    elif kind=='D':
     holds=[e for e in events if e['kind']=='hold'];assert holds[0]['ms']>=5800
     assert [e['ms'] for e in holds[1:]]==[2000,2000]
     drop=next(e for e in events if e['kind']=='animation' and e['duration']==450)
     confetti=next(e for e in events if e['kind']=='confetti')
     assert 0<=confetti['time']-drop['end']<=40
     fades=[e for e in events if e['kind']=='animation' and e['duration']==1000]
     assert len(fades)==2 and all(1950<=e['start']-confetti['time']<=2200 for e in fades)
    assert await page.locator('.cue-special,.cue-shaking,.slot-cue-track,.slot-cue-flight-layer,.slot-cue-blackout').count()==0
    assert await page.evaluate('audit.draws')==index+1
    assert len(await page.evaluate('audit.saves'))==index+1
    assert await page.evaluate('JSON.stringify(mockCloud.wallet.balance)')==str(2000-8*(index+1))
    print(f'PASS {WIDTH} {kind or "none"} {"hit" if hit else "miss"}: timing, result and cleanup',flush=True)

   # Another device's authoritative round cancels a provisional C without a second cue draw.
   await page.evaluate('''()=>{window.originalSpin=mockCloud.spinSlot;mockCloud.spinSlot=async candidate=>{audit.saves.push(candidate.id);
    const balanceBefore=mockCloud.wallet.balance;mockCloud.wallet.balance-=8;
    return mockCloud.active={round:fixture.authority,balanceBefore,balanceAfter:mockCloud.wallet.balance};};}''')
   await page.locator('#slotSpinButton').click();await base.idle(page)
   assert await page.evaluate('audit.choices.length')==9
   assert await page.locator('.slot-cue-track').count()==0

   # A thrown visual animation error still cleans up; reopening resumes the saved result once.
   await page.evaluate('mockCloud.spinSlot=originalSpin;window.failCue=true')
   await page.locator('#slotSpinButton').click()
   await page.wait_for_function("audit.failedOnce&&document.querySelector('#spinPhase').textContent.includes('通信')")
   assert await page.locator('.spinning,.cue-shaking,.slot-cue-track,.slot-cue-blackout,.slot-cue-flight-layer').count()==0
   assert await page.locator('#slotSpinButton').is_disabled()
   await page.locator('.moji-spin-panel .modal-close').click()
   await page.wait_for_function("document.querySelector('#modalHost').classList.contains('hidden')")
   await page.locator('#mojiSpinButton').click();await base.idle(page)
   audit=await page.evaluate('audit')
   assert audit['draws']==10 and len(audit['saves'])==10
   assert len(audit['finishes'])==10
   assert all(result['cells']==result['expected'] and not result['leaks'] for result in audit['results'])
   ctimes=[r['elapsed'] for r in audit['results'] if not r['free'] and r['elapsed']>=6000 and r['elapsed']<9000]
   assert len(ctimes)>=2
   assert all(not row['special'] and not row['layer'] and row['cue'] is None for row in audit['starts'] if row['free'])
   assert not errors,errors
   print(f'PASS {WIDTH}x{HEIGHT}: seven cues, normal fallback, free reset, authoritative redirect, failure cleanup/resume, immutable results/no extra saves',flush=True)
   await browser.close()
 finally:server.shutdown()

if __name__=='__main__':asyncio.run(main())
