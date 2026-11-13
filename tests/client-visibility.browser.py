"""Exercise the complete app in headless Chrome with an in-memory Supabase substitute."""
from pathlib import Path
import argparse,re,subprocess,tempfile
parser=argparse.ArgumentParser();parser.add_argument('--chrome',required=True);args=parser.parse_args()
root=Path(__file__).resolve().parents[1];source=(root/'index.html').read_text()
source=re.sub(r'<script src="(?:config|supabase)\.js"></script>','',source)
source=source.replace('const sb = (window.supabase && CFG.url && CFG.key) ? window.supabase.createClient(CFG.url, CFG.key) : null;',
'''const sb = {from(...a){return window.__gridTestDB.from(...a);},rpc(...a){return window.__gridTestDB.rpc(...a);},storage:{from(...a){return window.__gridTestDB.storage.from(...a);}}};''')
needle='renderAll();\n(async () => {';assert source.count(needle)==1
source=source.replace(needle,(root/'tests/client-visibility.test.js').read_text()+'\nreturn;\n'+needle)
with tempfile.TemporaryDirectory(prefix='grid-reorder-') as directory:
 page=Path(directory)/'test.html';page.write_text(source)
 run=subprocess.run([args.chrome,'--no-sandbox','--disable-gpu','--allow-file-access-from-files','--window-size=1400,1200','--virtual-time-budget=6000','--dump-dom',page.as_uri()],capture_output=True,text=True,timeout=45)
 result=re.search(r'data-test-result="([^"]+)"',run.stdout)
 print(result.group(1) if result else run.stderr[-2000:])
 raise SystemExit(0 if result and result.group(1).startswith('PASS:') else 1)
