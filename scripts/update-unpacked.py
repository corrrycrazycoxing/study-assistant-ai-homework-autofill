#!/usr/bin/env python3
"""Update an unpacked Study Assistant folder from its latest GitHub release.

Run with --check to compare versions. Run with --apply to replace the extension
files in place; Chrome still requires a manual Reload on chrome://extensions.
"""
import argparse
import json
import shutil
import tempfile
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath

REPO = 'corrrycrazycoxing/study-assistant-extension'
API = f'https://api.github.com/repos/{REPO}/releases/latest'
HEADERS = {'Accept': 'application/vnd.github+json', 'User-Agent': 'study-assistant-updater'}
PACKAGE_ROOTS = {'assets', 'background', 'content-scripts', 'popup', 'shared', 'sidepanel'}
PACKAGE_FILES = {'manifest.json', 'LICENSE', 'PRIVACY.md', 'TERMS.md', 'README.md', 'CHANGELOG.md'}


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=30) as response:
        return response.read()


def version(value):
    pieces = value.split('.')
    if len(pieces) != 3 or any(not piece.isdecimal() for piece in pieces):
        raise ValueError(f'Invalid version: {value}')
    return tuple(map(int, pieces))


def verify_archive(archive, expected):
    if archive.testzip() is not None:
        raise ValueError('Release ZIP failed integrity check')
    names = archive.namelist()
    if not names or 'manifest.json' not in names:
        raise ValueError('Release ZIP has no root manifest')
    if len(names) != len(set(names)):
        raise ValueError('Release ZIP contains duplicate paths')
    for name in names:
        path = PurePosixPath(name)
        if path.is_absolute() or '..' in path.parts or not path.parts or not (
            path.parts[0] in PACKAGE_ROOTS or name in PACKAGE_FILES
        ):
            raise ValueError(f'Unexpected release path: {name}')
    manifest = json.loads(archive.read('manifest.json'))
    if manifest.get('version') != expected or manifest.get('name', '').find('Study Assistant') < 0:
        raise ValueError('Release manifest does not match the release tag')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('install_dir', type=Path, help='folder loaded with Chrome Load unpacked')
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--check', action='store_true', help='compare installed and latest versions')
    mode.add_argument('--apply', action='store_true', help='install latest release in this folder')
    args = parser.parse_args()
    folder = args.install_dir.expanduser().resolve()
    installed = json.loads((folder / 'manifest.json').read_text())
    if 'Study Assistant' not in installed.get('name', ''):
        parser.error('The selected folder is not a Study Assistant installation')
    release = json.loads(fetch(API))
    latest = release['tag_name'].removeprefix('v')
    version(latest)
    current = installed['version']
    if version(latest) <= version(current):
        print(f'Already current: {current}')
        return
    print(f'Update available: {current} → {latest}')
    if args.check:
        return
    asset_name = f'study-assistant-{latest}.zip'
    asset = next((item for item in release.get('assets', []) if item['name'] == asset_name), None)
    if asset is None:
        raise ValueError(f'Release has no {asset_name} asset')
    with tempfile.TemporaryDirectory(prefix='study-assistant-update-') as temporary:
        temp = Path(temporary)
        zip_path = temp / asset_name
        zip_path.write_bytes(fetch(asset['browser_download_url']))
        with zipfile.ZipFile(zip_path) as archive:
            verify_archive(archive, latest)
            archive.extractall(temp / 'new')
        old = temp / 'old'
        old.mkdir()
        moved = []
        try:
            for name in sorted(PACKAGE_ROOTS | PACKAGE_FILES):
                source = temp / 'new' / name
                target = folder / name
                if not source.exists():
                    continue
                if target.exists():
                    target.rename(old / name)
                moved.append(name)
                shutil.move(str(source), str(target))
        except Exception:
            for name in reversed(moved):
                target = folder / name
                if target.is_dir():
                    shutil.rmtree(target)
                elif target.exists():
                    target.unlink()
                if (old / name).exists():
                    (old / name).rename(target)
            raise
    print(f'Installed {latest}. In chrome://extensions, click Reload for Study Assistant, then refresh assignment and AI tabs.')


if __name__ == '__main__':
    main()
