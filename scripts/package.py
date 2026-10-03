"""Build an installable archive from an explicit runtime allowlist."""
from pathlib import Path
import json, zipfile, sys
root=Path(__file__).resolve().parent.parent
manifest=json.loads((root/'manifest.json').read_text())
version=manifest['version']
if len(sys.argv)>1 and sys.argv[1] != 'v'+version:
    raise SystemExit('Tag must match manifest version')
output=root/'dist'/f'study-assistant-{version}.zip'
folder=f'Study-Assistant-{version}'
output.parent.mkdir(exist_ok=True)
files=[root/'manifest.json']
for name in ['assets','background','content-scripts','popup','shared','sidepanel']:
    files.extend(p for p in (root/name).rglob('*') if p.is_file() and not any(x.startswith('.') for x in p.relative_to(root).parts))
files.extend(root/name for name in ['LICENSE','PRIVACY.md','TERMS.md','README.md','CHANGELOG.md'])
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(files): z.write(p,folder+'/'+p.relative_to(root).as_posix())
with zipfile.ZipFile(output) as z:
    assert z.testzip() is None
    assert json.loads(z.read(folder+'/manifest.json'))['version']==version
    for entry in manifest.get('content_scripts',[]):
        for name in entry.get('js',[])+entry.get('css',[]): assert folder+'/'+name in z.namelist(), name
    assert folder+'/'+manifest['background']['service_worker'] in z.namelist()
print(output)
