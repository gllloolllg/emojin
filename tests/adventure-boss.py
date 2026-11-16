"""Actual final-boss battle and special presentation, with local mock services only."""
import asyncio,functools,http.server,importlib.util,threading
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/adventure.py');fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
MOCK=fixture.MOCK.replace('duration:Math.min(options.duration||0,8)',"duration:(this.closest('.boss-special')||this.classList.contains('boss-special'))?options.duration:Math.min(options.duration||0,8)")
async def start_case(frame,options):
 return await frame.locator('body').evaluate('''(_,options)=>{
  createRun({runId:'boss-test',player:parent.AdventureStore.snapshot(parent.own),legend:parent.legend});run.floor=10;run.busy=true;
  run.player.slots=Array(6).fill(options.player||'blank');run.player.maxHp=options.hp||13;run.player.baseMaxHp=8;run.player.currentHp=options.hp||13;
  const foe=B.prepare(parent.legend);foe.boss=true;foe.bossN=options.n||1;foe.bossCharged=!!options.charged;foe.currentHp=options.foeHp||40;if(options.cursed)foe.cursedSlots=[0];
  CONFIG.turnMs=options.fast?1:650;
  battleDraw(foe,1,'run');const values=[0,options.ordinary ? .21 : 0,(options.card+.1)/4];let i=0;
  const phase=B.resolveTurn(run.player,foe,()=>values[i++]??.4),token=epoch;battleVisual=copy(phase.before);paintBattle(phase.before);
  window.phaseForTest=phase;window.caseDone=false;window.phaseTimes=[];const screen=app.querySelector('.battle-screen');
  new MutationObserver(records=>{for(const rec of records)if(rec.type==='attributes'&&rec.target.classList.contains('boss-special'))phaseTimes.push({phase:rec.target.dataset.phase,time:performance.now()});}).observe(screen,{subtree:true,attributes:true,attributeFilter:['data-phase']});
  window.casePromise=(async()=>{for(const event of phase.events){await playBattleEvent(event,token);if(epoch!==token)return;}run.player=phase.after[0];run.map.boss=phase.after[1];paintBattle(phase.after);screen.dataset.testDone='true';window.caseDone=true;})();
 }''',options)
async def done(frame):
 await frame.locator('.battle-screen[data-test-done="true"]').wait_for(timeout=30000)
