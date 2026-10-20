"""Local Chromium integration: saved slot results, highlighting, totals and resume. No Firebase writes.
Only response copies accelerate animation waits; product files stay unchanged.
"""
import asyncio, functools, http.server, json, os, subprocess, threading
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
WIDTH=int(os.environ.get('EMOJIN_TEST_WIDTH','390'))
HEIGHT=int(os.environ.get('EMOJIN_TEST_HEIGHT','844'))
SOURCE=(ROOT/'app.js').read_text()
FIXTURES=r'''
const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const source=fs.readFileSync('app.js','utf8'),ctx={crypto:crypto.webcrypto};vm.createContext(ctx);
vm.runInContext(source.slice(0,source.indexOf('/* Firebase configuration is public.')),ctx);
const S=ctx.MojiSpinEngine;
function round(id,cells){const spins=cells.map((c,i)=>({...S.evaluate(c),free:i>0}));return {id:'slot-'+id,version:2,bet:8,freeCount:spins.length-1,spins,total:spins.reduce((n,s)=>n+s.payout,0),createdAt:Date.now()};}
const empty=()=>Array(9).fill('blank'),zero=()=>{const c=empty();c[4]='wild';return c;};
const any=round('any',[['wild','cherry','blank','melon','blank','wild','blank','cherry','melon']]);
const free=round('free',[
 ['melon','melon','blank','blank','wild','melon','blank','blank','melon'],
 ['blank','melon','bell','wild','wild','cherry','wild','cherry','cherry'],zero(),zero(),zero()]);
const none=round('none',[empty()]);
const max=round('max',Array.from({length:21},()=>Array(9).fill('wild')));
const legacy={crypto:crypto.webcrypto};vm.createContext(legacy);vm.runInContext(fs.readFileSync('tests/fixtures/slot-v1-engine.cjs','utf8'),legacy);
const old=legacy.MojiSpinEngine.createRound(()=>.4);old.id='slot-legacy';
console.log(JSON.stringify({rounds:[any,free,none,max],old}));
'''
MOCK=r'''
window.audit={draws:0,saves:[],finishes:[],frames:[],delays:[],animations:[]};
window.holdSave=false;window.holdFinish=false;
const player={uid:'me',name:'me',tutorialSeen:true,seenBattleSeq:0,seenLegendSeq:0,unreadBattleIds:[]};
const readback=value=>Array.isArray(value)?value.map(readback):value&&typeof value==='object'
 ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,readback(value[key])])):value;
window.mockCloud={uid:'me',player,wallet:{balance:2000,updatedAt:Date.now()},hatch:0,hatchPending:0,canReload:true,active:null,
 get slotPending(){return !!this.active;},
 getState:async()=>({player,wallet:mockCloud.wallet,draft:null,emojins:[],battles:[],legends:[],nextSeq:1,nextLegendSeq:1,suspendedOwnerUids:[],dormantOwnerUids:[]}),
 getSlotRound:async()=>readback(mockCloud.active),
 spinSlot:async round=>{
  audit.saves.push(round.id);
  if(holdSave)await new Promise(resolve=>window.releaseSave=resolve);
  const balanceBefore=mockCloud.wallet.balance;
  mockCloud.wallet={balance:balanceBefore-round.bet+round.total,updatedAt:Date.now()};
  mockCloud.active={round,balanceBefore,balanceAfter:mockCloud.wallet.balance};
  window.dispatchEvent(new Event('emojin-wallet'));
  return mockCloud.active;
 },
 finishSlot:async id=>{
  audit.finishes.push(id);
  if(holdFinish)await new Promise(resolve=>window.releaseFinish=resolve);
  mockCloud.active=null;
 },
 saveDraft:()=>{},markSeen:async()=>{},addLoot:()=>Promise.resolve()
};
const nativeAnimate=Element.prototype.animate;
Element.prototype.animate=function(frames,options){
 if(options&&typeof options==='object'){audit.animations.push(options.duration);options={...options,duration:Math.min(options.duration||0,8),delay:0};}
 return nativeAnimate.call(this,frames,options);
};
'''

class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass

async def idle(page):
 await page.wait_for_function("!document.querySelector('#slotSpinButton').disabled",timeout=20000)

