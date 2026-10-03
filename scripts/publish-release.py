"""Publish a verified, pushed tag and ZIP without persisting credentials."""
import json, os, ssl, subprocess, urllib.request, urllib.parse
from pathlib import Path
root=Path(__file__).resolve().parent.parent
version=json.loads((root/'manifest.json').read_text())['version']
tag='v'+version
repo='corrrycrazycoxing/study-assistant-extension'
remote=subprocess.check_output(['git','remote','get-url','origin'],cwd=root,text=True).strip()
assert remote in ['https://github.com/'+repo+'.git','https://github.com/'+repo], 'Unexpected origin'
assert not subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True).strip(), 'Worktree must be clean'
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
tag_commit=subprocess.check_output(['git','rev-parse',tag],cwd=root,text=True).strip()
subprocess.run(['git','merge-base','--is-ancestor',tag,'HEAD'],cwd=root,check=True)
# A post-tag handoff fix may change release tooling, but never packaged files.
packaged=['manifest.json','LICENSE','PRIVACY.md','TERMS.md','README.md','CHANGELOG.md','assets','background','content-scripts','popup','shared','sidepanel']
subprocess.run(['git','diff','--exit-code',tag,'HEAD','--',*packaged],cwd=root,check=True,stdout=subprocess.DEVNULL)
refs=subprocess.check_output(['git','ls-remote','origin','refs/heads/main','refs/tags/'+tag],cwd=root,text=True)
assert head+'\trefs/heads/main' in refs and tag_commit+'\trefs/tags/'+tag in refs, 'Push source and tag first'
subprocess.run(['node','scripts/check.cjs'],cwd=root,check=True)
subprocess.run(['python3','scripts/package.py',tag],cwd=root,check=True)
credential=subprocess.check_output(['git','credential','fill'],input='protocol=https\nhost=github.com\n\n',text=True)
secret=dict(line.split('=',1) for line in credential.splitlines() if '=' in line)['password']
# macOS framework Python may not load the same CA bundle as Git/curl.
ca_file='/etc/ssl/cert.pem' if os.path.isfile('/etc/ssl/cert.pem') else None
tls=ssl.create_default_context(cafile=ca_file)
def request(url,data=None,content_type='application/json'):
 req=urllib.request.Request(url,data=data,headers={'Authorization':'Bearer '+secret,'Accept':'application/vnd.github+json','Content-Type':content_type,'User-Agent':'study-assistant-release'})
 with urllib.request.urlopen(req,context=tls) as response: return json.load(response)
# Creating an existing tag's release fails rather than replacing it.
release=request('https://api.github.com/repos/'+repo+'/releases',json.dumps({'tag_name':tag,'target_commitish':tag_commit,'name':'Study Assistant '+tag,'body':(root/'RELEASE-NOTES.md').read_text(),'draft':True}).encode())
archive=root/'dist'/('study-assistant-'+version+'.zip')
asset=request(release['upload_url'].split('{')[0]+'?name='+urllib.parse.quote(archive.name),archive.read_bytes(),'application/zip')
assert asset['size']==archive.stat().st_size and asset['state']=='uploaded'
req=urllib.request.Request(release['url'],data=json.dumps({'draft':False,'make_latest':'true'}).encode(),method='PATCH',headers={'Authorization':'Bearer '+secret,'Accept':'application/vnd.github+json','Content-Type':'application/json','User-Agent':'study-assistant-release'})
with urllib.request.urlopen(req,context=tls) as response: published=json.load(response)
print('Published:',published['html_url'])
print('Asset:',asset['browser_download_url'])
