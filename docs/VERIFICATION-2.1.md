# Study Assistant 2.1 verification — September 30, 2026

This build was checked with mocked connections, synthetic local assignments and simulated saves/grades. No new AI prompt was sent and no live assignment was filled, checked, recorded or submitted. The build has not been installed or exercised end to end against live platform servers.

## New 2.1 checks

- Worker: extension-page authorization for panel commands; rejected content-script panel inspection, stale page identities and unknown actions; exact documentId command/delivery routing; assignment-scoped SHA-256 checkpoint keys; explicit resume; count/marker restoration; seven-day expiry; no raw question/title/URL data in persistent records; blocked interrupted grading; Stop retains progress; clear removes it.
- Production panel and monitor in Chrome, with a local synthetic bridge: Ask/Fill/Start/Stop/recovery reach existing guarded controls; stale page identity rejected; countdown Pause/Continue mirrored; local controls hidden while panel connected and original display restored when released. This verifies the panel-page bridge without installing the extension. Native toolbar activation and Chrome’s actual side-panel container still need installation testing.
- Sidebar layout at 380px: no horizontal overflow; all bundled ChatGPT/OpenAI, Gemini and DeepSeek PNGs loaded. Screenshot is a synthetic preview, not a live assignment.
- Connect MAP synthetic full checks: both journal transactions committed and recorded once, pause before recording, exact numeric/native model values, conflict preservation/explicit replacement, formula/unknown account/read-only/stale transaction rejection, Stop and changed-question rejection, native field entry and unsupported control rejection. New marker writes occur after confirmed Record entry and generation guards run after storage acknowledgments.
- Canvas synthetic full flow: one request per unanswered supported question, choices/blanks/numeric/select retention, existing answer preserved, complete simulated autosave, no final Submit; invalid options rejected before filling.
- MindTap Aplia synthetic save and grade flows: exact custom dropdown/table choices, numeric/text/select values, hidden explanation exclusion, two simulated save/advance actions, no final submission. Full document reload now stops with one confirmed pre-reload answer retained; no second prompt/action occurs automatically.
- Pearson synthetic normal flow: both numeric editor bridge fields committed once, embedded numeric field identity stable, radio/select/text retained, final submission manual. Stop before paced input prevents editor and choice writes.
- Existing mocked suites passed: platform settings/isolation; four worker protocols and original McGraw translation; journal schema; screenshot token/crop/permissions; ChatGPT/Gemini/DeepSeek draft/busy/correlation/cancel/timeout; NotebookLM source/citation/correlation/cancel/timeout checks.

## Limits

Persistent recovery is conservative. A checkpoint restores confirmed local progress; it cannot prove server persistence. Partly entered answers require review. Interrupted grades or uncertain save/navigation transitions are blocked rather than replayed. Original SmartBook/older Connect have no persistent-progress recovery. Custom Canvas registration upgrades are implemented but need actual installed-extension testing. Worker and generic panel recovery were checked; every vendor reload/layout combination was not.

Canvas New Quizzes, picture uploads, live editor/DOM compatibility, matching/drag controls, duplicate credit effects and live model/source accuracy remain unverified. MindTap supports Aplia, not every Cengage player. Provider icons were obtained from public official assets and require a separate brand review for public distribution.

The earlier 2.0 verification is retained in docs/VERIFICATION-2.0.md as historical coverage, not new 2.1 live validation. The package contains no proprietary vendor editor scripts.
