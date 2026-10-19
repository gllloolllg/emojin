"""Real service-worker cache/update check on an isolated in-memory local website."""
import asyncio, http.server, threading
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
INLINE=(ROOT/'index.html').read_text().split('<script>')[-1].split('</script>')[0]
SW=(ROOT/'sw.js').read_text()
STATE={'version':1}
class Handler(http.server.BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  file=self.path.split('?')[0].strip('/') or 'index.html'
  if file=='index.html':
   body='<html><head><link rel="stylesheet" href="./style.css"></head><body><script src="./app.js"></script><script>'+INLINE+'</script></body></html>';mime='text/html'
  elif file=='app.js':
   body=f'window.shellVersion={STATE["version"]};window.busy=true;'+r'''
   window.EmojinCanReload=()=>!window.busy;
   window.EmojinPrepareReload=()=>{if(window.busy)return false;window.busy=true;return true;};
   window.EmojinCancelReload=()=>{window.busy=false;};''';mime='application/javascript'
  elif file=='sw.js':body=SW+'\nself.testWorkerVersion='+str(STATE['version'])+';';mime='application/javascript'
  elif file=='style.css':body='body{color:rgb('+str(STATE['version'])+',0,0)}';mime='text/css'
  else:body='{}';mime='application/json'
  self.send_response(200);self.send_header('Content-Type',mime);self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body.encode())
async def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   ctx=await browser.new_context();url='http://127.0.0.1:'+str(server.server_address[1])+'/'
   first=await ctx.new_page();await first.goto(url);await first.wait_for_function('!!navigator.serviceWorker.controller')
   second=await ctx.new_page();await second.goto(url);await second.wait_for_function('!!navigator.serviceWorker.controller')
   STATE['version']=2
   await first.evaluate('async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();}')
   await first.wait_for_function('async()=>!!(await navigator.serviceWorker.getRegistration()).waiting')
   await first.evaluate("async()=>{const r=await navigator.serviceWorker.getRegistration();r.active.postMessage({type:'CHECK_SHELL',current:'old'},[new MessageChannel().port2]);}")
   await first.wait_for_timeout(1200)
   assert await first.evaluate('shellVersion')==1 and await second.evaluate('shellVersion')==1
   await first.evaluate('busy=false')
   # Trigger the existing check path so the normal safe shell application can run.
   await first.evaluate("window.dispatchEvent(new Event('online'))")
   await first.wait_for_function('window.shellVersion===2',timeout=12000)
   assert await second.evaluate('shellVersion')==1 and await second.evaluate('busy')==True
   assert await first.evaluate('async()=>!!(await navigator.serviceWorker.getRegistration()).waiting')
   await second.close();await first.close()
   fresh=await ctx.new_page();await fresh.goto(url);await fresh.wait_for_function('!!navigator.serviceWorker.controller')
   assert await fresh.evaluate('shellVersion')==2
   await browser.close()
   print('PASS real PWA: busy tabs keep old shell; idle tab safely updates; new worker waits for old clients; fresh page receives complete v2 shell')
 finally:server.shutdown()
asyncio.run(main())