async def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(fixture.base.Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   for width,height in [(390,844),(320,568)]:
    ctx=await browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,service_workers='block');await ctx.add_init_script(MOCK);await ctx.route('https://**/*',lambda r:r.abort())
    source=fixture.base.SOURCE.replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{');await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))
    page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/');await page.wait_for_selector('#bootScreen',state='hidden');await page.locator('#adventureButton').tap();frame=page.frame_locator('#adventureFrame');await frame.locator('#start').wait_for()
    # Full-speed production presentation, not the accelerated test path.
    await start_case(frame,{'card':3,'hp':8,'fast':False})
    try:await frame.locator('.boss-special[data-phase="cards-hold"]').wait_for(timeout=10000)
    except:
     print('BOSS DEBUG',errors,await frame.locator('body').evaluate('()=>({html:app.innerHTML.slice(-1400),phase:phaseForTest.events.map(e=>e.type),done:caseDone,times:phaseTimes})'))
     await page.screenshot(path='/tmp/adventure-boss-failure.png');raise
    assert await frame.locator('.boss-special-card').count()==4
    assert await frame.locator('.boss-special-card').last.locator('.boss-special-label').inner_text()=='チャージ'
    assert await frame.locator('.boss-special-card').last.locator('svg text').count()==0
    await frame.locator('.boss-special[data-phase="fire"]').wait_for();await page.wait_for_timeout(600)
    assert await frame.locator('canvas').evaluate('''c=>{const a=c.getContext('2d'),r=c.getBoundingClientRect();return [...document.querySelectorAll('.boss-special-card')].every(el=>{const b=el.getBoundingClientRect();return [[b.left+2,b.top+2],[b.right-2,b.top+2],[b.left+2,b.bottom-2],[b.right-2,b.bottom-2]].every(([x,y])=>a.getImageData(Math.floor((x-r.left)/r.width*c.width),Math.floor((y-r.top)/r.height*c.height),1,1).data[3]===255)})}''')
    await page.screenshot(path=f'/tmp/adventure-boss-fire-{width}.png')
    await frame.locator('.boss-special[data-phase="charged"]').wait_for();assert await frame.locator('.boss-special-card').last.locator('svg text').text_content()=='10'
    await done(frame)
    assert await frame.locator('[data-die="1"] svg').get_attribute('data-state')=='charge'
    assert await frame.locator('.info-upper .slot[data-slot="0"] svg').get_attribute('data-state')=='charge'
    assert await frame.locator('[data-die="1"] svg text').count()==0
    assert await frame.locator('.fighter-upper .fighter-art').evaluate('e=>getComputedStyle(e).animationName')=='boss-charged-aura'
    assert await frame.locator('body').evaluate('()=>run.player.currentHp')==8
    hold=await frame.locator('body').evaluate("()=>phaseTimes.find(p=>p.phase==='fire').time-phaseTimes.find(p=>p.phase==='cards-hold').time")
    assert 980<=hold<=1250,hold
    await page.screenshot(path=f'/tmp/adventure-boss-charged-return-{width}.png')
    await start_case(frame,{'card':3,'charged':True,'player':'counter','hp':13,'fast':True});await done(frame)
    assert await frame.locator('body').evaluate('()=>run.player.currentHp')==3
    assert await frame.locator('[data-die="1"] svg text').text_content()=='10'
    assert await frame.locator('.fighter-upper .fighter-art').evaluate('e=>getComputedStyle(e).animationName')!='boss-charged-aura'
    await start_case(frame,{'card':0,'n':3,'player':'guard','fast':True});await done(frame)
    assert await frame.locator('body').evaluate('()=>run.player.currentHp')==11
    assert await frame.locator('.info-upper .slot[data-slot="0"] .ability-value').inner_text()=='3'
    await start_case(frame,{'card':0,'n':4,'player':'counter','fast':True});await done(frame)
    assert await frame.locator('body').evaluate('()=>run.map.boss.currentHp')==36
    await start_case(frame,{'card':1,'n':4,'foeHp':20,'fast':True});await done(frame)
    assert await frame.locator('body').evaluate('()=>run.map.boss.currentHp')==24
    await start_case(frame,{'card':2,'n':4,'player':'attack1','fast':True});await done(frame)
    assert await frame.locator('body').evaluate('()=>run.player.cursedSlots.length')==4
    assert await frame.locator('body').evaluate('()=>run.map.boss.currentHp')==39
    await start_case(frame,{'card':0,'cursed':True,'fast':True});await done(frame)
    assert await frame.locator('body').evaluate('()=>run.map.boss.bossN')==1
    assert await frame.locator('[data-die="1"] .ability-curse').count()==1
    assert await frame.locator('.boss-special').count()==0
    await start_case(frame,{'card':0,'ordinary':True,'fast':True});await done(frame)
    assert await frame.locator('body').evaluate('()=>run.map.boss.bossN')==1
    assert await frame.locator('.boss-special').count()==0
    await start_case(frame,{'card':3,'charged':True,'player':'fullheal','hp':8,'fast':True});await done(frame)
    assert await frame.locator('body').evaluate('()=>run.player.currentHp')==0
    # Actual fight(), scoring, tap-to-finish and clear handling, not just event playback.
    await frame.locator('body').evaluate('''()=>{
     createRun({runId:'boss-counter-clear',player:parent.AdventureStore.snapshot(parent.own),legend:parent.legend});run.floor=10;run.busy=true;run.player.slots=Array(6).fill('counter');
     const foe=B.prepare(parent.legend);foe.boss=true;foe.bossN=4;foe.currentHp=4;CONFIG.turnMs=1;const token=epoch;battleDraw(foe,1,'run');battleVisual=copy([run.player,foe]);
     const original=Math.random,values=[0,0,0];let i=0;Math.random=()=>values[i++]??.1;window.realFight=fight(foe,token).finally(()=>Math.random=original);
    }''')
    await frame.locator('[data-phase="awaiting-tap"]').wait_for(timeout=15000)
    assert await frame.locator('body').evaluate('()=>run.score')==15400
    await frame.locator('.battle-screen').tap();await frame.locator('.gameover h1').filter(has_text='GAME CLEAR').wait_for()
    assert await page.evaluate('own.currentHp')==7
    assert not errors,errors
    await ctx.close()
   await browser.close();print('PASS boss UI 390/320: four cards and 1s hold, opaque 2s flames, charge-to-ultra card and charge return, pulsing aura, ultra ignores counter, guard/counter/heal/curse, cursed/ordinary rolls skip draw, lethal ultra, real fight reflected-heart scoring and clear, main record unchanged')
 finally:server.shutdown()
if __name__=='__main__':asyncio.run(main())
