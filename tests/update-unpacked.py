"""Offline regression checks for the unpacked installer."""
import importlib.util
import io
import json
import tempfile
import unittest
from unittest.mock import patch
import zipfile
from pathlib import Path

script = Path(__file__).resolve().parents[1] / 'scripts' / 'update-unpacked.py'
spec = importlib.util.spec_from_file_location('updater', script)
updater = importlib.util.module_from_spec(spec)
spec.loader.exec_module(updater)


def archive(files):
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w') as bundle:
        for name, value in files.items():
            bundle.writestr(name, value)
    output.seek(0)
    return zipfile.ZipFile(output)


class UpdaterTests(unittest.TestCase):
    def test_versions(self):
        self.assertLess(updater.version('2.5.5'), updater.version('2.5.6'))
        with self.assertRaises(ValueError):
            updater.version('2.5.6-beta')

    def test_archive_validation(self):
        manifest = json.dumps({'name': 'Study Assistant', 'version': '2.5.6'})
        with archive({'manifest.json': manifest, 'popup/index.html': 'ok'}) as bundle:
            updater.verify_archive(bundle, '2.5.6')
        for files in [
            {'manifest.json': manifest, '../escape': 'bad'},
            {'manifest.json': manifest, 'evil.js': 'bad'},
            {'manifest.json': json.dumps({'name': 'Study Assistant', 'version': '1.0.0'})},
        ]:
            with self.subTest(files=list(files)):
                with archive(files) as bundle, self.assertRaises(ValueError):
                    updater.verify_archive(bundle, '2.5.6')

    def test_install_folder_is_separate_from_source(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            (folder / 'manifest.json').write_text(json.dumps({'name': 'Study Assistant', 'version': '2.5.5'}))
            (folder / 'popup').mkdir()
            (folder / 'popup' / 'old.html').write_text('old')
            (folder / 'custom.txt').write_text('preserve')
            release = {'tag_name': 'v2.5.6', 'assets': [{'name': 'study-assistant-2.5.6.zip', 'browser_download_url': 'https://example.test/archive'}]}
            payload = io.BytesIO()
            with zipfile.ZipFile(payload, 'w') as bundle:
                bundle.writestr('manifest.json', json.dumps({'name': 'Study Assistant', 'version': '2.5.6'}))
                bundle.writestr('popup/new.html', 'new')
            with patch.object(updater, 'fetch', side_effect=[json.dumps(release).encode(), payload.getvalue()]):
                with patch('sys.argv', ['update-unpacked.py', str(folder), '--apply']):
                    updater.main()
            self.assertEqual(json.loads((folder / 'manifest.json').read_text())['version'], '2.5.6')
            self.assertEqual((folder / 'popup' / 'new.html').read_text(), 'new')
            self.assertFalse((folder / 'popup' / 'old.html').exists())
            self.assertEqual((folder / 'custom.txt').read_text(), 'preserve')


if __name__ == '__main__':
    unittest.main()
