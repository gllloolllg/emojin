"""Exercise actual loop continuation and rankings through the production iframe; mock services only."""
import asyncio,functools,http.server,importlib.util,threading,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/adventure.py');fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
async def finish_boss(frame):
 await frame.locator('body').evaluate('''()=>{
  const foe={...run.map.boss,currentHp:0,boss:true};run.busy=true;battleDraw(foe,1,'run');battleVisual=copy([run.player,foe]);window.loopFinish=finishBattle(foe,false);
 }''')
 await frame.locator('[data-phase="awaiting-tap"]').wait_for();await frame.locator('.battle-screen').tap()
 await frame.locator('.lap-clear').wait_for();await frame.locator('.lap-clear').tap()
 await frame.locator('.lap-clear[data-phase="ready"]').wait_for();await frame.locator('.lap-clear').tap()
 await frame.locator('.grand-chest').wait_for();await frame.locator('.grand-chest').tap()
 assert await frame.locator('.lap-reward[data-phase="opening"] .chest-lid').count()==0
 await frame.locator('.lap-reward[data-phase="choose"]').wait_for()
async def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(fixture.base.Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.webkit.launch() if '--webkit' in sys.argv else await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   for width,height in [(390,844),(320,568)]:
    ctx=await browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,service_workers='block');await ctx.add_init_script(fixture.MOCK);await ctx.route('https://**/*',lambda r:r.abort())
    source=fixture.base.SOURCE.replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{');await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))
    page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/');await page.wait_for_selector('#bootScreen',state='hidden')
    await page.evaluate('mockCloud.wallet.balance=200');await page.locator('#adventureButton').tap();frame=page.frame_locator('#adventureFrame');await frame.locator('#start:enabled').wait_for()
    await frame.locator('body').evaluate("()=>{CONFIG.startDarkMs=CONFIG.startDropMs=CONFIG.startHoldMs=CONFIG.startExitMs=1;}")
    await frame.locator('#start').tap();await frame.locator('.map-screen').wait_for()
    await frame.locator('body').evaluate('''()=>{
     run.floor=10;run.level=6;run.xp=2;run.bombs=3;run.player.maxHp=run.player.baseMaxHp+5;run.player.currentHp=4;run.player.poisoned=true;run.player.cursedSlots=[0];run.map=generateFloor(10,run.pos);run.pos=run.map.goal;drawMap();window.originalSlots=run.player.slots.slice();
    }''')
    await finish_boss(frame);assert await frame.locator('.reward-choice').count()==5
    assert await page.evaluate('savedResults.length')==0
    assert await frame.locator('.lap-reward-status .slot:not(button)').count()==1
    await page.screenshot(path=f'/tmp/adventure-loop-choice-{width}.png')
    reward=await frame.locator('.lap-reward-ability .ability-glyph>span').first.inner_text()
    await frame.locator('.reward-choice[data-slot="2"]').tap();await frame.locator('.depth-label').filter(has_text='ちか11').wait_for(timeout=10000)
    await frame.locator('.map-screen:not([data-transition])').wait_for()
    state=await frame.locator('body').evaluate('''()=>({floor:run.floor,score:run.score,hp:run.player.currentHp,max:run.player.maxHp,base:run.player.baseMaxHp,level:run.level,xp:run.xp,bombs:run.bombs,poison:run.player.poisoned,curses:run.player.cursedSlots,slots:run.player.slots,original:originalSlots,theme:document.documentElement.dataset.adventureAura,pos:run.pos})''')
    assert state['floor']==11 and state['score']==11300,state
    assert (state['hp'],state['max'],state['base'],state['level'],state['xp'],state['bombs'])==(4,12,7,6,2,3)
    assert not state['poison'] and not state['curses'];assert state['theme']=='green'
    assert all(state['slots'][i]==state['original'][i] for i in range(6) if i!=2)
    assert state['slots'][5]=='curse';assert await page.evaluate('starts.length')==1;assert await page.evaluate('mockCloud.wallet.balance')==100
    assert await frame.locator('.tower .floor.active').evaluate('e=>[...e.parentNode.children].indexOf(e)')==1
    await page.screenshot(path=f'/tmp/adventure-loop-floor11-{width}.png')
    # A failed read does not change floor, score or the paid run. Retrying draws a new legend.
    await page.evaluate("()=>{window.failLegend=true;const originalLegend=mockCloud.adventureLegend;mockCloud.adventureLegend=()=>failLegend?Promise.reject(Error('offline')):originalLegend();}")
    await frame.locator('body').evaluate('()=>{run.floor=19;run.map=generateFloor(19,run.pos);drawMap();window.nextTry=nextFloor();}')
    await frame.locator('.modal').wait_for();assert await frame.locator('body').evaluate('()=>run.floor')==19
    await page.evaluate('failLegend=false');await frame.locator('.modal button').tap();await frame.locator('.depth-label').filter(has_text='ちか20').wait_for();await frame.locator('.map-screen:not([data-transition])').wait_for()
    boss=await frame.locator('body').evaluate('()=>({name:run.map.boss.name,n:run.map.boss.bossN,hp:run.map.boss.maxHp})');assert boss=={'name':'べつのレジェンド1','n':2,'hp':40},boss
    assert await page.evaluate('legendDraws')==1
    await frame.locator('body').evaluate('()=>battleDraw({...run.map.boss,boss:true},1,"select")');assert await frame.locator('#quantity').inner_text()=='3';assert await frame.locator('#up').count()==0;assert await frame.locator('#turn').inner_text()=='1/30'
    await frame.locator('body').evaluate('()=>drawMap()');await finish_boss(frame);await frame.locator('.reward-choice[data-slot="0"]').tap();await frame.locator('.depth-label').filter(has_text='ちか21').wait_for(timeout=10000);await frame.locator('.map-screen:not([data-transition])').wait_for()
    assert await frame.locator('body').evaluate('()=>run.score')==63400
    assert await frame.locator('body').evaluate('()=>run.xp')==3
    assert await frame.locator('html').get_attribute('data-adventure-aura')=='purple'
    assert await page.evaluate('savedResults.length')==0
    await page.screenshot(path=f'/tmp/adventure-loop-floor21-{width}.png')
    # Deep results use existing records and highlight only this result-to-ranking visit.
    await page.evaluate("()=>{mockCloud.adventureRankings=async()=>[{uid:'me',runId:savedResults.at(-1)?.id,score:12345678,name:'おなまえながめ',floor:21},{uid:'other',runId:'old',score:95400,name:'レガシー'},{uid:'early',runId:'early',score:100,name:'はじめ',floor:3}];mockCloud.adventurePersonal=async()=>[{score:12345678,name:'me',floor:1001},{score:95400,name:'me'}];}")
    await frame.locator('body').evaluate('()=>gameover(false)');await frame.locator('.result-score').filter(has_text='ランクイン').wait_for()
    assert await page.evaluate('savedResults.at(-1).floor')==21;assert await page.evaluate('own.currentHp')==7
    await frame.locator('.gameover').tap();await frame.locator('.score-table').wait_for()
    assert await frame.locator('.score-table th').all_text_contents()==['ランク','スコア','なまえ','ステージ']
    assert await frame.locator('.ranking-stage').all_text_contents()==['21かい','10かい','3かい']
    assert await frame.locator('.score-table .current-run').count()==1
    assert await frame.locator('.ranking-stage').first.evaluate('e=>parseFloat(getComputedStyle(e.querySelector("small")).fontSize)/parseFloat(getComputedStyle(e).fontSize)')==.5
    for el in await frame.locator('.score-table th,.score-table td').all():
     assert await el.evaluate('e=>e.scrollWidth<=e.clientWidth+1'),await el.inner_text()
    await page.screenshot(path=f'/tmp/adventure-loop-ranking-{width}.png')
    await frame.locator('#rank-mine').tap();await frame.locator('.ranking-stage').filter(has_text='1001かい').wait_for();assert await frame.locator('.score-table .current-run').count()==0
    await frame.locator('#back').tap();await frame.locator('#ranking').tap();await frame.locator('.score-table').wait_for();assert await frame.locator('.score-table .current-run').count()==0
    assert not errors,errors;await ctx.close();print('PASS loops UI',width,'10→11→20→21, mandatory swap, preserve status/payment, read retry, n2, palettes, score, deep-save and stage ranking',flush=True)
   await browser.close()
 finally:server.shutdown()
if __name__=='__main__':asyncio.run(main())
