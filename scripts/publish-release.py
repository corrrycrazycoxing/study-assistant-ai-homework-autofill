"""Publish a verified, pushed tag and ZIP without persisting credentials."""
import json, subprocess, urllib.request, urllib.parse
from pathlib import Path
root=Path(__file__).resolve().parent.parent
version=json.loads((root/'manifest.json').read_text())['version']
tag='v'+version
repo='corrrycrazycoxing/study-assistant-extension'
remote=subprocess.check_output(['git','remote','get-url','origin'],cwd=root,text=True).strip()
assert remote in ['https://github.com/'+repo+'.git','https://github.com/'+repo], 'Unexpected origin'
assert not subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True).strip(), 'Worktree must be clean'
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
assert subprocess.check_output(['git','rev-parse',tag],cwd=root,text=True).strip()==head, 'Tag must point at HEAD'
refs=subprocess.check_output(['git','ls-remote','origin','refs/heads/main','refs/tags/'+tag],cwd=root,text=True)
assert all(head+'\t'+ref in refs for ref in ['refs/heads/main','refs/tags/'+tag]), 'Push source and tag first'
subprocess.run(['node','scripts/check.cjs'],cwd=root,check=True)
subprocess.run(['python3','scripts/package.py',tag],cwd=root,check=True)
credential=subprocess.check_output(['git','credential','fill'],input='protocol=https\nhost=github.com\n\n',text=True)
secret=dict(line.split('=',1) for line in credential.splitlines() if '=' in line)['password']
def request(url,data=None,content_type='application/json'):
 req=urllib.request.Request(url,data=data,headers={'Authorization':'Bearer '+secret,'Accept':'application/vnd.github+json','Content-Type':content_type,'User-Agent':'study-assistant-release'})
 with urllib.request.urlopen(req) as response: return json.load(response)
# Creating an existing tag's release fails rather than replacing it.
release=request('https://api.github.com/repos/'+repo+'/releases',json.dumps({'tag_name':tag,'target_commitish':head,'name':'Study Assistant '+tag,'body':(root/'RELEASE-NOTES.md').read_text(),'draft':True}).encode())
archive=root/'dist'/('study-assistant-'+version+'.zip')
asset=request(release['upload_url'].split('{')[0]+'?name='+urllib.parse.quote(archive.name),archive.read_bytes(),'application/zip')
assert asset['size']==archive.stat().st_size and asset['state']=='uploaded'
req=urllib.request.Request(release['url'],data=json.dumps({'draft':False,'make_latest':'true'}).encode(),method='PATCH',headers={'Authorization':'Bearer '+secret,'Accept':'application/vnd.github+json','Content-Type':'application/json','User-Agent':'study-assistant-release'})
with urllib.request.urlopen(req) as response: published=json.load(response)
print('Published:',published['html_url'])
print('Asset:',asset['browser_download_url'])
