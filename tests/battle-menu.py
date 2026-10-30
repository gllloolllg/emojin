"""Local mobile battle-menu availability and overlap checks; no Firebase traffic."""
import asyncio,functools,http.server,importlib.util,json,threading,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/slot-any-bonus.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
MOCK=base.MOCK+r'''
const resident=(id,ownerUid,stars)=>({id,ownerUid,stars,ownerName:ownerUid,isNpc:false,emoji:'🐸',name:id,currentHp:8,maxHp:8,defeats:0,rulesVersion:4,recordVersion:0,slots:Array(6).fill('attack1'),poisoned:false,cursedSlots:[],status:'active',createdAt:Date.now(),endedAt:null});
window.menuResidents=[resident('champ','other',10),resident('mine','me',2),resident('third','third',1)];
mockCloud.getState=async()=>({player,wallet:mockCloud.wallet,draft:null,emojins:structuredClone(menuResidents),battles:[],legends:[],nextSeq:1,nextLegendSeq:1,suspendedOwnerUids:mockCloud.suspended||[],dormantOwnerUids:[]});
mockCloud.getAnnouncements=async()=>[];
mockCloud.saveBattle=async request=>{audit.battleRequest=request;throw Error('test: request reached persistence');};
const day=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
localStorage.setItem('emojin.dailyMoji.emojin-49855.me',JSON.stringify({day,phase:'done'}));
'''
async def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(base.Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   source=(ROOT/'app.js').read_text().replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{')
   source=source.replace('init().catch(err=>{',r'''window.menuTest={refresh:refreshNav,set(opts){if('busy' in opts)busy=opts.busy;if('draft' in opts)store.draft=opts.draft;if('suspended' in opts)store.suspendedOwnerUids=opts.suspended;refreshNav();}};init().catch(err=>{''')
   for width,height in [(390,844),(320,568)]:
    ctx=await browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,service_workers='block')
    await ctx.add_init_script(MOCK);await ctx.route('https://**/*',lambda r:r.abort());await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))
    page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/');await page.wait_for_selector('#bootScreen',state='hidden');await page.evaluate('menuTest.refresh()')
    toggle=page.locator('#battleMenuToggle');challenge=page.locator('#challengeBattleButton')
    assert await toggle.is_enabled()
    await page.locator('#announcementsButton').tap();await page.wait_for_selector('.announcements-panel');await page.evaluate('menuTest.refresh()')
    await page.locator('.announcements-panel .modal-close').tap();await page.wait_for_selector('.announcements-panel',state='hidden')
    assert await toggle.is_enabled()
    geometry=await toggle.evaluate("el=>{const t=el.getBoundingClientRect(),f=document.querySelector('#forceBattleButton').getBoundingClientRect(),s=el.querySelector('svg').getBoundingClientRect();return {overlap:t.bottom-f.top,width:t.width,height:t.height,svg:s.width,iconBottom:s.bottom,forceTop:f.top};}")
    assert geometry['overlap']==10 and geometry['width']>=44 and geometry['height']>=44 and geometry['svg']==24
    assert geometry['iconBottom']>geometry['forceTop']
    await toggle.tap();assert await challenge.is_enabled();await page.wait_for_timeout(220);await page.screenshot(path=f'/tmp/emojin-battle-menu-{width}.png');await toggle.tap();assert await page.locator('#battleMenu').is_hidden()
    for state,reason in [({'busy':True},'演出や保存'),({'busy':False,'draft':{'id':'pending'}},'生成を完了')]:
     await page.evaluate('opts=>menuTest.set(opts)',state);assert await toggle.is_enabled();await toggle.tap();assert await challenge.is_enabled();await challenge.tap();assert reason in await page.locator('#toast').text_content();assert await page.locator('#battleMenu').is_visible();await toggle.tap()
    await page.evaluate("mockCloud.suspended=['other'];menuTest.set({busy:false,draft:null,suspended:['other']})");await toggle.tap();assert await challenge.is_enabled();await challenge.tap();await page.wait_for_function("document.querySelector('#toast').textContent.includes('チャンピオンは休止中')");assert await page.evaluate('mockCloud.wallet.balance')==2000
    await toggle.tap()
    await page.evaluate('mockCloud.wallet.balance=199;menuTest.refresh()');assert await challenge.is_disabled();assert await toggle.is_enabled();await toggle.tap();await toggle.tap()
    await page.evaluate('mockCloud.wallet.balance=200;menuTest.refresh()');assert await challenge.is_enabled()
    # Local suspension is stale: only fresh state should decide participation.
    await page.evaluate('mockCloud.suspended=[]');await challenge.tap();await page.wait_for_function('!!audit.battleRequest');assert await page.evaluate("audit.battleRequest.mode==='challenge'&&audit.battleRequest.ids[0]==='champ'")
    await page.wait_for_selector('#battleCutin',state='hidden');assert not errors,errors
    await page.evaluate("delete audit.battleRequest;menuResidents.forEach(e=>e.ownerUid='me')")
    for button in ['challengeBattleButton','myBattleButton','forceBattleButton']:
     await page.evaluate("document.querySelector('#toast').textContent=''")
     if button!='forceBattleButton':await toggle.tap()
     await page.locator('#'+button).tap()
     await page.wait_for_function("document.querySelector('#toast').textContent.includes('別のオーナー')")
     assert await page.evaluate('!audit.battleRequest&&mockCloud.wallet.balance===200')
    assert not errors,errors
    print(f'PASS {width}: menu controls, 200 boundary, eligible request, all manual modes reject same-owner-only world without settlement')
    await ctx.close()
   await browser.close()
 finally:server.shutdown()
if __name__=='__main__':asyncio.run(main())
