Study Assistant 2.5.6

This release adds an optional local updater for Chrome's Load unpacked installation. It checks the latest GitHub release, verifies the version and ZIP contents, and replaces extension files in the same folder. Chrome still requires Reload on chrome://extensions, followed by refreshing assignment and AI tabs. Run `python3 scripts/update-unpacked.py "/path/to/loaded/folder" --check` to check or use `--apply` to update. The helper is included in the GitHub source repository, not in the extension ZIP.

Canvas Classic Quiz autosave verification now signals a save from the selected answer instead of clicking a different radio option. The local Canvas and MindTap browser fixtures pass their main flows and safety cases; live site layouts remain unverified by these fixtures.

- Fixed graded Pearson controls blocking the active dropdowns in later question parts.
- The assistant panel now scrolls together, including its top controls.
- Compact clickable mode icons replace on-page pace dropdowns. Working speed uses three buttons.
- Human pace has a distinct person-and-book icon; Timed Auto keeps its clock.

Download study-assistant-2.5.6.zip, extract it, and load the folder containing manifest.json through Chrome Extensions → Developer mode → Load unpacked. Reload assignment and AI tabs after updating.

Syntax and regression checks passed. The Pearson cause was confirmed from the live page; a complete live answer-and-check run has not been reverified. Final assignment submission remains manual.
