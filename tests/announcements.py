"""Local announcement UI regression using mocked data; all Firebase traffic is blocked."""
import asyncio, functools, http.server, importlib.util, sys, threading
from pathlib import Path
from playwright.async_api import async_playwright
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/slot-any-bonus.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
MOCK=base.MOCK+r'''
window.noticeKey='emojin.announcements.openedAt.emojin-49855';
window.baseline=Date.now()-100000;
if(localStorage.getItem(noticeKey)===null)localStorage.setItem(noticeKey,String(baseline));
window.notices=[{body:'これまでのお知らせです。',publishedAt:baseline-1},
 {body:'ズカンを追加しました。',publishedAt:baseline+1000},{body:'バトル方式を更新しました。',publishedAt:baseline}];
window.failNotices=false;window.holdNotices=false;audit.noticeReads=0;
mockCloud.getAnnouncements=async()=>{
 audit.noticeReads++;const snapshot=notices.map(n=>({...n}));
 if(holdNotices)await new Promise(resolve=>window.releaseNotices=resolve);
 if(failNotices)throw Error('offline');return snapshot.sort((a,b)=>b.publishedAt-a.publishedAt);
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
    source=source.replace('init().catch(err=>{','window.refreshNoticesForTest=refreshAnnouncements;\ninit().catch(err=>{')
    await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))
    page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/')
    await page.wait_for_function("document.querySelector('#bootScreen').classList.contains('hidden')")
    await page.wait_for_function("document.querySelector('#announcementsButton').classList.contains('has-unread')")
    assert await page.locator('#modalHost').is_hidden()
    bell=page.locator('#announcementsButton');assert await bell.text_content()=='🔔'
    assert await bell.evaluate('el=>{const r=el.getBoundingClientRect();return r.left<40&&r.width>=44&&r.height>=44&&r.right<innerWidth/2;}')
    assert await bell.evaluate("el=>getComputedStyle(el).opacity==='1'&&getComputedStyle(el).filter==='none'")
    await page.screenshot(path=f'/tmp/emojin-announcements-bell-{width}.png')
    async def open_notices():
     await bell.tap();await page.wait_for_selector('.announcements-panel')
     await page.wait_for_function("!document.querySelector('.announcements-content').textContent.includes('読み込み中')")
    async def close_notices():
     await page.locator('.announcements-panel .modal-close').tap()
     await page.wait_for_function("document.querySelector('#modalHost').classList.contains('hidden')")
    await open_notices()
    assert await page.locator('.announcement-item p').all_text_contents()==['ズカンを追加しました。','バトル方式を更新しました。','これまでのお知らせです。']
    assert await page.locator('.announcement-item.is-unread').count()==2
    assert await page.locator('.announcement-item.is-unread p').first.evaluate('el=>getComputedStyle(el).fontWeight')=='700'
    assert await page.locator('.announcement-item:not(.is-unread) p').evaluate('el=>getComputedStyle(el).fontWeight')=='400'
    first_read=await page.evaluate('Number(localStorage.getItem(noticeKey))');assert first_read>await page.evaluate('baseline')
    await page.wait_for_timeout(100);assert await page.locator('.announcement-item.is-unread').count()==2
    assert await page.locator('.announcements-panel').evaluate("el=>getComputedStyle(el).backgroundColor==='rgb(22, 57, 45)'")
    await page.screenshot(path=f'/tmp/emojin-announcements-list-{width}.png')
    await close_notices();assert await bell.evaluate("el=>getComputedStyle(el).opacity==='0.35'&&getComputedStyle(el).filter!=='none'")
    await page.reload();await page.wait_for_function("document.querySelector('#bootScreen').classList.contains('hidden')")
    assert await page.locator('#modalHost').is_hidden();assert await bell.evaluate("el=>!el.classList.contains('has-unread')")
    await page.evaluate("notices.push({body:'<img src=x onerror=window.badNotice=true>\\n追加のお知らせ',publishedAt:Date.now()});refreshNoticesForTest(true)")
    assert await bell.evaluate("el=>el.classList.contains('has-unread')");assert await page.locator('#modalHost').is_hidden()
    await open_notices();assert await page.locator('.announcement-item.is-unread').count()==1
    assert await page.locator('.announcement-item').first.locator('img').count()==0
    assert await page.evaluate('!!window.badNotice') is False
    await close_notices()
    before=await page.evaluate('localStorage.getItem(noticeKey)');await page.evaluate('failNotices=true');await open_notices()
    assert '読み込めませんでした' in await page.locator('.announcements-content').text_content()
    assert await page.evaluate('localStorage.getItem(noticeKey)')==before
    await close_notices();await page.evaluate('failNotices=false;notices=[]');await open_notices()
    assert await page.locator('.announcements-content').text_content()=='お知らせはありません。';await close_notices()
    before=await page.evaluate('localStorage.getItem(noticeKey)');await page.evaluate('holdNotices=true')
    await bell.tap();await page.wait_for_function('typeof releaseNotices==="function"');await close_notices()
    await page.evaluate('holdNotices=false;releaseNotices()');await page.wait_for_timeout(50)
    assert await page.evaluate('localStorage.getItem(noticeKey)')==before
    await page.evaluate("localStorage.setItem(noticeKey,'0');window.dispatchEvent(new StorageEvent('storage',{key:noticeKey}));notices=Array.from({length:250},(_,i)=>({body:'お知らせ '+i,publishedAt:i+1}));refreshNoticesForTest(true)")
    assert await bell.evaluate("el=>el.classList.contains('has-unread')");assert await page.locator('#modalHost').is_hidden()
    await open_notices();assert await page.locator('.announcement-item').count()==250
    assert await page.locator('.announcement-item p').first.text_content()=='お知らせ 249'
    await page.locator('.announcements-panel').evaluate('el=>el.scrollTop=el.scrollHeight')
    assert await page.locator('.announcement-item p').last.is_visible()
    assert await page.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('emojin.announcements.')).length")==1
    assert await page.evaluate('audit.saves.length+audit.finishes.length')==0
    assert not errors,errors
    print(f'PASS {width}x{height}: top-left bell, no auto-open, body-only descending list, unread emphasis snapshot, persistence/new messages, failure/close protection, empty/all 250 entries, escaped text and no DB writes',flush=True)
    await ctx.close()
   await browser.close()
 finally:server.shutdown()
if __name__=='__main__':asyncio.run(main())
