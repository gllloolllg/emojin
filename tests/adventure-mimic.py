"""Mimic reveal and actual battles in the production iframe, with mock services only."""
import asyncio,functools,http.server,importlib.util,threading
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/adventure.py');fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
async def setup(frame,floor=1,win=True,normal=None):
 await frame.locator('body').evaluate('''(_,o)=>{
  window.nativeRandom??=Math.random;Math.random=nativeRandom;
  createRun({runId:'adventure-mimic-test',player:parent.AdventureStore.snapshot(parent.own),legend:parent.legend});
  run.floor=o.floor;run.pos=0;run.level=9;run.xp=0;run.bombs=5;run.player.maxHp=20;run.player.currentHp=20;run.player.slots=Array(6).fill(o.win?'attack2':'blank');
  run.map={floor:o.floor,cells:Array(25).fill(true),edges:new Set([key(0,1),key(1,2)]),goal:24,boss:null,items:{1:{kind:'chest'}}};
  CONFIG.turnMs=1;CONFIG.encounter=o.normal===null?1:0;CONFIG.mimic=.04;
  window.realChestReward??=chestReward;window.chestChecks=0;chestReward=(...args)=>{chestChecks++;return realChestReward(...args);};
  let calls=0;Math.random=()=>{calls++;if(o.normal!==null)return calls===1?.5:o.normal;return calls===1?.01:calls===11?.18:.52;};
  drawMap();window.testMove=move(1);
 }''',{'floor':floor,'win':win,'normal':normal})
 await frame.locator('.chest-overlay[data-phase="closed"]').wait_for()
 assert await frame.locator('body').evaluate('()=>chestChecks')==0
async def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(fixture.base.Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   for width,height in [(390,844),(320,568)]:
    ctx=await browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,service_workers='block');await ctx.add_init_script(fixture.MOCK);await ctx.route('https://**/*',lambda r:r.abort())
    source=fixture.base.SOURCE.replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{');await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))
    page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/');await page.wait_for_selector('#bootScreen',state='hidden');owned=await page.evaluate('JSON.stringify(own)')
    await page.locator('#adventureButton').tap();frame=page.frame_locator('#adventureFrame');await frame.locator('#start').wait_for()
    for floor,win in [(1,True),(11,True),(20,True),(21,False)]:
     await setup(frame,floor,win)
     assert await frame.locator('.chest-overlay .chest-lid').count()==1
     await frame.locator('.chest-overlay').tap();await frame.locator('.chest-overlay[data-phase="opening"]').wait_for()
     assert await frame.locator('.chest-overlay .chest-lid').count()==0
     await frame.locator('.chest-overlay').evaluate("e=>{e.click();e.click();e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));}")
     await frame.locator('.chest-overlay[data-phase="mimic"]').wait_for()
     assert await frame.locator('.chest-reward').count()==0
     assert await frame.locator('body').evaluate('()=>chestChecks')==1
     hp=await frame.locator('body').evaluate('()=>run.map.items[1].enemy.maxHp')
     if floor==1:
      await page.wait_for_timeout(80);await page.screenshot(path=f'/tmp/adventure-mimic-reveal-{width}.png')
      await frame.locator('.battle-screen[data-phase="intro"]').wait_for();await page.wait_for_timeout(60)
      box=await frame.locator('.fighter-upper .mimic-art').bounding_box();assert box['width']>20 and box['x']>=0 and box['x']+box['width']<=width
      await page.screenshot(path=f'/tmp/adventure-mimic-battle-{width}.png')
     await frame.locator('.battle-screen[data-phase="awaiting-tap"]').wait_for(timeout=15000)
     assert await frame.locator('.chest-overlay').count()==0
     assert await frame.locator('.fighter-upper .mimic-art').count()==1
     assert await frame.locator('.info-upper h2').inner_text()=='ミタコトアルヤツ'
     assert await frame.locator('#turn').inner_text() in ['2/10','10/10']
     assert await frame.locator('#throw').count()==0
     level=(floor-1)//10+1
     result=await frame.locator('body').evaluate('()=>({xp:run.xp,score:run.score,events:run.scoreEvents,bombs:run.bombs,hp:run.player.currentHp,battles:run.battles,removed:!run.map.items[1]})')
     assert result['xp']==(3+level-1 if win else 0),result
     assert result['score']==(1500+(hp*400 if win else 0))*level,result
     assert result['events'].get('chest',0)==0 and result['events'].get('bomb',0)==0 and result['events'].get('bossHeart',0)==0
     assert result['events'].get('randomEncounter',0)==0
     assert (result['bombs'],result['hp'],result['battles'],result['removed'])==(5,20,1,True)
     if floor==1:await page.screenshot(path=f'/tmp/adventure-mimic-defeated-{width}.png')
     await frame.locator('.battle-screen').tap();await frame.locator('body').evaluate('()=>testMove')
     assert await frame.locator('body').evaluate('()=>run.battles')==1
     assert await frame.locator('.map-screen').count()==1
     await frame.locator('body').evaluate('()=>parent.AdventureStore.validateResult(finishScore(false))')
    # Normal treasure keeps its original conditional rewards and two-tap flow.
    for roll,reward in [(.1,'fullheal'),(.3,3),(.6,4),(.9,5)]:
     await setup(frame,normal=roll)
     await frame.locator('body').evaluate('()=>{run.player.currentHp=2;}')
     await frame.locator('.chest-overlay').tap();await frame.locator('.chest-overlay[data-phase="reward"]').wait_for()
     assert await frame.locator('.mimic-art').count()==0
     assert await frame.locator('body').evaluate('()=>chestChecks')==1
     result=await frame.locator('body').evaluate('()=>({hp:run.player.currentHp,bombs:run.bombs,score:run.score})')
     assert result==({'hp':20,'bombs':5,'score':600} if reward=='fullheal' else {'hp':2,'bombs':5+reward,'score':300+100*reward}),result
     await frame.locator('.chest-overlay').tap();await frame.locator('body').evaluate('()=>testMove')
    # Cancelling before reveal cannot award loot or start a stale encounter.
    await setup(frame);await frame.locator('.chest-overlay').tap();await frame.locator('body').evaluate('()=>title()');await frame.locator('body').evaluate('()=>testMove')
    assert await frame.locator('#start').count()==1 and await frame.locator('.chest-overlay').count()==0
    assert await frame.locator('body').evaluate('()=>chestChecks')==0
    # The guaranteed skill treasure after a boss is never a mimic.
    await setup(frame,normal=.1);await frame.locator('body').evaluate('()=>{epoch++;app.querySelector(".chest-overlay").remove();CONFIG.mimic=1;run.player.slots=parent.own.slots.slice();window.grandTest=openGrandChest(epoch);}')
    await frame.locator('.grand-chest').tap();await frame.locator('.lap-reward[data-phase="choose"]').wait_for()
    assert await frame.locator('body').evaluate('()=>chestChecks')==0
    assert await frame.locator('.reward-choice').count()==5
    assert await page.evaluate('JSON.stringify(own)')==owned
    assert not errors,errors;await ctx.close();print('PASS mimic UI',width,'closed/lid/reveal, one opening roll, Lv3 early/later/final floors, win/flee rewards, no double encounter, normal loot, cancellation, grand treasure unchanged',flush=True)
   await browser.close()
 finally:server.shutdown()
if __name__=='__main__':asyncio.run(main())
