"""Production fountain flow with mock services only; never writes the live database."""
import asyncio,functools,http.server,importlib.util,threading
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/adventure.py');fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
async def setup(frame,stock=12,floor=1,win=True):
 await frame.locator('body').evaluate('''(_,o)=>{
  createRun({runId:'adventure-fountain-test',player:parent.AdventureStore.snapshot(parent.own),legend:parent.legend});run.floor=o.floor;run.pos=0;run.bombs=o.stock;
  run.map={floor:o.floor,cells:Array(25).fill(true),edges:new Set([key(0,1),key(1,2)]),goal:24,boss:null,items:{1:{kind:'fountain'}}};CONFIG.encounter=1;CONFIG.fountainMistMs=3000;
  window.originalFountainOutcome??=fountainOutcome;window.fountainDraws=0;fountainOutcome=()=>{fountainDraws++;return originalFountainOutcome(()=>o.win?.1:.9);};drawMap();
 }''',{'stock':stock,'floor':floor,'win':win})
async def enter(frame):
 await frame.locator('body').evaluate('()=>{window.testMove=move(1);}')
 await frame.locator('.fountain-overlay[data-phase="intro"]').wait_for()
 assert await frame.locator('body').evaluate('()=>!run.map.items[1]')
 assert await frame.locator('.map-screen .fountain-glyph').count()==0
 assert await frame.locator('.map-screen').evaluate('e=>e.inert')
 assert await frame.locator('.fountain-portrait').inner_text()=='⛲️'
 await frame.locator('.fountain-message').tap();await frame.locator('[data-phase="choose"]').wait_for()
async def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(fixture.base.Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   for width,height in [(390,844),(320,568),(844,390)]:
    ctx=await browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,service_workers='block');await ctx.add_init_script(fixture.MOCK);await ctx.route('https://**/*',lambda r:r.abort())
    source=fixture.base.SOURCE.replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{');await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))
    page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/');await page.wait_for_selector('#bootScreen',state='hidden');owned=await page.evaluate('JSON.stringify(own)');await page.locator('#adventureButton').tap();frame=page.frame_locator('#adventureFrame');await frame.locator('#start').wait_for()
    # Zero closes without drawing and consumes the map item, including with no bombs.
    for stock in [0,12]:
     await setup(frame,stock=stock)
     assert await frame.locator('.fountain-glyph').inner_text()=='⛲️'
     assert await frame.locator('.fountain-haze').evaluate('e=>getComputedStyle(e,"::before").animationName')=='fountain-map-mist'
     if stock==12:await page.screenshot(path=f'/tmp/adventure-fountain-map-{width}.png')
     await enter(frame);assert await frame.locator('.fountain-arrows button').last.is_disabled()
     if stock==0:assert await frame.locator('.fountain-arrows button').first.is_disabled()
     await frame.locator('.fountain-throw').tap();await frame.locator('body').evaluate('()=>testMove')
     assert await frame.locator('.fountain-overlay').count()==0
     assert await frame.locator('body').evaluate('()=>({bombs:run.bombs,score:run.score,battles:run.battles,draws:fountainDraws})')=={'bombs':stock,'score':0,'battles':0,'draws':0}
     await frame.locator('body').evaluate('''async()=>{CONFIG.encounter=0;await move(0);await move(1);}''')
     assert await frame.locator('.fountain-overlay').count()==0
    # Win/loss use the real action flow; one draw and one deduction despite double click.
    for stock,amount,win,floor in [(12,3,True,1),(12,2,False,1),(2,2,True,11)]:
     await setup(frame,stock,floor,win);before=await frame.locator('body').evaluate('()=>JSON.stringify(run.player)');await enter(frame)
     for _ in range(amount):await frame.locator('.fountain-arrows button').first.tap()
     if stock==amount:assert await frame.locator('.fountain-arrows button').first.is_disabled()
     for selector in ['.fountain-portrait','.fountain-dialog','.fountain-stock']:
      box=await frame.locator(selector).bounding_box();assert box['x']>=0 and box['x']+box['width']<=width+1 and box['y']>=0 and box['y']+box['height']<=height+1,(width,selector,box)
     await frame.locator('body').evaluate('''()=>{window.fountainTimes={};new MutationObserver(()=>{fountainTimes[document.querySelector('.fountain-overlay').dataset.phase]=performance.now();}).observe(document.querySelector('.fountain-overlay'),{attributes:true,attributeFilter:['data-phase']});app.querySelector('.fountain-throw').click();app.querySelector('.fountain-throw').click();}''')
     assert await frame.locator('body').evaluate('()=>run.bombs')==stock-amount
     assert await frame.locator('body').evaluate('()=>fountainDraws')==1
     await frame.locator('[data-phase="mist"]').wait_for();await page.wait_for_timeout(600)
     assert await frame.locator('canvas').evaluate('c=>c.getContext("2d").getImageData(0,0,120,100).data.some((n,i)=>i%4===3&&n>0)')
     if win and floor==1:await page.screenshot(path=f'/tmp/adventure-fountain-mist-{width}.png')
     phase='success' if win else 'failure';await frame.locator('[data-phase="'+phase+'"]').wait_for(timeout=12000)
     elapsed=await frame.locator('body').evaluate('()=>fountainTimes.clearing-fountainTimes.mist');assert 2950<=elapsed<=3300,elapsed
     assert await frame.locator('body').evaluate('()=>run.bombs')==(stock+amount if win else stock-amount)
     expected=amount*2*100*((floor-1)//10+1) if win else 0
     assert await frame.locator('body').evaluate('()=>run.score')==expected
     assert await frame.locator('body').evaluate('()=>JSON.stringify(run.player)')==before
     assert await frame.locator('.fountain-message').evaluate('e=>getComputedStyle(e).color')=='rgb(165, 238, 246)'
     assert await frame.locator('.fountain-bomb').count()==0
     await page.screenshot(path=f'/tmp/adventure-fountain-{phase}-{width}.png')
     await frame.locator('.fountain-message').tap();await frame.locator('body').evaluate('()=>testMove')
     assert await frame.locator('body').evaluate('()=>run.battles')==0
     assert await frame.locator('.fountain-overlay').count()==0
     await frame.locator('body').evaluate('()=>parent.AdventureStore.validateResult(finishScore(false))')
    # Removing the old screen during mist cannot award bombs to a new run.
    await setup(frame);await enter(frame);await frame.locator('.fountain-arrows button').first.tap();await frame.locator('.fountain-throw').tap();await frame.locator('[data-phase="mist"]').wait_for()
    await frame.locator('body').evaluate("()=>{window.oldMove=testMove;title();createRun({runId:'adventure-after-abandon',player:parent.AdventureStore.snapshot(parent.own),legend:parent.legend});drawMap();}")
    await frame.locator('body').evaluate('()=>oldMove');assert await frame.locator('body').evaluate('()=>run.bombs===0&&run.score===0')
    assert await page.evaluate('JSON.stringify(own)')==owned
    assert not errors,errors;await ctx.close();print('PASS fountain UI',width,'cyan emoji/aura, consumed on entry incl. zero, bounds, single draw/deduction, 3s mist, win/loss, lap score, no extra encounter, cancellation',flush=True)
   await browser.close()
 finally:server.shutdown()
if __name__=='__main__':asyncio.run(main())
