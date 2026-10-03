# 2.5.1 change and verification report

Prepared October 2, 2026. This report accompanies the source update and local ZIP. GitHub source-upload results are reported separately with the verified commit hash. A source push does not publish a GitHub release or Chrome Web Store update.

## Files

Added: PRIVACY.md, TERMS.md, PUBLISHING.md, CHANGELOG.md, AGENTS.md (standing authorization for future source uploads), tests/update-lifecycle.cjs and this report (docs/UPDATE-2.5.1.md).

Modified: README.md, manifest.json, background/background.js, background/panel.js, sidepanel/panel.html, sidepanel/panel.js and sidepanel/panel.css.

The installable archive is Study-Assistant-2.5.1.zip. The source directory retains its existing Study-Assistant-2.5.0 name to preserve the current Git checkout.

## Permissions and exposure

No permissions or host access were added or removed in this update. The manifest still declares no web_accessible_resources. The new update notice uses extension-owned session storage and side-panel elements. It adds no page DOM markers, main-world scripts, polling, network calls or AI-generated executable content.

No answer-validation rules were changed in 2.5.1. The new policy describes the existing modern schema/snapshot checks and the narrower protections in legacy workflows.

## Observed behavior and tests

- JavaScript syntax checks passed for all 40 .js files.
- work/security-regression.cjs passed redaction, envelope, stale/partial/unknown-response and duplicate-key cases.
- work/runtime-regression.cjs passed timing limits/profile cases and event-driven AI response/cancellation cases.
- tests/update-lifecycle.cjs passed a simulated Chrome update event, worker restart, invalid event details and installation cleanup. The active request/run remained unchanged throughout these tests.
- git diff --check passed.

The lifecycle test uses a VM with mocked Chrome APIs. A real Web Store update was not downloaded, and live delivery or visibility duration was not measured. GitHub notifications require publishing an actual release and user subscription; the new README links do not create one. Unpacked installations continue to require manual replacement and reload.

The ZIP is checked separately for archive integrity, manifest-at-root layout and excluded Git/development files. Policy pages and the remaining checklist do not constitute a completed legal or accessibility audit.
