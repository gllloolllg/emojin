"""Layout regression: fixed cells, allocated map height, host-owned safe areas and resizing.
No production authentication or database writes. Run Chromium; --webkit also runs WebKit.
"""
import asyncio,functools,http.server,importlib.util,sys,threading
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/adventure.py');fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
PROFILES=[(390,844,59,34),(375,667,20,0),(320,568,20,0),(430,932,59,34),(844,390,0,21)]
async def geometry(frame):
 return await frame.locator('body').evaluate('''()=>{
 const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};
 return {viewport:{width:innerWidth,height:innerHeight},score:rect('.score-hud'),area:rect('.dungeon-area'),board:rect('.board'),status:rect('.status'),footer:rect('.bottom'),
 cells:[...document.querySelectorAll('.cell')].map(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})};}''')
def verify(g):
 assert g['score']['y']>=8,g
 assert g['score']['bottom']<=g['area']['y'],g
 assert g['board']['y']>=g['area']['y']-1,g
 assert g['board']['bottom']<=g['area']['bottom']+1,g
 if g['board']['right']<=g['status']['x']-5:
  assert g['area']['right']<=g['status']['x'],g
 else:
  assert g['area']['bottom']<=g['status']['y'],g
  assert g['board']['bottom']<=g['status']['y']-5,g
 assert g['footer']['bottom']<=g['viewport']['height']-4,g
 assert g['board']['width']>20,g
 assert abs(g['board']['height']-g['board']['width'])<1,g
 assert max(c[2] for c in g['cells'])-min(c[2] for c in g['cells'])<1
 assert max(c[3] for c in g['cells'])-min(c[3] for c in g['cells'])<1
 assert all(abs(c[2]-c[3])<1 for c in g['cells'])
async def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(fixture.base.Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   engines=['webkit'] if '--webkit-only' in sys.argv else ['chromium','webkit'] if '--webkit' in sys.argv else ['chromium']
   for engine in engines:
    options={'executable_path':'/usr/bin/chromium','args':['--no-sandbox']} if engine=='chromium' else {}
    browser=await getattr(p,engine).launch(**options)
    for w,h,top,bottom in PROFILES:
     ctx=await browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True,service_workers='block');await ctx.add_init_script(fixture.MOCK);await ctx.route('https://**/*',lambda r:r.abort())
     source=fixture.base.SOURCE.replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{')
     await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))
     page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/');await page.wait_for_selector('#bootScreen',state='hidden')
     await page.evaluate('''([top,bottom])=>{document.documentElement.style.setProperty('--safe-top',top+'px');document.documentElement.style.setProperty('--safe-bottom',bottom+'px')}''',[top,bottom])
     await page.locator('#adventureButton').tap();frame=page.frame_locator('#adventureFrame');await frame.locator('#start').wait_for()
     await frame.locator('body').evaluate('''()=>{createRun({runId:'adventure-layout',player:parent.AdventureStore.snapshot(parent.own),legend:parent.legend});run.floor=6;run.player.maxHp=15;run.player.currentHp=4;run.map=generateFloor(6,run.pos);drawMap()}''')
     await page.wait_for_timeout(150);g=await geometry(frame);verify(g)
     outer=await page.locator('#adventureFrame').bounding_box();assert abs(outer['y']-top)<1;assert abs(outer['height']-(h-top-bottom))<1
     assert outer['y']+g['score']['y']>=top+8
     # The same map may not resize when a very large glyph is inserted.
     await frame.locator('.cell').first.evaluate("el=>{el.innerHTML='<span style=\"font-size:220px\">🐦‍🔥🧛🦖</span>'}")
     await page.wait_for_timeout(100);huge=await geometry(frame);verify(huge)
     assert all(abs(a-b)<.1 for a,b in zip([v for c in g['cells'] for v in c],[v for c in huge['cells'] for v in c]))
     await frame.locator('body').evaluate('()=>drawMap()');await page.screenshot(path=f'/tmp/adventure-layout-{engine}-{w}x{h}.png')
     # Mobile toolbar/viewport height changes must trigger re-fitting without overlap.
     await page.set_viewport_size({'width':w,'height':h+90});await page.wait_for_timeout(150);verify(await geometry(frame))
     await frame.locator('body').evaluate('()=>help(1)');await fixture.check_grid(frame,'.help-dungeon','.help-cell')
     assert not errors,errors
     await ctx.close()
    await browser.close();print('PASS',engine,'safe-area top/bottom, no map/status overlap, fixed square cells, giant glyphs, viewport resize, help page across',len(PROFILES),'sizes',flush=True)
 finally:server.shutdown()
asyncio.run(main())
