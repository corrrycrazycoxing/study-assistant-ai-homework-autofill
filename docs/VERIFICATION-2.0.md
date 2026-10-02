# Study Assistant 2.0 verification — September 30, 2026

These checks use synthetic questions, mock AI replies and simulated saves/grades. They are not proof of live server persistence or answer correctness.

## Release checks passed

- All packaged JavaScript parses; manifest resource paths exist and script ordering includes shared pacing/capture and the image helper before adapters/connectors.
- Worker tests: four platform protocols plus new Connect MAP; exact origin/tab/frame/request ownership; wrong destination rejection; platform-mode/custom-domain authorization; one active run/request; cancellation and tab-close cleanup; original SmartBook response translation and recorded duplicate routing.
- Notebook flow: selected-source answer → formatter; picture token → vision description → selected notebook → formatter with original picture; cited response checks, unreadable image rejection and regular-chatbot fallback.
- Picture capture mock: active assignment and unchanged source URL, single-use token, tab/frame binding, CSS-to-pixel scaling and cropping, pending-request isolation, malformed/clipped bounds and missing capture grant.
- Shared connector mocks: Gemini, ChatGPT and DeepSeek draft/busy readiness, request-correlated JSON, stable-response delivery, cancellation and timeout. NotebookLM on both hosts: source selection, cited answers, source changes, uncited replies, homepage exclusion and cancellation.
- Settings tests: callback/Promise compatibility, independent platform defaults/preferences, notifications, exact website detection. Chrome preview: changing Canvas to Slow leaves McGraw at Normal; switching back retains Canvas Slow.
- Journal schema: exact account names, balanced debit/credit rows, capacity, plain numeric strings, no-entry rows and existing-entry conflict checks. Duplicate SmartBook mode rejects non-Normal pacing.

## Chrome checks passed with 2.0 code

- Pacing: inactive panel stays hidden; Normal adds no review wait; suggested time is bounded; Pause/Resume, Continue now and Stop work; Manual Review waits after reaching zero; changed question cancels a wait; Stop prevents the next input; native text setter emits input/change.
- Image helper: real browser File/DataTransfer assignment, PNG preview confirmation, existing draft protection, cancellation during upload and failed upload rejection. Uploads are simulated locally and send nothing to an AI service.
- Two nested iframe offsets/borders locate the expected graphic rectangle; clipped nested graphics are rejected. Screenshot pixel scaling is separately covered by the capture mock.
- SmartBook: multiple select, multiple choice, blanks and text selection, request ID matching and late answer rejection after Stop; pause preserves manual grading/navigation.
- New Connect MAP: native account/amount model commits, balanced journal transactions, Record entry before moving on, two transactions with final submission manual, conflict preservation and explicit replacement, invalid account/formula/stale transaction/read-only rejection, Stop/stale reply rejection, native single/multiple choice/numeric/select entry and unsupported-layout stop. A paced Stop before entry leaves model commits and records at zero; duplicate Fill/Ask buttons stay disabled during a countdown.
- Pearson: Normal and Slow entry through a synthetic editor bridge contract, numeric blanks including one inside a choice, dropdown/text/radio retention, stable question identity when editor text changes, Stop before input and final submission manual. No proprietary editor library is bundled.
- Canvas: all supported unanswered fixture fields, preserved existing answer, complete simulated autosave, Pause/Resume, late answer rejection after Stop and invalid-option rejection. No final Submit Quiz action.
- MindTap Aplia: two AI replies/save-and-advance actions, custom dropdown, separate row radios, checkbox/true-false, numeric/text/native select, hidden explanation exclusion and Pause/Resume. No final submission.

The release also checks unchanged answers before new Connect records/advances and stops on manual worksheet interaction. The original native click events are distinguished from user input in the modern adapters so normal radio entry does not accidentally cancel the run.

## Inspection and remaining limits

Gemini's current live upload menu, image file input and composer container were inspected read-only. No file was uploaded, no new chatbot prompt was sent, and no live assignment was answered/checked/recorded/submitted during this work. McGraw's formerly open session was logged out; new Connect testing used local fixtures.

2.0 has not been installed and exercised end to end on live assignments. Live image-upload compatibility, model interpretation, platform server saves, duplicate-tab grading/extra credit and live matching/drag behavior remain unverified. Earlier releases had additional local fixture coverage for Pearson's native library, Canvas page transitions/New Quiz semantics and Aplia reload/grading; those checks are historical, not new live validation of 2.0.

Canvas New Quizzes and picture uploads are experimental. MindTap support is Aplia only. Specialized graph/drawing/drag/rich editors need manual work. Website timers/autosave keep running; input activity may be distinguished or logged. Hidden instructor/server-side flags were not inspected.
