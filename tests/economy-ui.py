"""Mocked-cloud mobile checks for the 20-point gauge and six-resident creation limit."""
import asyncio,functools,http.server,importlib.util,sys,threading
from pathlib import Path
from playwright.async_api import async_playwright
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/slot-any-bonus.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
async def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(base.Quiet,directory=str(ROOT)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   for width,height in [(390,844),(320,568)]:
    ctx=await browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,service_workers='block')
    await ctx.add_init_script(base.MOCK)
    await ctx.route('https://**/*',lambda r:r.abort())
    source=base.SOURCE.replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{')
    source=source.replace('init().catch(err=>{',r'''
window.setEconomyForTest=(count,hatch,balance,draft=false)=>{
 const fighter=(id,ownerUid,status='active',isNpc=false)=>({id,ownerUid,status,isNpc,stars:0,defeats:0,slots:Array(6).fill('attack1')});
 store.emojins=[...Array.from({length:count},(_,i)=>fighter('mine-'+i,cloud.uid)),fighter('other','other'),fighter('npc',cloud.uid,'active',true),fighter('dead',cloud.uid,'dead'),fighter('legend',cloud.uid,'legend')];
 store.draft=draft?{id:'reserved',paid:true}:null;
 cloud.hatch=hatch;cloud.hatchPending=0;cloud.wallet={balance,updatedAt:Date.now()};refreshNav();
};
init().catch(err=>{''')
    await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))
    page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/')
    await page.wait_for_selector('#bootScreen',state='hidden')
    assert await page.locator('#dailyBattleButton,.daily-battle-launch').count()==0
    assert await page.evaluate('typeof DailyBattle')=='undefined'
    button=page.locator('#generateButton');gauge=page.locator('#hatchGauge')
    for hatch in [0,1,10,19,20]:
     await page.evaluate('h=>setEconomyForTest(5,h,0)',hatch)
     assert await gauge.get_attribute('aria-valuemax')=='20'
     assert await gauge.get_attribute('aria-valuenow')==str(hatch)
     assert await page.locator('.hatch-fill').evaluate('el=>el.style.height')==str(hatch*5)+'%'
     assert await button.is_disabled()==(hatch<20)
     assert await button.evaluate("el=>el.classList.contains('hatch-ready')")==(hatch==20)
    await page.evaluate('setEconomyForTest(5,10,1200)')
    assert await button.is_enabled()
    assert await button.locator('.nav-cost').text_content()=='1200 モジ'
    for count in [6,7]:
     await page.evaluate('n=>setEconomyForTest(n,20,5000)',count)
     assert await button.is_disabled()
     assert await button.locator('.nav-cost').text_content()=='6体まで'
     assert await gauge.evaluate("el=>el.classList.contains('full')")
    await page.screenshot(path=f'/tmp/emojin-economy-{width}.png')
    await page.evaluate('setEconomyForTest(7,10,0,true)')
    assert await button.is_enabled()
    assert await button.locator('.nav-cost').text_content()=='つづき'
    await page.evaluate('setEconomyForTest(5,20,0)')
    assert await button.is_enabled() # A vacancy enables generation again.
    assert not errors,errors
    print(f'PASS {width}: 5% steps, 20-point readiness, paid/hatch limit, exclusions, draft resume, vacancy')
    await ctx.close()
   await browser.close()
 finally:server.shutdown()
asyncio.run(main())
