# Study Assistant 2.1.2 verification — September 30, 2026

## Monitor lifecycle fix

The supplied Chrome error screenshot identifies an unhandled synchronous `Extension context invalidated` throw in the monitor’s periodic report. The old code only caught rejection after `sendMessage` returned, so an immediate throw escaped its catch.

Mocked lifecycle checks passed for normal report/command routing, temporary worker disconnection and recovery, synchronous invalidation, rejected-message invalidation, missing runtime ID, heartbeat invalidation, invalid storage/listener initialization, and invalidation while startup storage was pending. Invalidation clears the heartbeat and listener, restores local controls only with disabled actions and a reload message, hides the obsolete countdown, and prevents further monitor sends. No site answers, saves or grading controls were operated.

JavaScript syntax, manifest/HTML resource paths, production-to-fixture adapter parity and archive integrity are checked before delivery. This patch has not been installed or tested against a live Chrome extension reload. Refreshing already open assignment and AI tabs is still required; the new code cannot replace old content scripts that are already invalidated.

## Inherited coverage

Includes the 2.1.1 journal parser fix. The previous verification is retained in docs/VERIFICATION-2.1.1.md, docs/VERIFICATION-2.1.md and docs/VERIFICATION-2.0.md. Their platform/model tests were not newly repeated for this lifecycle-only patch. Other adapters, worker routing and AI/source connections retain the preceding behavior apart from version labels.
