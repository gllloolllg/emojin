"""Local mocked-cloud UI: latest vote must replay/settle before the next round."""
import asyncio,functools,http.server,importlib.util,json,subprocess,threading
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('base',ROOT/'tests/slot-any-bonus.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
FIXTURE=r'''
const fs=require('fs'),vm=require('vm');const c={};vm.createContext(c);const s=fs.readFileSync('app.js','utf8');vm.runInContext(s.slice(0,s.indexOf('/* Firebase configuration is public.')),c);
const D=c.DailyBattle,E=c.EmojinEngine,day=D.currentDay(),at=Date.parse(day+'T12:00:00+09:00'),older=D.dayKey(at-3*86400000),prior=D.dayKey(at-86400000),next=D.dayKey(at+86400000);
function pair(day){const secret=D.create(day,E.seeded(42));secret.fighters[0].slots=Array(6).fill('attack2');secret.fighters[1].slots=Array(6).fill('blank');return secret;}
const secret=pair(day),nextSecret=pair(next);secret.openAt=Date.now()-3600000;secret.closeAt=Date.now()+3600000;nextSecret.openAt=Date.now()-3600000;
console.log(JSON.stringify({day,older,prior,next,battles:{[day]:D.publicBattle(secret),[older]:D.settle(pair(older)),[prior]:D.settle(pair(prior)),[next]:D.publicBattle(nextSecret)},finished:D.settle(secret)}));
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
if(!localStorage.getItem('emojin.battleSpeed'))localStorage.setItem('emojin.battleSpeed','4');
window.dailyData={targetDay:dailyFixture.day,battles:structuredClone(dailyFixture.battles),player:{uid:'me',day:dailyFixture.older,choice:0,settled:false},claims:{},claimCalls:0,lossCalls:0,speeds:[],fetches:[],failClaim:true};
mockCloud.wallet.balance=4000;
mockCloud.getDailyBattle=async day=>{dailyData.fetches.push(day);return structuredClone(dailyData.battles[day]);};
mockCloud.getDailyBattlePlayer=async()=>structuredClone(dailyData.player);
mockCloud.voteDailyBattle=async(day,choice)=>{const old=dailyData.player;if(old?.day===day)return structuredClone(old);if(old&&!old.settled)throw Error('前回を先に完了してください');return dailyData.player={uid:'me',day,choice,settled:false};};
mockCloud.completeLosingDailyBattle=async day=>{dailyData.lossCalls++;if(dailyData.player.day===day)dailyData.player.settled=true;};
mockCloud.claimDailyBattle=async day=>{dailyData.claimCalls++;if(dailyData.failClaim)throw Error('mock network failure');if(!dailyData.claims[day]){dailyData.claims[day]={amount:300};mockCloud.wallet.balance+=300;dailyData.player.settled=true;}return dailyData.claims[day];};
'''
    await ctx.add_init_script(mock);await ctx.route('https://**/*',lambda r:r.abort())
    source=base.SOURCE.replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{')
    source=source.replace('function currentDay(at=Date.now()){return dayKey(at+5.5*3600000);}','function currentDay(at=Date.now()){return window.dailyData?.targetDay||dayKey(at+5.5*3600000);}')
    source=source.replace('const wait = ms / replaySpeed;','dailyData.speeds.push(replaySpeed);const wait = Math.min(ms / replaySpeed,12);')
    source=source.replace('async function revealDailySlots(log){','async function revealDailySlots(log){await new Promise(resolve=>window.dailyStartReveal=resolve);')
    source=source.replace('function installSlotButton(){','window.openDailyTest=showDailyBattle;\nfunction installSlotButton(){')
    await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))
    page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    async def start():
     await page.wait_for_selector('#bootScreen',state='hidden');await page.locator('#dailyBattleButton').click();await page.wait_for_function('!!window.dailyStartReveal')
    async def release():
     await page.evaluate('window.dailyStartReveal();window.dailyStartReveal=null')
    await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/');await start()
    assert await page.evaluate('dailyData.fetches')==[fixture['older']]
    assert await page.locator('#skipButton').is_hidden();assert await page.locator('#skipButton').is_disabled()
    speed=page.locator('#speedButton');assert await speed.is_visible();assert await speed.text_content()=='4×'
    pos=await speed.bounding_box();assert pos['x']>width/2 and pos['y']<80
    await speed.click();assert await speed.text_content()=='1×'
    await speed.click();assert await speed.text_content()=='2×'
    assert await page.evaluate("localStorage.getItem('emojin.battleSpeed')")=='2'
    await page.screenshot(path=f'/tmp/emojin-daily-speed-{width}.png')
    assert await page.locator('.daily-replay .record-badge').count()==0
    await release();await page.wait_for_selector('#dailyClaim',timeout=20000)
    assert await page.locator('#dailyContent').get_attribute('data-day')==fixture['older']
    assert await page.locator('#dailyHistory').count()==0
    assert await page.locator('.daily-vote').count()==0
    assert await page.locator('.daily-battle-panel .modal-close').count()==0
    await page.screenshot(path=f'/tmp/emojin-daily-required-prize-{width}.png')
    await page.locator('#dailyClaim').click();await page.wait_for_function('dailyData.claimCalls===1');await page.wait_for_function('!document.querySelector("#dailyClaim").disabled')
    assert await page.evaluate('dailyData.player.settled')==False
    assert await page.evaluate('dailyData.fetches.includes(dailyFixture.day)')==False
    # A reload must still prioritize the old unreceived vote with no local seen flag.
    await page.reload();await start();assert await page.locator('#speedButton').text_content()=='2×';await release();await page.wait_for_selector('#dailyClaim',timeout=20000)
    await page.evaluate('dailyData.failClaim=false');await page.locator('#dailyClaim').click();await page.wait_for_selector('.daily-vote:enabled')
    assert await page.evaluate('mockCloud.wallet.balance')==4300
    assert await page.locator('#dailyContent').get_attribute('data-day')==fixture['day']
    assert await page.locator('.daily-secret').count()==6
    await page.wait_for_timeout(50)
    panel=page.locator('.daily-battle-panel');bounds=await panel.bounding_box()
    assert abs(bounds['x'])<1 and abs(bounds['y'])<1 and abs(bounds['width']-width)<1 and abs(bounds['height']-height)<1,bounds
    assert await page.locator('.daily-date').count()==0
    assert await page.locator('.daily-heading h2').evaluate("el=>getComputedStyle(el).fontFamily.includes('Monomaniac One')")
    title=await page.locator('.daily-heading h2').bounding_box();assert abs(title['x']+title['width']/2-width/2)<1
    close=await panel.locator('.modal-close').bounding_box();assert close['x']>width*.75
    assert await page.locator('#dailyCenter strong').evaluate("el=>parseFloat(getComputedStyle(el).fontSize)>=42&&getComputedStyle(el).fontFamily.includes('monospace')")
    assert await page.locator('#dailyCenter strong').evaluate("""el=>{
      const original=el.textContent,boxes=[],glyphs=[];
      for(const text of ['11:11:11','00:00:00','23:59:59']){
        el.textContent=text;const box=el.getBoundingClientRect();boxes.push({left:box.left,width:box.width});
        for(let i=0;i<text.length;i++){const range=document.createRange();range.setStart(el.firstChild,i);range.setEnd(el.firstChild,i+1);glyphs.push(range.getBoundingClientRect().width);}
      }
      el.textContent=original;
      return boxes.every(b=>Math.abs(b.left-boxes[0].left)<.1&&Math.abs(b.width-boxes[0].width)<.1)&&Math.max(...glyphs)-Math.min(...glyphs)<.1;
    }""")
    assert await page.locator('.daily-vote small').count()==0
    icons=await page.locator('.daily-vote>span').all_text_contents()
    left=fixture['battles'][fixture['day']]['fighters'][0];right=fixture['battles'][fixture['day']]['fighters'][1]
    assert icons==[left['emoji']+'💪',left['emoji'],'🌀',right['emoji'],right['emoji']+'💪']
    prompts=[left['name']+'が圧勝すると300モジGET',left['name']+'が勝利すると100モジGET','引き分けると300モジGET',right['name']+'が勝利すると100モジGET',right['name']+'が圧勝すると300モジGET']
    space=await page.locator('.daily-vote-space').bounding_box();assert space['height']>=140
    buttons=await page.locator('.daily-votes').bounding_box()
    assert buttons['y']+buttons['height']<=height,buttons
    await page.locator('#toast').wait_for(state='hidden')
    await page.screenshot(path=f'/tmp/emojin-daily-red-empty-{width}.png')
    for i in range(5):
     await page.locator(f'[data-daily-choice="{i}"]').tap();assert await page.locator('#dailyVotePopup').is_visible();assert await page.locator('.daily-vote:enabled').count()==5
     assert await page.locator('#dailyVotePopup p').text_content()==prompts[i]
     moved=await page.locator('.daily-votes').bounding_box();assert abs(moved['y']-buttons['y'])<1
    await page.wait_for_timeout(250)
    await page.locator('[data-daily-choice="1"]').tap();await page.wait_for_timeout(250);await page.screenshot(path=f'/tmp/emojin-daily-next-vote-{width}.png')
    await page.locator('#dailyConfirmVote').tap();await page.wait_for_selector('.daily-vote.chosen');assert await page.locator('.daily-vote:disabled').count()==5
    # After 18:30, the next round is available, but the previous losing vote replays first.
    await page.evaluate('()=>{dailyData.battles[dailyFixture.day]=dailyFixture.finished;dailyData.targetDay=dailyFixture.next;openDailyTest();}')
    await page.wait_for_function('!!window.dailyStartReveal');await release()
    await page.wait_for_function('dailyData.lossCalls===1');await page.wait_for_selector('.daily-vote:enabled')
    assert await page.locator('#dailyContent').get_attribute('data-day')==fixture['next']
    assert await page.locator('#dailyClaim').count()==0
    assert await page.evaluate('dailyData.speeds.length>0&&dailyData.speeds.every(s=>s===2)')
    assert await page.evaluate('audit.animations.includes(425)')
    assert await page.evaluate("localStorage.getItem('emojin.battleSpeed')")=='2'
    assert await page.evaluate("Object.keys(localStorage).filter(k=>k.includes('dailyBattle')).length")==0
    await page.locator('.daily-battle-panel .modal-close').click();await page.wait_for_selector('.daily-battle-panel',state='detached')
    await page.locator('#mojiSpinButton').click();await page.wait_for_selector('.moji-spin-panel')
    assert await page.locator('#modalHost').evaluate("el=>!el.classList.contains('daily-battle-host')")
    assert not errors,errors
    print(f'PASS {width}: latest participated round prioritized, saved-speed replay with speed controls and no skip, forced prize/retry/reload, next-vote gate, losing completion, no history/local flags')
    await ctx.close()
   await browser.close()
 finally:server.shutdown()
asyncio.run(main())
