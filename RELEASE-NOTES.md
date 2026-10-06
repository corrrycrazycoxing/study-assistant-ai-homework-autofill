Study Assistant 2.6.0

Pearson Course Mode adds a fixed, collapsible course launcher for the MyLab assignments page. Go checks assignment scores and opens only confirmed zero-score homework or lessons that are not started, using Pearson’s Start action or first question link. It leaves scored, resumed, unclear and exam items unopened, saves work between assignments, and continues question work while tracking pending media separately. A large final review links back to assignments with pending media and lists skipped questions or unopened assignments. It does not use final Submit.

Other Pearson updates include reading supported linked data tables and analysis printouts into the question context, detecting missing source material so the assistant does not guess, handling extra answer fields revealed by a selected choice, and continuing safely when Pearson re-renders its math editor. The course launcher stays fixed in the page corner and starts collapsed. Help and the walkthrough now explain Course Mode and its review panel.

The side panel now reports the installed version and checks GitHub for the latest release, with a direct Releases link. The check is cached for six hours and reports if it cannot reach GitHub.

Course Mode and its Pearson-style mock were exercised with local synthetic tests, including unsupported linked-source questions, pending-media review, Start and first-question entry, the started-assignment gate, Save, next-assignment flow and end-of-run review. This does not verify the live Pearson site or replace checking the published build with a non-graded assignment. Pearson may record a media item after its media route returns, but Course Mode leaves that item flagged until you verify its status.

This release also includes the 2.5.13 result-dialog Next fix and the new-install Pause after fill default (existing preferences remain unchanged).

The ZIP extracts to one Study-Assistant-2.6.0 folder. In Chrome Extensions, enable Developer mode, choose Load unpacked, and select that extracted folder.
