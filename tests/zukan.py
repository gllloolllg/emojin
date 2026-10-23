"""Local mocked-cloud UI checks. No Firebase reads or writes; screenshots go to /tmp."""
import asyncio, functools, http.server, importlib.util, sys, threading
from pathlib import Path
from playwright.async_api import async_playwright
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/slot-any-bonus.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
MOCK=base.MOCK+r'''
audit.zukanReads=0;window.generated=['🦐','🐸','🤡'];window.failZukan=false;window.holdZukan=false;
mockCloud.getArchive=async()=>[];
mockCloud.getGeneratedEmojis=async()=>{
 audit.zukanReads++;if(holdZukan)await new Promise(resolve=>window.releaseZukan=resolve);
 if(failZukan)throw Error('offline');return [...generated];
};
'''
async def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(base.Quiet,directory=str(ROOT)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   for width,height in [(390,844),(320,568)]:
    ctx=await browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,service_workers='block')
    await ctx.add_init_script(MOCK);await ctx.route('https://**/*',lambda r:r.abort())
    source=(ROOT/'app.js').read_text().replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{')
    await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))
    page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/')
    await page.wait_for_function("document.querySelector('#bootScreen').classList.contains('hidden')")
    async def open_archive():
     await page.locator('#browseButton').tap();await page.wait_for_selector('.archive-tabs')
    async def close_archive():
     await page.locator('.archive-close').tap();await page.wait_for_function("document.querySelector('#modalHost').classList.contains('hidden')")
    async def swipe(direction):
     view=page.locator('.archive-viewport');start,end=(240,80) if direction=='left' else (80,240)
     await view.dispatch_event('pointerdown',{'pointerId':7,'isPrimary':True,'pointerType':'touch','clientX':start,'clientY':250})
     await view.dispatch_event('pointerup',{'pointerId':7,'isPrimary':True,'pointerType':'touch','clientX':end,'clientY':250})
    await open_archive();assert await page.evaluate('audit.zukanReads')==0
    assert await page.locator('.archive-tab').all_text_contents()==['👤','🏆','🪦','📕']
    await page.locator('[data-archive-tab="dead"]').tap();await swipe('left')
    await page.wait_for_selector('.zukan-grid');await page.wait_for_timeout(450)
    assert await page.locator('.archive-heading').text_content()=='ズカン'
    catalog=await page.evaluate('EmojinEngine.EMOJIS');assert len(set(catalog))==len(catalog)
    cells=page.locator('.zukan-cell');assert await cells.count()==len(catalog)
    assert await page.locator('.zukan-cell:not(.is-locked)').all_text_contents()==[e for e in catalog if e in ['🦐','🐸','🤡']]
    assert set(await page.locator('.zukan-cell.is-locked').all_text_contents())=={'🥚'}
    assert await page.locator('.zukan-cell.is-locked').first.evaluate('el=>Number(getComputedStyle(el).opacity)')==.35
    columns=await cells.evaluate_all('''els=>{
     const r=els.slice(0,6).map(el=>el.getBoundingClientRect());
     return r.slice(0,5).every(x=>Math.abs(x.top-r[0].top)<1)&&r[5].top>r[0].bottom;
    }''');assert columns
    assert await page.locator('#pane-zukan button,#pane-zukan [data-emojin-id]').count()==0
    await cells.first.tap();assert await page.locator('#detailHost').is_hidden()
    await page.screenshot(path=f'/tmp/emojin-zukan-{width}.png')
    await page.locator('#pane-zukan').evaluate('el=>el.scrollTop=el.scrollHeight')
    assert await cells.last.evaluate('el=>el.getBoundingClientRect().bottom<=document.querySelector(".archive-tabs").getBoundingClientRect().top')
    await swipe('right');assert await page.locator('.archive-heading').text_content()=='ボチ'
    await page.locator('[data-archive-tab="dead"]').focus();await page.keyboard.press('ArrowRight')
    assert await page.get_by_role('tab',name='ズカン').get_attribute('aria-selected')=='true'
    assert await page.evaluate('audit.zukanReads')==1
    await swipe('left');assert await page.locator('.archive-heading').text_content()=='ズカン'
    await close_archive()
    # A newly completed creation is reflected when opening again.
    await page.evaluate("generated.push('🐙')");await open_archive();await page.get_by_role('tab',name='ズカン').tap()
    await page.wait_for_function("document.querySelectorAll('.zukan-cell:not(.is-locked)').length===4")
    await close_archive()
    # Failed reads must not present an apparently empty collection; tab re-entry retries.
    await page.evaluate('failZukan=true');await open_archive();await page.get_by_role('tab',name='ズカン').tap()
    await page.wait_for_function("document.querySelector('#pane-zukan').textContent.includes('読み込めません')")
    assert await page.locator('.zukan-cell').count()==0
    await page.locator('[data-archive-tab="dead"]').tap();await page.evaluate('failZukan=false')
    await page.get_by_role('tab',name='ズカン').tap();await page.wait_for_selector('.zukan-grid');await close_archive()
    # A closed panel's delayed response cannot replace a newly opened panel.
    await page.evaluate('holdZukan=true');await open_archive();await page.get_by_role('tab',name='ズカン').tap()
    await page.wait_for_function('typeof releaseZukan==="function"');await close_archive();await open_archive()
    await page.evaluate('holdZukan=false;releaseZukan()');await page.wait_for_timeout(50)
    assert await page.locator('.archive-heading').text_content()=='マイエモジン'
    assert await page.locator('.zukan-grid').count()==0
    await page.evaluate('generated=[]');await page.get_by_role('tab',name='ズカン').tap();await page.wait_for_selector('.zukan-grid')
    assert await page.locator('.zukan-cell.is-locked').count()==len(catalog)
    assert await page.locator('.zukan-cell:not(.is-locked)').count()==0
    assert not errors,errors
    print(f'PASS {width}x{height}: fourth tab, five columns, complete emoji order, translucent locked eggs, no details, swipe/keyboard, scroll, reopen/new creation, read failure/retry and stale response isolation',flush=True)
    await ctx.close()
   await browser.close()
 finally:server.shutdown()
if __name__=='__main__':asyncio.run(main())
