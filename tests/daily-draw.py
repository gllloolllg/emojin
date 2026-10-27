"""Local daily-draw UI, entry ordering and interrupted-session regression. No Firebase traffic."""
import asyncio,functools,http.server,importlib.util,json,sys,threading,subprocess
from pathlib import Path
from playwright.async_api import async_playwright
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/slot-any-bonus.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
BATTLE_JS=r'''
const fs=require('fs'),vm=require('vm'),c={};vm.createContext(c);const source=fs.readFileSync('app.js','utf8');vm.runInContext(source.slice(0,source.indexOf('/* MOJI SPIN:')),c);const E=c.EmojinEngine;
const e=(id,face)=>({id,ownerUid:id,ownerName:id,name:id,emoji:'🐸',maxHp:8,currentHp:8,status:'active',stars:0,defeats:0,rulesVersion:4,recordVersion:0,slots:Array(6).fill(face),poisoned:false,cursedSlots:[],createdAt:1,endedAt:null});
console.log(JSON.stringify({...E.battle(e('me','strong'),e('other','blank'),E.seeded(1),1,'daily-before'),seq:1}));
'''
MOCK=r'''
window.dailyNow=Number(localStorage.getItem('test.daily.now'))||Date.parse('2026-10-27T03:00:00Z');Date.now=()=>dailyNow;
window.realDailyTimes=innerWidth===390&&!localStorage.getItem('test.daily.animated');
'''+base.MOCK.replace('duration:Math.min(options.duration||0,8)',"duration:(window.realDailyTimes&&(this.closest('.daily-draw-panel')||this.classList.contains('daily-award-flight')))?(options.duration||0):Math.min(options.duration||0,8)")+r'''
audit.dailyClaims=[];audit.dailyDraws=0;audit.dailyLookups=0;audit.dailyReveal=0;
window.dailyLedger=JSON.parse(localStorage.getItem('test.daily.ledger')||'{}');
window.dailyRewards=[{kind:'moji',amount:100,rare:false},{kind:'hatch',amount:1,rare:false},{kind:'moji',amount:500,rare:true}];
window.holdDailySave=false;window.holdDailyResponse=false;window.failDailyClaim=false;
if(entryMode==='already-claimed'){
 const day=new Date(dailyNow+9*3600000).toISOString().slice(0,10),round={version:1,day,rewards:structuredClone(dailyRewards)};
 dailyLedger[day]={kind:'dailyDraw',round,choice:0,reward:round.rewards[0],moji:100,hatch:0,at:dailyNow-1000};
}
mockCloud.wallet.balance=Number(localStorage.getItem('test.daily.balance'))||2000;
mockCloud.hatch=Number(localStorage.getItem('test.daily.hatch'))||0;mockCloud.hatchPending=Number(localStorage.getItem('test.daily.hatchPending'))||0;
mockCloud.getAnnouncements=async()=>[];
mockCloud.revealHatch=()=>{mockCloud.hatchPending=Math.max(0,mockCloud.hatchPending-1);localStorage.setItem('test.daily.hatchPending',String(mockCloud.hatchPending));audit.dailyReveal++;};
mockCloud.getDailyDraw=async day=>{
 audit.dailyLookups++;
 if(entryMode==='other-tab-completed')localStorage.setItem('emojin.dailyMoji.emojin-49855.me',JSON.stringify({day,phase:'done'}));
 return dailyLedger[day]?structuredClone(dailyLedger[day]):null;
};
mockCloud.claimDailyDraw=async(round,choice)=>{
 audit.dailyClaims.push({round:structuredClone(round),choice});
 if(failDailyClaim)throw Error('offline');
 if(holdDailySave)await new Promise(resolve=>window.releaseDailySave=resolve);
 if(!dailyLedger[round.day]){
  const reward=round.rewards[choice],moji=reward.kind==='moji'?reward.amount:0,hatch=reward.kind==='hatch'?Math.min(1,10-mockCloud.hatch):0;
  mockCloud.wallet.balance+=moji;mockCloud.hatch+=hatch;mockCloud.hatchPending+=hatch;
  dailyLedger[round.day]={kind:'dailyDraw',round:structuredClone(round),choice,reward:structuredClone(reward),moji,hatch,at:Date.now()};
  localStorage.setItem('test.daily.ledger',JSON.stringify(dailyLedger));localStorage.setItem('test.daily.balance',String(mockCloud.wallet.balance));
  localStorage.setItem('test.daily.hatch',String(mockCloud.hatch));localStorage.setItem('test.daily.hatchPending',String(mockCloud.hatchPending));
  window.dispatchEvent(new Event('emojin-wallet'));
 }
 if(holdDailyResponse)await new Promise(resolve=>window.releaseDailyResponse=resolve);
 return structuredClone(dailyLedger[round.day]);
};
player.tutorialSeen=!entryMode.startsWith('tutorial');mockCloud.markTutorialSeen=async()=>{player.tutorialSeen=true;};
if(entryMode==='tutorial-stale'){
 const oldState=mockCloud.getState;mockCloud.getState=async()=>({...await oldState(),player:{...player,tutorialSeen:false}});
 mockCloud.markTutorialSeen=()=>new Promise(()=>{});
}
if(entryMode==='battle'||entryMode==='battle-arrival'){
 if(entryMode==='battle')player.unreadBattleIds=[fixtureBattle.battleId];
 let stateCalls=0;
 const getStateOriginal=mockCloud.getState;mockCloud.getState=async()=>{
  const state=await getStateOriginal();stateCalls++;
  if(entryMode==='battle-arrival'&&stateCalls===1)return state;
  if(player.seenBattleSeq<1)player.unreadBattleIds=[fixtureBattle.battleId];
  return {...state,emojins:fixtureBattle.after,battles:[fixtureBattle],nextSeq:2};
 };
 mockCloud.markSeen=async({battleIds=[],battleSeq=0})=>{player.unreadBattleIds=player.unreadBattleIds.filter(id=>!battleIds.includes(id));player.seenBattleSeq=Math.max(player.seenBattleSeq,battleSeq);};
}
'''
async def main():
 battle=json.loads(subprocess.check_output(['node','-e',BATTLE_JS],cwd=ROOT,text=True))
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(base.Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   source=(ROOT/'app.js').read_text().replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{')
   source=source.replace('/* Firebase configuration is public.',r'''
const dailyOriginal=window.DailyMojiDraw;
window.DailyMojiDraw=Object.freeze({...dailyOriginal,createRound(day){audit.dailyDraws++;return {version:1,day,rewards:structuredClone(dailyRewards)};}});
/* Firebase configuration is public.''')
   source=source.replace('await delay(800);','await delay(window.realDailyTimes?800:10);')
   source=source.replace('const wait = ms / replaySpeed;','const wait = Math.min(ms / replaySpeed,12);')
   source=source.replace('init().catch(err=>{','window.dailyMaybeForTest=maybeDailyDraw;\ninit().catch(err=>{')
   async def context(width,height,mode='normal'):
    ctx=await browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,service_workers='block',reduced_motion='reduce' if width==320 else 'no-preference')
    await ctx.add_init_script('window.entryMode='+json.dumps(mode)+';window.fixtureBattle='+json.dumps(battle)+';'+MOCK)
    await ctx.route('https://**/*',lambda r:r.abort());await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))
    page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/');return ctx,page,errors
   async def choose_ready(page):
    await page.wait_for_function("document.querySelectorAll('.daily-gift-button:not(:disabled)').length===3",timeout=20000)
   async def award_ready(page):
    await page.wait_for_function("document.querySelector('.daily-help')?.textContent.includes('タップして、ほか')",timeout=20000)
   async def finish_round(page):
    await page.locator('.daily-result').tap()
    await page.wait_for_selector('.daily-gifts.is-summary')
    await page.locator('.daily-gift-button').evaluate_all('async els=>{await Promise.all(els.flatMap(el=>el.getAnimations().map(a=>a.finished.catch(()=>{}))));}')
    await page.locator('.daily-stage').tap()
    await page.wait_for_function("!document.querySelector('.daily-draw-panel')")
   async def next_day(page):
    await page.evaluate("dailyNow+=86400000;localStorage.setItem('test.daily.now',String(dailyNow));void dailyMaybeForTest()")
    await choose_ready(page)
   for width,height in [(390,844),(320,568)]:
    ctx,page,errors=await context(width,height);await choose_ready(page)
    assert await page.locator('.daily-title').text_content()=='きょうのモジくじ'
    assert await page.locator('.daily-title').evaluate("el=>getComputedStyle(el).fontFamily.includes('Monomaniac One')")
    assert await page.locator('.daily-draw-panel').evaluate("el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.borderWidth==='0px'&&s.backgroundColor==='rgba(0, 0, 0, 0)'&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}")
    assert await page.locator('#modalHost>.modal-backdrop').evaluate("el=>getComputedStyle(el).backgroundColor==='rgba(0, 0, 0, 0.733)'")
    assert await page.locator('.daily-gift-symbol').all_text_contents()==['🎁','🎁','🎁']
    assert await page.evaluate('audit.dailyDraws')==1
    await page.screenshot(path=f'/tmp/emojin-daily-choose-{width}.png')
    await page.evaluate('holdDailySave=true');await page.locator('.daily-gift-button').nth(0).tap()
    await page.wait_for_function('typeof releaseDailySave==="function"');await page.wait_for_timeout(1700 if width==390 else 60)
    assert await page.locator('.daily-result').is_hidden()
    assert await page.locator('.daily-gift-button:not(:disabled)').count()==0
    await page.locator('.daily-gift-button').nth(2).dispatch_event('click');assert await page.evaluate('audit.dailyClaims.length')==1
    assert await page.evaluate('mockCloud.wallet.balance')==2000
    await page.evaluate('holdDailySave=false;releaseDailySave()');await award_ready(page)
    assert await page.evaluate('mockCloud.wallet.balance')==2100 and await page.evaluate('mockCloud.hatch')==0
    assert await page.locator('.daily-result strong').text_content()=='100モジ'
    assert await page.locator('.mo-reading').evaluate("el=>getComputedStyle(el).visibility==='hidden'")
    await page.screenshot(path=f'/tmp/emojin-daily-money-{width}.png')
    await page.locator('.daily-result').tap();await page.wait_for_selector('.daily-gifts.is-summary')
    await page.locator('.daily-gift-button').evaluate_all('async els=>{await Promise.all(els.flatMap(el=>el.getAnimations().map(a=>a.finished.catch(()=>{}))));}')
    assert await page.locator('.daily-gifts .daily-reward').count()==3
    assert await page.locator('.daily-gift-button.is-chosen').count()==1
    assert await page.locator('.daily-gifts strong').all_text_contents()==['100モジ','孵化ポイント＋1','500モジ']
    assert await page.evaluate('new Set([...document.querySelectorAll("[id]")].map(el=>el.id)).size===document.querySelectorAll("[id]").length')
    await page.screenshot(path=f'/tmp/emojin-daily-all-{width}.png')
    await page.locator('.daily-stage').tap();await page.wait_for_function("!document.querySelector('.daily-draw-panel')")
    await page.evaluate("realDailyTimes=false;localStorage.setItem('test.daily.animated','1')")
    await page.reload();await page.wait_for_function("document.querySelector('#bootScreen').classList.contains('hidden')");await page.wait_for_timeout(100)
    assert await page.locator('.daily-draw-panel').count()==0;assert await page.evaluate('audit.dailyDraws+audit.dailyClaims.length')==0
    # Tomorrow: yellow orb flies to the gauge and reveals just one pending point.
    await next_day(page);await page.locator('.daily-gift-button').nth(1).tap();await award_ready(page)
    assert await page.evaluate('mockCloud.hatch')==1 and await page.evaluate('mockCloud.hatchPending')==0
    assert await page.evaluate('audit.dailyReveal')==1
    await page.screenshot(path=f'/tmp/emojin-daily-hatch-{width}.png');await finish_round(page)
    # Full gauge has no effect. Then high balances and two hatch normals remain valid.
    await page.evaluate('mockCloud.hatch=10;mockCloud.hatchPending=0');await next_day(page)
    await page.locator('.daily-gift-button').nth(1).tap();await award_ready(page)
    assert '満タン' in await page.locator('.daily-help').text_content();assert await page.evaluate('mockCloud.hatch')==10
    assert await page.evaluate('audit.dailyReveal')==1;await finish_round(page)
    await page.evaluate("mockCloud.wallet.balance=4000;dailyRewards=[{kind:'hatch',amount:1,rare:false},{kind:'hatch',amount:1,rare:false},{kind:'moji',amount:600,rare:true}]")
    await next_day(page);await page.locator('.daily-gift-button').nth(2).tap();await award_ready(page)
    assert await page.evaluate('mockCloud.wallet.balance')==4600;assert await page.evaluate('mockCloud.hatch')==10;await finish_round(page)
    # Quit before settlement: the same round/choice auto-resumes, without a fresh draw.
    await page.evaluate("dailyRewards=[{kind:'moji',amount:100,rare:false},{kind:'hatch',amount:1,rare:false},{kind:'moji',amount:500,rare:true}]")
    await next_day(page);await page.evaluate('holdDailySave=true');await page.locator('.daily-gift-button').nth(0).tap()
    await page.wait_for_function('typeof releaseDailySave==="function"');await page.reload();await award_ready(page)
    assert await page.evaluate('audit.dailyDraws')==0 and await page.evaluate('audit.dailyClaims.length')==1
    assert await page.locator('.daily-result strong').text_content()=='100モジ';assert await page.evaluate('mockCloud.wallet.balance')==4700;await finish_round(page)
    # Saved but response lost: receipt replay never pays or draws again.
    await next_day(page);await page.evaluate('holdDailyResponse=true');await page.locator('.daily-gift-button').nth(2).tap()
    await page.wait_for_function('typeof releaseDailyResponse==="function"');await page.reload();await award_ready(page)
    assert await page.evaluate('audit.dailyDraws+audit.dailyClaims.length')==0
    assert await page.locator('.daily-result strong').text_content()=='500モジ';assert await page.evaluate('mockCloud.wallet.balance')==5200;await finish_round(page)
    # Recoverable error retains the chosen box, then retries the exact same round.
    await next_day(page);await page.evaluate('failDailyClaim=true');await page.locator('.daily-gift-button').nth(0).tap()
    await page.wait_for_selector('.daily-retry');await page.evaluate('failDailyClaim=false');await page.locator('.daily-retry').tap();await award_ready(page)
    assert await page.locator('.daily-result strong').text_content()=='100モジ';assert await page.evaluate('mockCloud.wallet.balance')==5300;await finish_round(page)
    # "Later" closes a failed event without rerolling or reopening it every idle tick.
    await next_day(page);await page.evaluate('failDailyClaim=true');await page.locator('.daily-gift-button').nth(1).tap()
    await page.wait_for_selector('.daily-later');await page.locator('.daily-later').tap();await page.wait_for_function("!document.querySelector('.daily-draw-panel')")
    await page.evaluate('void dailyMaybeForTest()');assert await page.locator('.daily-draw-panel').count()==0
    await page.reload();await award_ready(page)
    assert await page.evaluate('audit.dailyDraws')==0 and await page.evaluate('audit.dailyClaims[0].choice')==1
    assert await page.evaluate('mockCloud.wallet.balance')==5300;await finish_round(page)
    assert await page.evaluate('Object.keys(dailyLedger).length')==8
    assert await page.locator('.daily-award-flight,.daily-confetti').count()==0
    assert not errors,errors
    print(f'PASS {width}x{height}: windowless three gifts, saved result gating, one chosen award, two-tap reveal/close, JST next day, full hatch, >3000, pending/committed recovery, retry without reroll, SVG IDs and cleanup',flush=True)
    await ctx.close()
   for mode in ['battle','battle-arrival','tutorial','tutorial-stale']:
    ctx,page,errors=await context(390,844,mode)
    if mode.startswith('battle'):
     await page.wait_for_selector('#battleScreen:not(.hidden)');assert await page.locator('.daily-draw-panel').count()==0
     if mode=='battle':assert await page.evaluate('audit.dailyLookups')==0
     assert await page.evaluate('audit.dailyDraws')==0
     await page.locator('#skipButton').tap();await page.wait_for_function("!document.querySelector('#battleNext').disabled")
     assert await page.locator('.daily-draw-panel').count()==0;await page.locator('#battleNext').tap()
    else:
     await page.wait_for_selector('#tutorial:not(.hidden)');assert await page.evaluate('audit.dailyLookups')==0
     for _ in range(25):
      if await page.locator('#tutorial').is_hidden():break
      await page.locator('#tutorial').tap();await page.wait_for_timeout(20)
    await choose_ready(page)
    assert await page.locator('#battleScreen').is_hidden() and await page.locator('#tutorial').is_hidden()
    assert not errors,errors
    print('PASS daily event waits until '+mode+' has finished',flush=True);await ctx.close()
   for mode in ['already-claimed','other-tab-completed']:
    ctx,page,errors=await context(390,844,mode)
    await page.wait_for_function("document.querySelector('#bootScreen').classList.contains('hidden')");await page.wait_for_timeout(100)
    assert await page.locator('.daily-draw-panel').count()==0
    assert await page.evaluate('audit.dailyDraws+audit.dailyClaims.length')==0
    assert not errors,errors
    print('PASS '+mode+' does not start or pay another draw',flush=True);await ctx.close()
   await browser.close()
 finally:server.shutdown()
if __name__=='__main__':asyncio.run(main())