async def main():
 fixtures=json.loads(subprocess.check_output(['node','-e',FIXTURES],cwd=ROOT,text=True))
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   ctx=await browser.new_context(viewport={'width':WIDTH,'height':HEIGHT},is_mobile=True,has_touch=True,service_workers='block')
   await ctx.add_init_script('window.fixture='+json.dumps(fixtures)+';'+MOCK)
   await ctx.route('https://**/*',lambda r:r.abort())
   served=SOURCE.replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{')
   served=served.replace('function delay(ms) {','function delay(ms) { window.audit.delays.push(ms);')
   served=served.replace('reduced()?Math.min(ms,55):ms','Math.min(ms,10)')
   served=served.replace('/* Firebase configuration is public.',r'''
const realSlotEngine=window.MojiSpinEngine;
window.MojiSpinEngine=Object.freeze({...realSlotEngine,createRound(){return structuredClone(fixture.rounds[audit.draws++]);}});
/* Firebase configuration is public.''')
   served=served.replace('  slotConfetti(big?60:22);',r'''
  window.audit.frames.push({total:session.win,balance:session.balance,spin:structuredClone(spin),
    winning:slotCells().flatMap((el,i)=>el.classList.contains('winning')?[i]:[]),lines:svg.children.length});
  slotConfetti(big?60:22);''')
   await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=served))
   page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/')
   await page.wait_for_function("document.querySelector('#bootScreen').classList.contains('hidden')")
   await page.locator('#mojiSpinButton').click();await idle(page)
   assert await page.locator('#spinPhase').is_hidden()
   await page.locator('#slotOddsButton').click()
   assert await page.locator('.spin-odds-dialog').is_visible()
   assert await page.locator('.spin-odds-item strong').all_text_contents()==['× 256','× 128','× 64','× 32','× 16','× 8','× 4','× 2']
   assert '🍇' in ''.join(await page.locator('.spin-odds-symbol>span').all_text_contents())
   assert await page.locator('.spin-odds-scroll tbody tr').count()==7
   assert await page.locator('.spin-odds-scroll tbody tr').last.locator('td').all_text_contents()==['4,000','6,000','8,000','12,000','16,000','24,000','32,000']
   assert await page.locator('.spin-odds-scroll').evaluate('(el)=>el.scrollWidth>el.clientWidth')
   await page.screenshot(path=f'/tmp/emojin-slot-odds-{WIDTH}.png')
   await page.locator('.spin-odds-scroll').scroll_into_view_if_needed()
   await page.locator('.spin-odds-scroll').evaluate('(el)=>el.scrollLeft=el.scrollWidth')
   assert await page.locator('.spin-odds-scroll').evaluate('(el)=>el.scrollLeft>0')
   assert await page.evaluate('''()=>{const d=document.querySelector('.spin-odds-dialog').getBoundingClientRect(),x=document.querySelector('.spin-odds-close').getBoundingClientRect(),s=document.querySelector('.spin-odds-scroll').getBoundingClientRect(),n=document.querySelector('.spin-odds-scroll tbody th').getBoundingClientRect();return x.top>=d.top&&x.bottom<=d.bottom&&n.left>=s.left-1&&n.right<=s.right;}''')
   await page.screenshot(path=f'/tmp/emojin-slot-odds-any-{WIDTH}.png')
   await page.locator('.spin-odds-close').click();assert await page.locator('.moji-spin-panel').is_visible()
   assert await page.locator('#spinWallet').text_content()=='2,000'

   # Slow settlement: the display subtracts only the bet and the reels keep turning.
   await page.evaluate('holdSave=true')
   await page.locator('#slotSpinButton').click()
   await page.wait_for_function('!!window.releaseSave')
   assert await page.locator('#spinWallet').text_content()=='1,992'
   assert await page.locator('#spinWin').text_content()=='0'
   assert await page.locator('#slotOddsButton').is_disabled()
   assert await page.locator('.moji-spin-panel .modal-close').is_disabled()
   await page.wait_for_timeout(1200)
   assert await page.locator('.spin-cell.spinning').count()==9
   assert await page.locator('.spin-cell.winning').count()==0
   await page.evaluate('releaseSave()');await idle(page)
   assert await page.locator('#spinWin').text_content()=='12'
   assert await page.locator('#spinWallet').text_content()=='2,004'
   assert 'ANY BONUS' in await page.locator('#spinWinBanner').text_content()
   assert await page.locator('#spinLines line').count()==0
   assert await page.locator('.spin-cell.winning').count()==6
   await page.screenshot(path=f'/tmp/emojin-slot-any-{WIDTH}.png')

   # 40 on the trigger + 100 during free spins; keep settled balance hidden until total closes.
   await page.evaluate('holdSave=false;holdFinish=true')
   await page.locator('#slotSpinButton').click()
   await page.wait_for_selector('.spin-wheel-wrap')
   assert await page.locator('#spinWinLabel').text_content()=='TOTAL WIN'
   assert await page.locator('#spinWin').text_content()=='40'
   assert await page.locator('#spinWallet').text_content()=='1,996'
   assert await page.locator('.spin-cell.bonus-trigger').count()==0
   await page.locator('.spin-wheel-wrap').click()
   await page.wait_for_selector('.spin-total')
   assert await page.locator('.spin-total b').text_content()=='140'
   assert await page.locator('#spinWin').text_content()=='140'
   assert await page.locator('#spinWallet').text_content()=='1,996'
   assert await page.locator('#slotSpinButton').is_disabled()
   await page.screenshot(path=f'/tmp/emojin-slot-total-{WIDTH}.png')
   await page.locator('.spin-total').click()
   await page.wait_for_function('!!window.releaseFinish')
   assert await page.locator('#spinWallet').text_content()=='2,136'
   assert await page.locator('#slotSpinButton').is_disabled()
   await page.evaluate('releaseFinish()');await idle(page)
   assert await page.locator('#spinWin').text_content()=='140'
   assert await page.locator('#spinWinLabel').text_content()=='TOTAL WIN'

   # Next normal spin resets the label, win and all highlights before its result.
   await page.evaluate('holdSave=true;holdFinish=false;window.releaseSave=null')
   await page.locator('#slotSpinButton').click()
   await page.wait_for_function('!!window.releaseSave')
   assert await page.locator('#spinWin').text_content()=='0'
   assert await page.locator('#spinWinLabel').text_content()=='WIN'
   assert await page.locator('.spin-cell.winning').count()==0
   await page.evaluate('releaseSave()');await idle(page)
   assert await page.locator('#spinWallet').text_content()=='2,128'
   assert await page.locator('#spinWin').text_content()=='0'

   # A saved v1 round resumes automatically without another draw, save or new-rule payout.
   await page.locator('.moji-spin-panel .modal-close').click()
   await page.wait_for_function("document.querySelector('#modalHost').classList.contains('hidden')")
   await page.evaluate('''()=>{const balanceBefore=mockCloud.wallet.balance;
    mockCloud.wallet.balance=balanceBefore-8+fixture.old.total;
    mockCloud.active={round:fixture.old,balanceBefore,balanceAfter:mockCloud.wallet.balance};}''')
   await page.locator('#mojiSpinButton').click()
   await page.wait_for_function("audit.finishes.includes('slot-legacy')")
   await idle(page)
   assert await page.locator('#spinWin').text_content()=='160'
   assert await page.evaluate('audit.draws')==3
   assert len(await page.evaluate('audit.saves'))==3

   # Maximum possible round exercises large totals without overlapping the wallet.
   await page.evaluate('holdSave=false')
   await page.locator('#slotSpinButton').click()
   await page.wait_for_selector('.spin-wheel-wrap');await page.locator('.spin-wheel-wrap').click()
   await page.wait_for_selector('.spin-total')
   assert await page.locator('.spin-total b').text_content()=='2,185,008'
   await page.locator('.spin-total').click();await idle(page)
   layout=await page.evaluate('''()=>{
    const win=document.querySelector('.spin-stats').getBoundingClientRect(),wallet=document.querySelector('.spin-wallet').getBoundingClientRect(),value=document.querySelector('#spinWallet'),panel=document.querySelector('.moji-spin-panel').getBoundingClientRect();
    return {separated:win.right<=wallet.left,inside:wallet.right<=panel.right&&win.left>=panel.left,noOverflow:value.scrollWidth<=value.clientWidth+1,metrics:{wallet:wallet.width,client:value.clientWidth,scroll:value.scrollWidth,font:getComputedStyle(value).fontSize}};}''')
   await page.screenshot(path=f'/tmp/emojin-slot-max-{WIDTH}.png')
   assert all(layout[k] for k in ['separated','inside','noOverflow']),layout

   # A settled v2 free sequence also resumes without charging or adding the award again.
   await page.locator('.moji-spin-panel .modal-close').click()
   await page.wait_for_function("document.querySelector('#modalHost').classList.contains('hidden')")
   await page.evaluate('''()=>{window.recoveryBalance=mockCloud.wallet.balance;
    const round={...fixture.rounds[1],id:'slot-v2-recover'};
    mockCloud.active={round,balanceBefore:recoveryBalance-round.total+round.bet,balanceAfter:recoveryBalance};}''')
   await page.locator('#mojiSpinButton').click()
   await page.wait_for_selector('.spin-wheel-wrap')
   assert await page.locator('#spinWin').text_content()=='40'
   await page.locator('.spin-wheel-wrap').click();await page.wait_for_selector('.spin-total')
   assert await page.locator('.spin-total b').text_content()=='140'
   await page.locator('.spin-total').click();await idle(page)
   assert await page.evaluate('mockCloud.wallet.balance===recoveryBalance')
   audit=await page.evaluate('audit')
   assert audit['draws']==4 and len(audit['saves'])==4
   assert audit['finishes']==['slot-any','slot-free','slot-none','slot-legacy','slot-max','slot-v2-recover']
   for frame in audit['frames']:
    expected=frame['spin'].get('winningCells',sorted({i for win in frame['spin']['wins'] for i in win['indices']}))
    assert frame['winning']==expected,(frame['winning'],expected)
    assert frame['lines']==len(frame['spin']['wins'])
   assert any(f['total']==40 for f in audit['frames']) and any(f['total']==140 for f in audit['frames'])
   assert 3000 in audit['animations'] and 500 in audit['delays'] and 1000 in audit['delays']
   assert not errors,errors
   print(f'PASS {WIDTH}x{HEIGHT}: ANY-only/mixed highlights, paytable, slow save, 40+100 TOTAL WIN, final total retention/reset, v1/v2 auto-resume, no duplicate save/draw, max payout layout')
   await browser.close()
 finally:server.shutdown()

asyncio.run(main())
