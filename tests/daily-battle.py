"""Mocked-cloud Daily Battle mobile UI; no external requests or production writes."""
import asyncio,functools,http.server,importlib.util,json,subprocess,threading
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('base',ROOT/'tests/slot-any-bonus.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
FIXTURE=r'''
const fs=require('fs'),vm=require('vm');const c={};vm.createContext(c);const s=fs.readFileSync('app.js','utf8');vm.runInContext(s.slice(0,s.indexOf('/* Firebase configuration is public.')),c);
const D=c.DailyBattle,E=c.EmojinEngine,day=D.currentDay(),yesterday=D.dayKey(Date.now()-86400000-1800000),secret=D.create(day,E.seeded(42));
secret.fighters[0].slots=Array(6).fill('attack2');secret.fighters[1].slots=Array(6).fill('blank');
secret.closeAt=Date.now()+3600000;secret.openAt=Date.now()-3600000;
const finished=D.settle(secret),past={...finished,day:yesterday};
console.log(JSON.stringify({open:D.publicBattle(secret),finished,past,day,yesterday}));
'''
async def main():
 fixture=json.loads(subprocess.check_output(['node','-e',FIXTURE],cwd=ROOT,text=True))
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(base.Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   for width,height in [(390,844),(320,568)]:
    ctx=await browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,service_workers='block',reduced_motion='reduce')
    mock='window.dailyFixture='+json.dumps(fixture)+';'+base.MOCK+r'''
localStorage.setItem('emojin.battleSpeed','4');
window.dailyData={battle:dailyFixture.open,votes:[{uid:'me',day:dailyFixture.yesterday,choice:0}],claims:{},claimCalls:0,speeds:[]};
mockCloud.wallet.balance=4000;
mockCloud.getDailyBattle=async day=>structuredClone(day===dailyFixture.yesterday?dailyFixture.past:dailyData.battle);
mockCloud.getDailyBattleVotes=async()=>structuredClone(dailyData.votes);
mockCloud.getDailyBattleClaim=async day=>dailyData.claims[day]||null;
mockCloud.voteDailyBattle=async(day,choice)=>{const old=dailyData.votes.find(v=>v.day===day);if(old)return old;const vote={uid:'me',day,choice};dailyData.votes.push(vote);return vote;};
mockCloud.claimDailyBattle=async day=>{dailyData.claimCalls++;if(!dailyData.claims[day]){dailyData.claims[day]={amount:300};mockCloud.wallet.balance+=300;}return dailyData.claims[day];};
'''
    await ctx.add_init_script(mock);await ctx.route('https://**/*',lambda r:r.abort())
    source=base.SOURCE.replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{')
    source=source.replace('const wait = ms / replaySpeed;','dailyData.speeds.push(replaySpeed);const wait = Math.min(ms / replaySpeed,12);')
    source=source.replace('async function revealDailySlots(log){','async function revealDailySlots(log){await new Promise(resolve=>window.dailyStartReveal=resolve);')
    source=source.replace('function installSlotButton(){','window.openDailyTest=showDailyBattle;\nfunction installSlotButton(){')
    await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))
    page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/');await page.wait_for_selector('#bootScreen',state='hidden')
    launch=page.locator('#dailyBattleButton');await launch.click();await page.wait_for_selector('.daily-vote')
    assert await page.locator('.daily-secret').count()==6
    assert await page.locator('.daily-contestant .record-badge').count()==0
    assert 'バトル開始まで' in await page.locator('#dailyCenter').text_content()
    assert await page.locator('#dailyHistory').evaluate("el=>el.classList.contains('has-unseen')")
    for i in range(5):
     await page.locator(f'[data-daily-choice="{i}"]').tap()
     assert await page.locator('#dailyVotePopup').is_visible()
     assert await page.locator('.daily-vote:enabled').count()==5
    await page.locator('[data-daily-choice="0"]').tap()
    await page.screenshot(path=f'/tmp/emojin-daily-battle-vote-{width}.png')
    await page.locator('#dailyConfirmVote').tap();await page.wait_for_selector('.daily-vote.chosen')
    assert await page.locator('.daily-vote:disabled').count()==5
    await page.evaluate('dailyData.battle=dailyFixture.finished;openDailyTest()');await page.locator('#dailyReplay').click()
    await page.wait_for_function('!!window.dailyStartReveal')
    assert await page.locator('#skipButton').is_hidden()
    assert await page.locator('#speedButton').is_hidden()
    assert await page.locator('#battleCount').is_hidden()
    assert await page.locator('.daily-replay .record-badge').count()==0
    await page.screenshot(path=f'/tmp/emojin-daily-battle-replay-{width}.png')
    await page.evaluate('window.dailyStartReveal();window.dailyStartReveal=null')
    await page.wait_for_selector('#dailyClaim',timeout=20000)
    assert await page.evaluate('dailyData.speeds.every(s=>s===1)')
    assert await page.evaluate("localStorage.getItem('emojin.battleSpeed')")=='4'
    assert await page.locator('.daily-secret').count()==0
    assert await page.evaluate('mockCloud.wallet.balance')==4000
    await page.screenshot(path=f'/tmp/emojin-daily-battle-result-{width}.png')
    await page.locator('#dailyClaim').click();await page.wait_for_function('dailyData.claimCalls===1')
    assert await page.evaluate('mockCloud.wallet.balance')==4300
    await page.locator('#dailyHistory').click();await page.wait_for_selector('.daily-history-entry.unseen')
    await page.screenshot(path=f'/tmp/emojin-daily-battle-history-{width}.png')
    await page.locator('.daily-history-entry').click();await page.wait_for_function('!!window.dailyStartReveal');await page.evaluate('dailyStartReveal()');await page.wait_for_selector('#dailyClaim',timeout=20000)
    assert not errors,errors
    print(f'PASS {width}: 6 hidden faces, five switchable vote previews, immutable vote UI, history badge, x1 replay/reveal, claim after replay only, history replay')
    await ctx.close()
   await browser.close()
 finally:server.shutdown()
asyncio.run(main())
