# Study Assistant 2.1.1 verification — September 30, 2026

## Journal worksheet fix

Read-only inspection of the open Connect worksheet identified a nested table layout. The old `tbody tr` descendant selector matched eight rows, including the sheet heading through an outer table’s tbody. The corrected parser reads the sheet’s own tbody row groups and direct cells: seven answer rows, none unsupported. No live answers were changed, AI requests sent, or Record entry, Check my work or Submit controls activated.

A local synthetic fixture reproduces the same table nesting. It confirms the old selector includes the heading; the updated production parser skips that heading and also accepts headings inside the worksheet tbody. Full synthetic checks passed for both journal transactions, native account and amount commits, pause before recording, record-once behavior, existing-entry preservation and explicit replacement. Incomplete rows, read-only edits, stale transactions, formulas, unknown accounts, changed questions and cancelled responses still reject. Native choice/text/select checks also passed. A separate paced Stop check confirms no entry or recording occurs after cancellation.

JavaScript syntax, packaged manifest/HTML file paths, and ZIP integrity are checked before delivery. The local adapter differs from production only in its localhost route guards. The native model fixture is simulated; the patch has not been installed or tested for live answer entry or server persistence.

## Inherited coverage

The 2.1 verification is retained in docs/VERIFICATION-2.1.md and 2.0 verification in docs/VERIFICATION-2.0.md. Those are historical checks, not newly repeated live validation. Worker routing, AI connectors, source routing, settings and all other platform adapters retain 2.1 behavior, apart from displayed version numbers.
