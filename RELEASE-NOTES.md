Study Assistant 2.7.1

MindTap Course Mode now stays out of the way during a solo assignment. On the course activity list, its card starts collapsed and can be opened when needed. During an active queue it stays hidden while an assignment is being worked, then returns at the review/continue checkpoint.

The previous empty-queue message was misleading inside a single assignment. Course Mode now checks for the MindTap activity outline before scanning and starts only from the course-level activity list. A page without that list is not reported as an outline with zero eligible work.

Opening Course Mode now shows a prominent warning: it can miss activities or stop when a question needs attention, so users should verify each assignment’s results and completion status in MindTap. Assignment review and final submission remain manual. The existing first-use setup acknowledgement is unchanged.

Verification: `node tests/mindtap-course.cjs` and the full `node scripts/check.cjs` suite pass. `python3 scripts/package.py v2.7.1` validates the extension package. No untouched live MindTap assessment was available for an end-to-end queue run, so live course automation remains unverified.

Install: extract `study-assistant-2.7.1.zip`, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the extracted **Study-Assistant-2.7.1** folder containing `manifest.json` directly. The ZIP itself cannot be loaded.
