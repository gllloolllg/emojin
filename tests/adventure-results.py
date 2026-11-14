"""End screen + global ranking transitions using local mocked services only."""
import asyncio,functools,http.server,importlib.util,threading
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/adventure.py');fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
MOCK=fixture.MOCK+r'''
window.resultBest=true;window.rankRows=[];window.rankFailure=false;window.holdRank=false;window.resultSaveCalls=0;
mockCloud.saveAdventureResult=async result=>{AdventureStore.validateResult(result);resultSaveCalls++;return {best:resultBest,score:result.score}};
mockCloud.adventureRankings=async()=>{if(holdRank)await new Promise(resolve=>window.releaseRank=resolve);if(rankFailure)throw Error('ランキング通信失敗');return rankRows};
'''
async def finish(frame,id,clear=False):
 await frame.locator('body').evaluate('''(_,[id,clear])=>{createRun({runId:id,player:parent.AdventureStore.snapshot(parent.own),legend:parent.legend});run.floor=clear?10:3;addScore('heart',100);gameover(clear)}''',[id,clear])
 await frame.locator('.gameover').wait_for()
async def ready(frame):
 await frame.locator('body').evaluate('()=>new Promise(resolve=>{const poll=()=>run.result.saving?setTimeout(poll,20):resolve();poll()})')
async def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(fixture.base.Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block');await ctx.add_init_script(MOCK);await ctx.route('https://**/*',lambda r:r.abort())
   source=fixture.base.SOURCE.replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{');await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))
   page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/');await page.wait_for_selector('#bootScreen',state='hidden');await page.locator('#adventureButton').tap();frame=page.frame_locator('#adventureFrame');await frame.locator('#start').wait_for()
   # Same score or same owner's different run does not count as this run.
   await page.evaluate("rankRows=[{runId:'adventure-other',uid:'me',score:10000,name:'me'},{runId:'adventure-best',uid:'other',score:10000,name:'Other'}]")
   await finish(frame,'adventure-best');await ready(frame);assert await frame.locator('.result-score>div').inner_text()=='ベストスコア';await frame.locator('.gameover').tap();await frame.locator('#start').wait_for()
   # Tenth place qualifies; rank-in overrides personal best.
   await page.evaluate("rankRows=Array.from({length:9},(_,i)=>({runId:'adventure-other-'+i,uid:'other',score:20000-i,name:'Other'}));rankRows.push({runId:'adventure-tenth',uid:'me',score:10000,name:'me'})")
   await finish(frame,'adventure-tenth');await ready(frame);assert await frame.locator('.result-score>div').inner_text()=='ランクイン';await frame.locator('.gameover').tap();await frame.locator('tr.current-run').wait_for();assert await frame.locator('tr.current-run').count()==1;assert await frame.locator('tr.current-run td').first.inner_text()=='10';assert await frame.locator('tr.current-run').evaluate('el=>getComputedStyle(el).animationName')=='ranked-score-blink'
   await page.screenshot(path='/tmp/emojin-adventure-ranked-result.png')
   await frame.locator('#rank-mine').tap();await frame.locator('.score-table').wait_for();assert await frame.locator('tr.current-run').count()==0;await frame.locator('#rank-all').tap();await frame.locator('.score-table').wait_for();assert await frame.locator('tr.current-run').count()==0
   await frame.locator('#back').tap();await frame.locator('#ranking').tap();await frame.locator('.score-table').wait_for();assert await frame.locator('tr.current-run').count()==0
   # Not a personal best, but a second run of the same owner can rank.
   await page.evaluate("resultBest=false;rankRows=[{runId:'adventure-old',uid:'me',score:20000,name:'me'},{runId:'adventure-second',uid:'me',score:10000,name:'me'}]")
   await finish(frame,'adventure-second');await ready(frame);assert await frame.locator('.result-score>div').inner_text()=='ランクイン';await frame.locator('.gameover').tap();await frame.locator('tr.current-run').wait_for();assert await frame.locator('tr.current-run td').first.inner_text()=='2'
   # Non-ranked, non-best result still returns to title.
   await page.evaluate('rankRows=[]');await finish(frame,'adventure-normal');await ready(frame);assert await frame.locator('.result-score>div').inner_text()=='スコア';await frame.locator('.gameover').tap();await frame.locator('#start').wait_for()
   # Saving and ranking lookup failures remain separate; lookup retry never re-saves.
   await page.evaluate('rankFailure=true');before=await page.evaluate('resultSaveCalls');await finish(frame,'adventure-retry');await ready(frame);assert 'ランキング' in await frame.locator('.footnote').inner_text();assert await page.evaluate('resultSaveCalls')==before+1
   await page.evaluate("rankFailure=false;holdRank=true;rankRows=[{runId:'adventure-retry',uid:'me',score:10000,name:'me'}]");await frame.locator('.gameover').tap();await page.wait_for_function('!!window.releaseRank');await frame.locator('.gameover').tap();assert await frame.locator('body').evaluate('()=>mode')=='gameover';await page.evaluate('holdRank=false;releaseRank()');await ready(frame);assert await page.evaluate('resultSaveCalls')==before+1;assert await frame.locator('.result-score>div').inner_text()=='ランクイン'
   # A clear uses the same final-score priority and one-visit highlight.
   await page.evaluate("resultBest=true;rankRows=[{runId:'adventure-clear',uid:'me',score:10000,name:'me'}]");await finish(frame,'adventure-clear',True);await ready(frame);assert await frame.locator('.clear h1').inner_text()=='GAME CLEAR';assert await frame.locator('.result-score>div').inner_text()=='ランクイン';await frame.locator('.clear').tap();await frame.locator('tr.current-run').wait_for()
   assert not errors,errors;await browser.close();print('PASS: best/rank priority, exact uid+run match, 10th place, multiple own runs, transient row blink, tabs and title reset, safe lookup retry, clear result')
 finally:server.shutdown()
asyncio.run(main())
