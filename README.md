# Study Assistant — AI Homework Autofill (2.8.1)

Autofill supported homework fields on **McGraw Connect, Pearson MyLab, Canvas and MindTap** using a connected ChatGPT, Gemini or DeepSeek tab. Review answers before final submission.

## How it works

Open a supported assignment and a connected AI tab, then open the Study Assistant side panel. **Ask AI** sends the current question and displays an answer preview. **Fill answers** enters supported values. **Start Auto** repeats those steps as you move through the assignment and shows its progress. For Canvas reading quizzes, you can also prepare a matched NotebookLM source from a configured reading list before starting. Review the entries and submit the assignment yourself.

## Download and install

**[Download Study Assistant 2.8.1 for Chrome (ZIP)](https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/download/v2.8.1/study-assistant-2.8.1.zip)** · [Latest release](https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/latest)

1. Download the ZIP above and **extract it**. Keep the extracted folder; Chrome cannot load the ZIP itself.
2. In Chrome, open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the extracted folder that contains `manifest.json` directly, for this release, **Study-Assistant-2.8.1**. Do not select the ZIP or its parent folder.
4. Open a supported assignment, reload that tab and your AI tab, then click the Study Assistant extension icon to open its side panel. On first use, read the warning and complete the walkthrough before starting.

To update a previous unpacked installation, either use the optional helper described under [Updating an unpacked installation](#updating-an-unpacked-installation), or download and extract the new ZIP and load its folder in `chrome://extensions`. A GitHub release does not update local files automatically. Reload Study Assistant in Chrome after replacing the files, then reopen your assignment, course dashboard or assignment-list tabs, and connected AI tabs so they load the new controls.


[Latest GitHub release](https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/latest) · [Changelog](CHANGELOG.md) · [Versioning and release process](VERSIONING.md) · [Privacy policy](PRIVACY.md) · [Terms of use](TERMS.md) · [Publication checklist](PUBLISHING.md) · [Security notes](SECURITY.md)

## What changed recently

- **2.8.1:** Canvas Course Auto opens as a compact panel. On first open, acknowledge the warning and walkthrough before starting. The README explains the current controls and the rules for future panels.
- **2.8.0:** Adds Canvas course selection for McGraw homework, Canvas quiz source preparation and batching, and shared assignment controls. Extends support for SmartBook matching, Connect worksheets, Pearson references and MindTap graphs. See the [2.8.0 release notes](https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/tag/v2.8.0).
- **2.7.4:** Repairs Pearson Course Auto start, native Save and return-to-list transitions; adds speed selection, optional started work, progress and a saved issues report. Reconnects idle disconnected chatbot tabs with “Tab reloading…” progress. Includes Pearson dropdown/math fixes, Connect video/check-result fixes and MindTap question traversal. The last Pearson homework completed at 35/35 in a live run. The review report can still list some already-correct questions as having no editable fields. See [release notes](RELEASE-NOTES.md).
- **2.7.3:** MindTap Course Mode detects course outlines inside its web components and follows course/assignment navigation. In-progress assignments stay excluded by default; an opt-in checkbox and confirmation prompt let you include them. First-use setup appears again after updating so existing users see the latest walkthrough. Case variations in MindTap status labels are supported, and empty scans report filter counts to aid diagnosis. The Course Mode warning and manual review/submission gates remain.
- **2.7.2:** Adds an always-visible **How to update** link beside the version status. **Refresh** now checks GitHub Releases immediately as well as refreshing the panel connection, so cached status cannot hide a newly published release for hours.
- **2.7.1:** Hides MindTap Course Mode during a solo assignment and keeps its outline card collapsed until opened. It appears again at course-level review checkpoints and shows a prominent warning to verify results and completion in MindTap. The live queue still needs a safe not-started assignment for end-to-end verification.
- **2.7.0:** Adds MindTap Course Mode with Apply It grade-counting work selected by default and checkboxes for optional Study It, Learn It and other assessment sections. It opens only visible, supported activities MindTap marks Not started; it excludes media, quizzes, tests and exams, and leaves assignment review/submission to you. Instant, Timed and Human pace preferences are now shared across supported platforms. See the [MindTap course mock](docs/mindtap-course-mock.html) and [release notes](RELEASE-NOTES.md). The live outline selectors were verified read-only; no eligible Apply It test assignment was available for an end-to-end run.
- **2.6.0:** Adds Pearson Course Mode for eligible, unstarted homework and lessons; supported linked-table/printout capture; safer handling of choice-revealed fields and Pearson math-editor re-renders; and installed/latest version status in the panel. Course Mode saves between assignments, tracks pending media for final review, and reports skipped questions. See the [local course mock](docs/pearson-course-mock.html) and [release notes](RELEASE-NOTES.md). Synthetic tests pass; a full live Pearson run has not been verified.
- **2.5.13:** Pearson Auto recognizes the “Nice work!” result screen and uses its Next question button. If that button is missing, Auto stops for review. New installs leave Pause after fill off by default; existing preferences are preserved.
- **2.5.12:** Pearson custom dropdowns load choices through Pearson's widget before selecting. Verified all three dropdowns of the reported live question without pressing Check answer.
- **2.5.11:** Renamed the GitHub repository to match Study Assistant — AI Homework Autofill. Project links and update tools now use the new address; extension behavior is unchanged.
- **2.5.10:** The GitHub front page now shows current changes and links to the full version history. Extension behavior is unchanged.
- **2.5.9:** Improved Pearson custom dropdown label matching. The small assistant flags questions needing attention and links to the side panel. AI-tab reloads return to the assignment tab, and the mode walkthrough fits the panel.
- **2.5.7–2.5.8:** Added Guided Answers, shortened the on-page assistant, improved first-use guidance, and cleaned up public documentation.
- **2.5.5–2.5.6:** Improved Pearson graded-control detection, panel scrolling, Canvas save verification, and the optional updater for unpacked installs.

Read the [complete changelog](CHANGELOG.md) for every version, or open [GitHub Releases](https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases) for downloadable packages and release notes. The [versioning policy](VERSIONING.md) keeps the manifest, changelog, ZIP, tag and GitHub release title aligned. [Earlier feature notes](docs/FEATURE-HISTORY.md) are archived separately.

## Getting update notifications

On GitHub, choose **Watch → Custom → Releases** to receive notifications when a new version is published. Each release should have a matching `vX.Y.Z` tag, release notes and an installable extension ZIP. A commit alone is not a release notification. See [GitHub's release guidance](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).

Chrome Web Store installations use Chrome's automatic updates. The side panel shows **Update ready** and the version when Chrome reports a downloaded update. It does not poll GitHub, force a reload or interrupt a run. Chrome may install an update while the extension is idle, so a notice is not guaranteed to remain visible. See [Chrome's runtime update API](https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onUpdateAvailable).

If installed using **Load unpacked** from a GitHub download, update manually: download the new release ZIP, extract it, reload the extension in `chrome://extensions`, then reload the assignment tab, Pearson course or assignment-list tab, and AI tabs. Unpacked installations do not receive Chrome Web Store updates.

### Updating an unpacked installation

The panel checks GitHub Releases and shows when a newer version exists. It cannot install GitHub files itself. Click **How to update** beside the version status at any time, or **Updater instructions** in the update notice, for these steps. Click the panel’s **Refresh** button to force a new release check instead of using its cached status:

1. If you have a local project source checkout, run `python3 scripts/update-unpacked.py "/path/to/the/folder/Chrome-loaded" --check` from that checkout. Replace `--check` with `--apply` to install the latest release into that same loaded folder. The helper verifies the release ZIP/version and preserves unrelated files. The helper is in the source checkout, not in the extension ZIP.
2. If you do not have a source checkout, use the manual ZIP route above: download the latest release, extract it, and load its folder from `chrome://extensions` (remove or disable the previous copy if Chrome would otherwise keep two installs).
3. In `chrome://extensions`, click **Reload** for Study Assistant after the files have been updated. Then reload the assignment tab, Pearson course or assignment-list tab, and connected AI tabs. Reloading the assignment alone will not reinject Pearson Course Mode into an older course-list tab.

The panel’s **Open Chrome extensions** button only opens the reload page; it does not download or apply the update. Keep the prior release ZIP if you may need to roll back. This helper is a local command, not a background Chrome update.

## Panel status and saved progress

The assignment toolbar gives quick access to pace, **Controls**, and **Start Auto**. Use **Open** and **Collapse** on the floating panel. While the Chrome side panel is connected, it shows the same run and the floating panel is hidden. Closing the side panel restores the page controls.

The question progress bar shows **Read**, **Ask AI**, **Prepare**, **Enter**, and **Check**. The panel also shows the runtime build, confirmed-question count, answer preview, and active countdown. **Nerd mode** shows the structured response. The AI cards open or focus service tabs and show their connection status. Expand **Saved progress** or **Reading sources** for more detail. Use **Stop all** to stop work even when an assignment is disconnected.

**Canvas Course Auto** has its own course and assignment progress. Open the card on Canvas or in the Chrome side panel. The first time you open it, read the warning and walkthrough and click **I understand**. The acknowledgement carries over between the two panels. **Collapse** keeps status, progress, and **Stop Course Auto** accessible during a run.

Disconnected chatbot tabs can reconnect automatically before the next question is sent. The Ask AI stage shows **Tab reloading…**. Unsent drafts, attachments and running responses block automatic reload, and accepted questions are never replayed.

Modern adapters stop after a document reload instead of automatically continuing. Use **Resume saved run** for a recent checkpoint; it never starts on its own. Canvas preserves confirmed question hashes and existing entries. MindTap, Pearson and Connect require partly entered answers to be reviewed/saved manually and an unanswered question opened first. Interrupted grading or an uncertain save/navigation is blocked for manual review; use Start Auto after resolving that transition. Original SmartBook/older Connect retain current-question restart behavior and have no saved-progress recovery.

Connect stores a hashed marker only after a journal transaction is confirmed recorded. Canvas stores question markers after its simulated/observed save condition; MindTap increments progress after save/advance succeeds. The count is a local record, not proof of a live server grade or save. Persistent checkpoints hold only platform, count, opaque markers, phase and timestamp—no question text, answers, images, raw URLs or credentials. At most 20 checkpoints are retained; entries older than seven days cannot be restored and are pruned on the next write. **Clear saved progress** removes this assignment’s checkpoint; Start Auto starts a fresh count. The temporary preview/request data remains in Chrome session storage for the active workflow.

The extension’s original book-and-spark artwork and generation prompt are documented in **assets/ICON-DESIGN.md**. The three chatbot icons are bundled PNGs from public official assets. See **assets/ATTRIBUTION.md** for sources and trademark ownership.

## Platform controls and settings

Click **McGraw**, **Pearson**, **Canvas** or **MindTap** under **Settings for** to edit that platform's options. This selection edits settings; **Run on** controls which adapters may run. The preferred AI model is shared. Another ready supported chatbot is used if the preferred one is unavailable. Only one assignment run/request can use the AI connection at a time.

- **McGraw-Hill.** Use the shared controls on SmartBook, older EZTO Connect, and the Connect MAP player. MAP supports choices, True/False buttons, text, selects, numeric worksheets, and journal entries. It verifies supported entries across transaction and Required tabs and uses **Record entry**, **Check my work**, and **Next** when available. SmartBook matching reads draggable cards and checks whether each card stayed in its row. If placement fails, it shows the suggested matches for manual entry. Live automatic matching is still pending verification.
- **Pearson MyLab.** Open the shared assignment controls in the player. **Start Auto** supports numeric and math editors, text, dropdowns, and choices. It can read linked tables or printouts for supported questions and retry confirmed wrong homework answers with **Similar Question** when available. From the Assignments list, open **Pearson Course Mode** to choose speed and whether to include started work. **Review last run** opens the saved report. Retry saved items or clear saved scans when you want the queue to check them again.
- **Canvas quizzes.** On a supported quiz overview, **Load source** prepares the matching reading before you start the quiz. **Start Quiz Auto** prepares the source and launches the quiz. **Minimize** and **Expand** control the overview card. Inside a Classic quiz, supported questions shown together can be sent in batches. On one-question pages, Auto uses **Next** when available. New Quizzes/Learnosity support is experimental. You use **Submit Quiz** yourself. Canvas may auto-submit timed attempts.
- **Canvas Course Auto.** From the Dashboard or **Courses**, open Course Auto and use the individual checkboxes or **Select all listed courses**. Use **View all courses** if the dashboard list is incomplete. On a course’s Assignments page, **Scan and start** uses that course. Choose a shared Auto speed, whether to include started Canvas and McGraw work, and whether to skip past-due assignments. The queue opens eligible McGraw homework, then returns to Canvas when it verifies completion or you continue after review. Scored work, quizzes, and exams are skipped. **Assignments needing review** links to known assignments.
- **MindTap.** Use the shared controls in the Aplia player. Supported layouts include choices, dropdowns, categorization rows, numeric/text fields, and recognized point and curve graphs. Auto uses **Grade It Now** or **Check Answer** when available and handles **Try Another Version** or **Try Again** within the retry limit. On the course outline, open **MindTap Course Mode** to select Apply It, Study It, Learn It, or Other sections. Apply It is selected by default. In-progress work requires opt-in. Review and submit each assignment yourself between queue items.

**Pearson Course Mode** offers Instant, Timed, and Human pace. **Include started homework & lessons** is off by default. When enabled, the overview must confirm unfinished work. The queue preserves existing answers and skips completed work, tests, and quizzes. The course list shows assignment progress, and the player shows question stages. **Stop Course Auto** restores the regular assignment controls and pace. **Review last run** opens the saved report for that course. [Local preview](docs/pearson-course-controls-demo.html)

**Pause after fill** is available in the side panel and saves the selected platform’s preference. It is off by default in this build. Turn it on for an extra review pause before the adapter records, checks, or advances. **Ask AI** prepares a preview in supported adapters, and **Fill answers** applies it. **Start Auto** enters supported answers and handles the adapter’s next step. **Show Explanations** controls what appears in the preview.

**Connect MAP Auto uses Check my work before Next.** After all journal transactions are recorded or all supported Required worksheet tabs are filled, Auto uses Check my work when available and waits for explicit correct feedback before moving on. If checking is absent or remains disabled after a brief wait, Auto continues with the verified retained answers without claiming correctness. Incorrect, incomplete or unclear returned results still stop for review; Auto does not replay an uncertain check. Checking may consume a website attempt. Final assignment submission remains manual.

**Connect MAP Full Auto** also moves past recognized video, instruction and reference pages with no answer fields, then continues on the next supported question. Those pages are not sent to AI or counted as answered. Unsupported answer widgets and missing question data still stop for attention. Auto stops at the final page for your review and manual submission.

## Automation pace and feature guide

**Automation pace is shared across supported platforms**, shown as four illustrated cards. Platform-specific settings such as Pause after fill remain separate. Help in the side panel opens a plain-language feature guide in place; the Settings feature guide returns to Settings when closed. The default is **Instant Auto** and it preserves full automatic answering without an added review countdown. Guided Answers is a separate mode for reading suggestions and entering answers yourself.

- **Instant Auto:** automatic input and supported navigation.
- **Timed Auto:** automatic input after a visible countdown for each answer field/group or journal cell; another countdown before checking, saving or advancing.
- **Human pace:** automatic input with an AI-estimated working-time countdown for this question.
- **Guided Answers:** shows the answer and explanation; you enter and navigate yourself.

The timer has **Pause**, **Continue now** and **Stop**. Stop cancels the pending input/advance and leaves already entered values. **Pause After Fill / Pause Before Submit** is independent: switch it off for continuous automation in Instant Auto or Timed Auto, or keep it on for an additional review before saving. Timed Auto does not require pressing Continue. Guided Answers does not run an automatic countdown or enter answers.

The chatbot can return a suggested total review budget. The extension bounds it between your minimum and maximum, uses a configured fallback when absent, and divides it across fields/groups or journal cells (account, debit and credit separately). Before-advance seconds are additional. Defaults: fallback 30 seconds, minimum 5, maximum 120, before-advance 3. Suggestions are estimates, not measured reading times. Matching in original SmartBook uses one review period before its existing matching routine; it does not pace each drag.

Countdowns are local and can run late if Chrome suspends/backgrounds a tab. Website quiz timers, autosave and input logging continue normally. There are no simulated human keystrokes, fake cursor movements or detection-evasion features.

## Optional picture questions — experimental

**Include Question Pictures** is off by default. Enable it for the desired platform, activate the assignment tab, click the extension icon once, then use the side panel and start from the assignment controls. Chrome's temporary [activeTab grant](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) permits [visible-tab capture](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab); navigating to another origin may require clicking the icon again.

The extension finds visible question graphics, translates iframe coordinates, captures the active assignment and crops to the graphics before sending the image. It scrolls to each graphic separately and stacks up to eight pictures in page order; they do not need to fit on screen together. Each individual picture must still fit fully in the assignment viewport. A clipped or oversized picture stops the request. The combined image is limited to 2 MB, tied to one tab/frame/document/request, and expires after 30 seconds if unused. Capture does not run with another assignment's request in progress. Keep the assignment active until capture finishes.

Gemini or ChatGPT receives the cropped picture with the question. DeepSeek's picture interface is not supported; an open ready Gemini/ChatGPT tab is required. When NotebookLM is preferred and open, the flow is **picture → chatbot visual description → selected notebook readings → chatbot answer formatting with the original picture**. NotebookLM receives the description, not the image itself. No AI-written code is executed.

Upload controls and readiness checks were tested with synthetic browser previews; Gemini's current live upload controls were inspected without sending an image. Real chatbot uploads and live picture-based answers have not been tested end to end. UI changes, image quality and model mistakes can still require manual entry. Recognized MindTap point graphs, ungraded curve scenarios and single qualitative Supply/Demand curve-shift answers have dedicated controls and retention checks. Other drawing, video and specialized widgets remain unsupported even when a picture is captured.

## NotebookLM

**Prefer NotebookLM** is on by default for Canvas and off by default for the other platforms. You can enable it separately for any platform.

Open a notebook with the relevant sources selected. If several notebooks are open, select **Readings notebook for this platform**. A ready notebook you choose can be used independently of automatic source matching. Keep a regular chatbot open for requests that need formatting or a picture description.

For Canvas, go to **Settings → Canvas → AI & readings** to load a Google Doc containing links to assigned readings. Enable automatic reading preparation to match quiz titles or instructions to the reading list. The quiz overview’s **Load source** control prepares the match before the timer starts. Long quizzes split into batches sized to fit the NotebookLM prompt box.

NotebookLM answers from the selected sources. The extension uses validated structured answers directly and uses a regular chatbot for formatting when needed. A ready regular chatbot can answer directly when no notebook is selected or available for a request. If you explicitly select a notebook, open it and select the relevant sources before retrying.

**Notebook cleanup** offers two separate opt-ins. At the notebook limit, preparation can delete one unused notebook created by the extension and retry. After use, cleanup opens the tracked notebook’s confirmation so you can review and confirm deletion. Personal and unverified notebooks are excluded.

## School-hosted Canvas

In Canvas settings, open the school’s HTTPS Canvas page in the active tab, enter its origin and click **Enable this Canvas site**. The extension uses Chrome’s temporary active-tab access to inject the adapter into that tab only; enable it again after a reload or origin change. Built-in support includes Instructure subdomains and canvas.csuchico.edu. The custom-site control grants access to the active tab.

## Limits and verification

All four adapters and the original SmartBook code were checked in Chrome using synthetic questions, AI replies and saves. The Connect journal tests verify native model commits, record-before-advance, existing-answer conflicts and cancellation. Pearson 2.0 tests use a synthetic editor bridge contract; previous native vendor-editor verification is separate. New Quiz patterns and image uploads remain experimental. See **VERIFICATION.md** for the precise test scope.

The latest Pearson dropdown markup was inspected on a live page, but answer entry and navigation were verified with synthetic fixtures rather than a live assignment. Other live chatbot and platform flows remain incompletely verified. It does not promise support for every question/player layout. Canvas itself may auto-submit timed quizzes. Programmatic inputs may be distinguished and logged; hidden instructor/server-side flags were not inspected.

## Panel design rules for contributors

- **Every new panel must collapse.** Start floating panels as compact, keyboard-accessible launchers. Use a visible Open/Collapse control with `aria-expanded` and `aria-controls`. Collapsing must preserve selections and active runs. Keep live status, progress, and Stop available while the options are collapsed.
- **Show the warning and walkthrough on first open.** Explain what the feature does, what it may change, how to start and stop, and which steps the user must review or submit. Require an explicit acknowledgement before the first run, remember it per feature and warning version, and keep the walkthrough available afterward. The shared first-use setup still applies.
- **Reuse the shared controls.** Use `StudyAssignmentUI` and `StudyMonitor` for assignment actions, status, and progress. Use `StudyCourseUI` for course controls. The toolbar provides quick access, and the side panel and page panel mirror the same run. Hide the floating duplicate while the side panel is connected and restore it when that connection closes. Keep native site controls accessible.
- **Keep the same progress and recovery conventions.** Use Read, Ask AI, Prepare, Enter, and Check for a question. Use course and assignment counts for course queues. Show actionable issues, link to known assignments in the review report, and make Stop easy to find. Final submission remains manual.
- **Update the user guide with the controls.** Revise the affected README usage sections in the same change. Use the labels shown in the interface and explain where to find new controls, what their defaults are, and what happens when they are used.
- **Verify both surfaces before shipping.** Check first open, acknowledgement, reopening, collapse during an active run, and the side-panel handoff. Verify on the current build and distinguish fixture results from live checks.

See [Shared controls and build identity](docs/unified-controls.md) for implementation details.

## Permissions and source

Required host access is limited to the named learning platforms and AI services. Custom Canvas access uses Chrome’s active-tab grant. Importing a reading list prompts for optional Google Docs access. Settings use Chrome storage; pending requests and run metadata use session storage. Visible question text/options, optional notebook answers and optional cropped question pictures are sent to the selected AI services. The full capture is cropped in memory; only the crop enters session storage for delivery, and it is cleared after completion/cancellation. No API keys, login cookies or authentication tokens are read. Hidden answer APIs are not used by the shared worker.

Original MIT license and attribution are retained in LICENSE. The supplied Auto-McGraw code is the basis of the McGraw adapters; its old per-provider AI scripts and release updater are replaced with one correlated connection and this unified settings page. No proprietary Pearson/Cengage source library or question bank is bundled. The extension is unofficial and unaffiliated with the platforms or AI providers.
