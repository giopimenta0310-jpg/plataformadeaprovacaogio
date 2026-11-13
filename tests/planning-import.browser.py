from pathlib import Path
import argparse,tempfile,subprocess,re
p=argparse.ArgumentParser();p.add_argument('--chrome',required=True);args=p.parse_args();root=Path(__file__).resolve().parents[1]
html='<html><body><script>'+(root/'planejamento-import.js').read_text()+'</script><script>'+(root/'tests/planning-import.test.js').read_text()+'</script></body></html>'
with tempfile.TemporaryDirectory(prefix='planning-import-') as directory:
 page=Path(directory)/'test.html';page.write_text(html)
 r=subprocess.run([args.chrome,'--no-sandbox','--disable-gpu','--virtual-time-budget=3000','--dump-dom',page.as_uri()],capture_output=True,text=True,timeout=40)
 match=re.search(r'data-test-result="([^"]+)"',r.stdout);print(match.group(1) if match else r.stderr[-1500:]);raise SystemExit(0 if match and match.group(1).startswith('PASS:') else 1)
