"""New skill descriptions and actual minigame playback with mock services only."""
import asyncio,functools,http.server,importlib.util,threading
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/adventure.py');fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
async def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(fixture.base.Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   for width,height in [(390,844),(320,568)]:
    ctx=await browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,service_workers='block');await ctx.add_init_script(fixture.MOCK);await ctx.route('https://**/*',lambda r:r.abort())
    source=fixture.base.SOURCE.replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{')
    source=source.replace('init().catch(err=>{',"window.skillTest={face:showFace,close:()=>closePopover(true),offers(){store.draft={...E.createDraft(),name:'テスト',offers:['drain','ram'],stage:'special'};showSpecial();}};init().catch(err=>{")
    await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))
    page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/');await page.wait_for_selector('#bootScreen',state='hidden')
    await page.locator('#adventureButton').tap();frame=page.frame_locator('#adventureFrame');await frame.locator('#start').wait_for()
    for final,face,other,hp,base,maximum,expected in [(False,'drain','guard',5,8,8,6),(False,'drain','counter',5,8,8,6),(True,'drain','counter',6,6,11,6),(True,'drain','counter',8,6,11,8),(True,'ram','counter',8,8,8,4),(False,'ram','blank',8,8,8,6)]:
     await frame.locator('body').evaluate('''(_,o)=>{
      createRun({runId:'skill-balance-test',player:parent.AdventureStore.snapshot(parent.own),legend:parent.legend});run.floor=o.final?10:1;run.player.slots=Array(6).fill(o.face);run.player.currentHp=o.hp;run.player.baseMaxHp=o.base;run.player.maxHp=o.maximum;
      const foe=o.final?B.prepare(parent.legend):enemy(0);foe.boss=o.final;foe.maxHp=foe.baseMaxHp=foe.currentHp=o.final?40:8;foe.slots=Array(6).fill(o.other);CONFIG.turnMs=1;battleDraw(foe,1,'run');
      const phase=o.final?B.resolveTurn(run.player,foe,()=>0):E.resolveTurn(run.player,foe,()=>0),token=epoch;battleVisual=copy(phase.before);window.balancePhase=phase;
      window.balancePlayback=(async()=>{for(const e of phase.events)await playBattleEvent(e,token);run.player=phase.after[0];run.map.boss=phase.after[1];paintBattle(phase.after);app.querySelector('.battle-screen').dataset.testDone='true';})();
     }''',{'final':final,'face':face,'other':other,'hp':hp,'base':base,'maximum':maximum})
     await frame.locator('.battle-screen[data-test-done="true"]').wait_for();assert await frame.locator('body').evaluate('()=>run.player.currentHp')==expected
     if face=='drain':assert await frame.locator('body').evaluate('()=>balancePhase.events.find(e=>e.type==="impact").drains[0].amount')==1
     if final and face=='drain':assert await frame.locator('body').evaluate('()=>run.score')==100
    await frame.locator('body').evaluate('()=>title()');await frame.locator('#exit').tap();await page.wait_for_selector('#adventureFrame',state='detached')
    for face,part in [('drain','防御やカウンターの影響をうけない'),('ram','カウンターされたときは反動を受けず')]:
     await page.evaluate('(face)=>skillTest.face(face)',face);await page.locator('.popover-text').filter(has_text=part).wait_for();box=await page.locator('.slot-popover').bounding_box();assert box['x']>=0 and box['x']+box['width']<=width+1;assert box['y']>=0 and box['y']+box['height']<=height+1
     await page.screenshot(path=f'/tmp/emojin-{face}-description-{width}.png');await page.evaluate('skillTest.close()')
    await page.evaluate('skillTest.offers()');await page.locator('.offer[data-offer="drain"] .offer-desc').filter(has_text='1ダメージと1回復').wait_for();await page.locator('.offer[data-offer="ram"] .offer-desc').filter(has_text='反射されたら反動なし').wait_for()
    await page.wait_for_timeout(150);await page.screenshot(path=f'/tmp/emojin-skill-offers-{width}.png')
    for offer in await page.locator('.offer').all():
     box=await offer.bounding_box();assert box['x']>=0 and box['x']+box['width']<=width+1,(width,box)
    assert await page.evaluate('own.currentHp')==7;assert not errors,errors;await ctx.close()
   await browser.close();print('PASS skill UI 390/320: updated descriptions and generation offers fit; real normal/final boss playback has drain1, immunity, gold cap and reflected ram4; main resident unchanged')
 finally:server.shutdown()
if __name__=='__main__':asyncio.run(main())
