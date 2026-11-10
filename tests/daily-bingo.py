"""Daily Bingo mobile UI and interrupted-session checks, using local mocked wallet receipts."""
import asyncio,functools,http.server,importlib.util,json,subprocess,sys,threading
from pathlib import Path
from playwright.async_api import async_playwright
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/slot-any-bonus.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
MOCK=base.MOCK+r'''
window.testBingoNow=Date.parse('2026-11-10T03:00:00Z');Date.now=()=>testBingoNow;
window.bingoClaims=[];window.failBingo=false;window.holdBingo=false;
mockCloud.wallet.balance=Number(localStorage.getItem('test.bingo.balance'))||4321;
mockCloud.hatch=Number(localStorage.getItem('test.bingo.hatch'))||17;
mockCloud.claimDailyBingo=async(card,marks,day)=>{
 bingoClaims.push(card.id);
 if(failBingo)throw Error('通信を確認して再試行してください。');
 if(holdBingo)await new Promise(resolve=>window.releaseBingo=resolve);
 const key='test.bingo.receipt.'+card.id,old=localStorage.getItem(key);if(old)return JSON.parse(old);
 const reward=DailyBingo.rewards(card,marks),moji=reward.prizes.filter(r=>r.kind==='moji').reduce((n,r)=>n+r.amount,0);
 const hatch=Math.min(20-mockCloud.hatch,reward.prizes.filter(r=>r.kind==='hatch').reduce((n,r)=>n+r.amount,0));
 const record={kind:'dailyBingo',cardId:card.id,day,lines:reward.lines,moji,hatch,at:Date.now()};
 mockCloud.wallet.balance+=moji;mockCloud.hatch+=hatch;
 localStorage.setItem('test.bingo.balance',String(mockCloud.wallet.balance));localStorage.setItem('test.bingo.hatch',String(mockCloud.hatch));
 localStorage.setItem(key,JSON.stringify(record));window.dispatchEvent(new Event('emojin-wallet'));
 if(window.holdBingoResponse)await new Promise(resolve=>window.bingoCommitted=resolve);return record;
};
'''
async def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(base.Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   for width,height in [(390,844),(320,568)]:
    ctx=await browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,service_workers='block',reduced_motion='reduce')
    await ctx.add_init_script(MOCK);await ctx.route('https://**/*',lambda r:r.abort())
    source=base.SOURCE.replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{')
    # Force the last remaining index in tests; visual randomness stays separate.
    source=source.replace('B.draw(s)','B.draw(s, B.dayKey(),()=>.999999)')
    await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))
    page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/');await page.wait_for_selector('#bootScreen',state='hidden')
    await page.locator('#dailyBingoButton').tap();await page.wait_for_selector('#bingoDraw')
    assert await page.locator('.bingo-cell').count()==16 and await page.locator('.bingo-prize').count()==10
    assert await page.locator('.bingo-prize .bingo-miss').count()==1
    assert await page.locator('.bingo-prize .bingo-hatch').count()==2
    assert await page.locator('.bingo-prize .daily-moji svg').count()==7
    await page.screenshot(path=f'/tmp/emojin-bingo-card-{width}.png')
    assert await page.locator('.bingo-cell').first.evaluate('el=>{const s=getComputedStyle(el);return s.borderBottomWidth==="0px"&&s.borderTopWidth==="1px"&&s.borderLeftWidth==="1px"&&s.borderRightWidth==="1px"&&s.borderBottomLeftRadius==="0px"&&s.borderTopLeftRadius!=="0px"&&s.boxShadow==="none"}')
    # Egg auto-opens without a hint, then only the drawn tile can be punched.
    await page.locator('#bingoDraw').tap();await page.wait_for_selector('.bingo-focus',timeout=8000)
    assert await page.evaluate('EmojinCanReload()')==False
    assert await page.locator('.bingo-stage button').count()==1
    await page.screenshot(path=f'/tmp/emojin-bingo-focus-{width}.png')
    # Reload at the tile stage: no new draw, same selected tile and same day lock.
    emoji=await page.locator('.bingo-focus').text_content()
    await page.reload();await page.wait_for_selector('#bootScreen',state='hidden');await page.locator('#dailyBingoButton').tap()
    await page.wait_for_selector('.bingo-focus');assert await page.locator('.bingo-focus').text_content()==emoji
    await page.locator('.bingo-focus').tap();await page.wait_for_selector('.bingo-stage',state='detached')
    assert await page.locator('.bingo-cell.is-punched').count()==1
    assert await page.locator('.bingo-cell.is-punched').evaluate('el=>el.textContent===""&&getComputedStyle(el).backgroundColor==="rgb(0, 0, 0)"')
    assert await page.locator('.bingo-tomorrow').count()==0
    await page.screenshot(path=f'/tmp/emojin-bingo-punched-{width}.png')
    assert await page.locator('#bingoDraw').is_disabled()
    assert await page.evaluate('bingoClaims.length')==0
    # Prepare a card one cell short of two lines; normal runtime handles the win.
    await page.locator('.bingo-panel .modal-close').tap();await page.wait_for_selector('.bingo-panel',state='detached')
    await page.evaluate('''()=>{
     const B=DailyBingo,card=B.createCard(EmojinEngine.seeded(9),'bingo-win');
     card.prizes=['moji-50','moji-100','moji-500','moji-5000','moji-1000','moji-2000','moji-3000','hatch-10','hatch-3','miss'];
     localStorage.setItem('emojin.dailyBingo.emojin-49855.me',JSON.stringify({version:1,card,marks:[3,7,11,12,13,14],lastDay:'2026-11-09',pending:null,finished:false}));
     window.failBingo=true;
    }''')
    await page.locator('#dailyBingoButton').tap();await page.locator('#bingoDraw').tap()
    await page.locator('.bingo-egg').tap();await page.wait_for_selector('.bingo-focus');await page.locator('.bingo-focus').tap()
    await page.wait_for_function("document.querySelector('.bingo-status')?.textContent.includes('通信')")
    assert await page.locator('#bingoNewCard').count()==0
    assert await page.evaluate('mockCloud.wallet.balance')==4321
    await page.evaluate('failBingo=false');await page.locator('#bingoResume').tap();await page.wait_for_selector('#bingoNewCard')
    assert await page.evaluate('mockCloud.wallet.balance')==9321
    assert await page.evaluate('mockCloud.hatch')==20
    assert await page.locator('.bingo-paid').text_content()=='5,000モジを獲得・孵化＋3'
    assert await page.locator('.bingo-cell.is-win').count()==7
    await page.screenshot(path=f'/tmp/emojin-bingo-win-{width}.png')
    await page.locator('#bingoNewCard').tap();await page.wait_for_selector('#bingoDraw:disabled')
    assert await page.locator('.bingo-cell.is-punched').count()==0
    assert await page.locator('#bingoDraw').is_disabled()
    await page.evaluate("testBingoNow=Date.parse('2026-11-10T15:00:00Z')")
    await page.wait_for_selector('#bingoDraw:enabled',timeout=3000)
    # A second tab reads the same card and cannot make a second same-day draw.
    second=await ctx.new_page();await second.goto('http://127.0.0.1:'+str(server.server_address[1])+'/');await second.wait_for_selector('#bootScreen',state='hidden');await second.locator('#dailyBingoButton').tap()
    assert await second.locator('#bingoDraw').is_disabled()
    await second.close()
    # The wallet commits but its response is lost: reload claims the same receipt.
    await page.locator('.bingo-panel .modal-close').tap();await page.wait_for_selector('.bingo-panel',state='detached')
    await page.evaluate('''()=>{
     const card=DailyBingo.createCard(EmojinEngine.seeded(10),'bingo-lost-response');
     const pos=card.prizes.indexOf('moji-100');[card.prizes[0],card.prizes[pos]]=[card.prizes[pos],card.prizes[0]];
     localStorage.setItem('emojin.dailyBingo.emojin-49855.me',JSON.stringify({version:1,card,marks:[0,1,2,3],lastDay:'2026-11-11',pending:{day:'2026-11-11',index:3,phase:'claim'},finished:false}));
     window.holdBingoResponse=true;
    }''')
    await page.locator('#dailyBingoButton').tap();await page.wait_for_function('!!window.bingoCommitted')
    assert await page.evaluate('mockCloud.wallet.balance')==9421
    await page.reload();await page.wait_for_selector('#bootScreen',state='hidden');await page.locator('#dailyBingoButton').tap()
    await page.wait_for_selector('#bingoNewCard');assert await page.evaluate('mockCloud.wallet.balance')==9421
    assert not errors,errors
    print(f'PASS {width}: layout, tap/auto egg, reload resume, one daily tile, multi-line payout, retry, cap, NEW CARD day lock, JST midnight, second tab, committed-response loss',flush=True)
    await ctx.close()
   await browser.close()
 finally:server.shutdown()
asyncio.run(main())
