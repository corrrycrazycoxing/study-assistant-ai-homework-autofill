# Study Assistant — AI Homework Autofill (2.6.0)

Autofill supported homework fields on **McGraw Connect, Pearson MyLab, Canvas and MindTap** using a connected ChatGPT, Gemini or DeepSeek tab. Review answers before final submission.

## Download and install

**[Download Study Assistant for Chrome (ZIP)](https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/download/v2.6.0/study-assistant-2.6.0.zip)** · [Release page](https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/latest)

1. Download the ZIP above and **extract it**. Keep the extracted folder; Chrome cannot load the ZIP itself.
2. In Chrome, open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the extracted **Study-Assistant-2.6.0** folder, which contains `manifest.json` directly. Do not select the ZIP or its parent folder.
4. Open a supported assignment, reload that tab and your AI tab, then click the Study Assistant extension icon to open its side panel.

To update a previous unpacked installation, remove or disable the older copy, extract the new ZIP into its own folder, load that folder, and reload your assignment and AI tabs. The Chrome Web Store is not used for this installation.


[Latest GitHub release](https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/latest) · [Changelog](CHANGELOG.md) · [Privacy policy](PRIVACY.md) · [Terms of use](TERMS.md) · [Publication checklist](PUBLISHING.md) · [Security notes](SECURITY.md)

## What changed recently

- **2.6.0:** Pearson Course Mode works through eligible, unstarted homework and lessons in order, entering through Start or the first question link Pearson provides and saving between assignments. It leaves scored, resumed, unclear and exam items alone. Questions continue when media is still pending; the final review links back to those assignments so you can verify Pearson’s media status. Unsupported questions are reported for review. See the [local course mock](docs/pearson-course-mock.html) and [release notes](RELEASE-NOTES.md). The queue and mock workflow pass synthetic tests; a full live Pearson run has not been verified.
- **2.5.13:** Pearson Auto recognizes the “Nice work!” result screen and uses its Next question button. If that button is missing, Auto stops for review. New installs leave Pause after fill off by default; existing preferences are preserved.
- **2.5.12:** Pearson custom dropdowns load choices through Pearson's widget before selecting. Verified all three dropdowns of the reported live question without pressing Check answer.
- **2.5.11:** Renamed the GitHub repository to match Study Assistant — AI Homework Autofill. Project links and update tools now use the new address; extension behavior is unchanged.
- **2.5.10:** The GitHub front page now shows current changes and links to the full version history. Extension behavior is unchanged.
- **2.5.9:** Improved Pearson custom dropdown label matching. The small assistant flags questions needing attention and links to the side panel. AI-tab reloads return to the assignment tab, and the mode walkthrough fits the panel.
- **2.5.7–2.5.8:** Added Guided Answers, shortened the on-page assistant, improved first-use guidance, and cleaned up public documentation.
- **2.5.5–2.5.6:** Improved Pearson graded-control detection, panel scrolling, Canvas save verification, and the optional updater for unpacked installs.

Read the [complete changelog](CHANGELOG.md) for every version, or open [GitHub Releases](https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases) for downloadable packages and release notes. [Earlier feature notes](docs/FEATURE-HISTORY.md) are archived separately.

## Getting update notifications

On GitHub, choose **Watch → Custom → Releases** to receive notifications when a new version is published. Each release should have a matching `vX.Y.Z` tag, release notes and an installable extension ZIP. A commit alone is not a release notification. See [GitHub's release guidance](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).

Chrome Web Store installations use Chrome's automatic updates. The side panel shows **Update ready** and the version when Chrome reports a downloaded update. It does not poll GitHub, force a reload or interrupt a run. Chrome may install an update while the extension is idle, so a notice is not guaranteed to remain visible. See [Chrome's runtime update API](https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onUpdateAvailable).

If installed using **Load unpacked** from a GitHub download, update manually: download the new release ZIP, extract it, reload the extension in `chrome://extensions`, then reload the assignment and AI tabs. Unpacked installations do not receive Chrome Web Store updates.

For a reusable unpacked folder, the optional [update helper](scripts/update-unpacked.py) checks the latest GitHub release and replaces the extension files in that same folder. Run `python3 scripts/update-unpacked.py "/path/to/your/loaded/folder" --check` to see whether an update exists, or use `--apply` to install it. The helper keeps unrelated files in the folder and checks the release ZIP and version before replacing extension files. Then click **Reload** for Study Assistant in `chrome://extensions` and refresh assignment and AI tabs. This is a local update command, not a background Chrome update; keep a copy of the prior ZIP if you may need to roll back.

## Panel status and saved progress

The panel shows the adapter’s current status, confirmed-question count, readable answers/explanations and active review countdown. **Nerd mode** shows the original structured response. AI cards focus an existing service tab or open it; they do not send a prompt by themselves. **Saved progress** and **Reading sources** expand when needed. Pause, Continue now, Resume Auto and Stop use the existing adapter controls. **Stop all** is available even if an assignment is no longer connected. The AI cards distinguish ready tabs, missing tabs, drafts, generation/upload activity and NotebookLM source selection. They report connector readiness; they do not measure the correctness of an answer.

Modern adapters stop after a document reload instead of automatically continuing. Use **Resume saved run** for a recent checkpoint; it never starts on its own. Canvas preserves confirmed question hashes and existing entries. MindTap, Pearson and Connect require partly entered answers to be reviewed/saved manually and an unanswered question opened first. Interrupted grading or an uncertain save/navigation is blocked for manual review; use Start Auto after resolving that transition. Original SmartBook/older Connect retain current-question restart behavior and have no saved-progress recovery.

Connect stores a hashed marker only after a journal transaction is confirmed recorded. Canvas stores question markers after its simulated/observed save condition; MindTap increments progress after save/advance succeeds. The count is a local record, not proof of a live server grade or save. Persistent checkpoints hold only platform, count, opaque markers, phase and timestamp—no question text, answers, images, raw URLs or credentials. At most 20 checkpoints are retained; entries older than seven days cannot be restored and are pruned on the next write. **Clear saved progress** removes this assignment’s checkpoint; Start Auto starts a fresh count. The temporary preview/request data remains in Chrome session storage for the active workflow.

The extension’s original book-and-spark artwork and generation prompt are documented in **assets/ICON-DESIGN.md**. The three chatbot icons are bundled PNGs from public official assets. See **assets/ATTRIBUTION.md** for sources and trademark ownership.

## Platform controls and settings

Click **McGraw**, **Pearson**, **Canvas** or **MindTap** under **Settings for** to edit that platform's options. This selection edits settings; **Run on** controls which adapters may run. The preferred AI model is shared. Another ready supported chatbot is used if the preferred one is unavailable. Only one assignment run/request can use the AI connection at a time.

- **McGraw-Hill:** original SmartBook, older EZTO Connect and the newer Connect MAP player. The MAP adapter supports native choices/text/selects and embedded numeric worksheets and journal worksheets with exact account menus, balanced entry checks, native model verification, all available journal transaction tabs, Record entry, Check my work and Next. It leaves final submission manual. Original SmartBook parsing, confidence, feedback and navigation remain. SmartBook duplicate mode is experimental, off by default, and requires Instant Auto and Watch automation; extra-credit effects are not verified.
- **Pearson MyLab:** use the unified panel or expand MyLab Assistant in the tdx.acs.pearson.com player, including separate windows. Start Auto fills supported numeric editors, text, native dropdowns and choices, checks homework answers and navigates test questions. Existing correction/retry behavior is retained. Final test submission stays manual.
- **Canvas:** use the unified panel or expand Canvas Quiz Assistant on the quiz-taking page. Classic native choice, checkbox, text, numeric and select fields are supported. New Quizzes/Learnosity support remains experimental. Start Auto answers supported unanswered questions and advances when a supported Next control is present. It does not click final Submit Quiz. Canvas itself may auto-submit timed quizzes or save inputs independently of this extension.
- **MindTap:** use the unified panel or expand MindTap Assistant inside the Aplia assignment frame. Start Auto fills supported q4 dropdowns, categorization rows, choices and native numeric/text/select fields, then uses Save & Continue. Enable Grade Before Advance only if you want a grading attempt when saving alone is unavailable. Final assignment submission stays manual. CNOWv2, SAM and other MindTap players are not implemented.

**Pause after fill** is also directly available in the side panel and saves the selected platform’s setting. Turning it off while paused resumes that selected run. **Pause After Fill** is on by default for Pearson, Canvas and MindTap. Turn it off in the relevant platform settings for continuous answering. SmartBook's Pause Before Submit is also on by default in this combined build. New Connect uses the same default pause before recording or advancing. Older Connect waits for Continue now after filling when its pause setting is enabled. Original SmartBook and older Connect otherwise retain their original navigation/submission behavior.

**Auto Fill after Ask AI** controls single-question filling on Pearson, Canvas and MindTap; Start Auto always fills supported fields. **Show Explanations** controls their preview. New Connect also supports these settings. Original SmartBook and older Connect keep their original Ask AI automation and do not use these single-question options.

**Check work before Next** is on by default for Connect MAP. It uses an available enabled Check my work control once after the final journal transaction or native answer. Checking may consume a website attempt. An unrecognized result or dialog stops for review instead of repeating the check. Disable this setting to advance without it. Final assignment submission remains manual.

## Automation pace and feature guide

Each platform has its own **Automation pace**, shown as four illustrated cards. Help in the side panel opens a plain-language feature guide in place; the Settings feature guide returns to Settings when closed. The default is **Instant Auto** and it preserves full automatic answering without an added review countdown. Guided Answers is a separate mode for reading suggestions and entering answers yourself.

- **Instant Auto:** automatic input and supported navigation.
- **Timed Auto:** automatic input after a visible countdown for each answer field/group or journal cell; another countdown before checking, saving or advancing.
- **Human pace:** automatic input with an AI-estimated working-time countdown for this question.
- **Guided Answers:** shows the answer and explanation; you enter and navigate yourself.

The timer has **Pause**, **Continue now** and **Stop**. Stop cancels the pending input/advance and leaves already entered values. **Pause After Fill / Pause Before Submit** is independent: switch it off for continuous automation in Instant Auto or Timed Auto, or keep it on for an additional review before saving. Timed Auto does not require pressing Continue. Guided Answers does not run an automatic countdown or enter answers.

The chatbot can return a suggested total review budget. The extension bounds it between your minimum and maximum, uses a configured fallback when absent, and divides it across fields/groups or journal cells (account, debit and credit separately). Before-advance seconds are additional. Defaults: fallback 30 seconds, minimum 5, maximum 120, before-advance 3. Suggestions are estimates, not measured reading times. Matching in original SmartBook uses one review period before its existing matching routine; it does not pace each drag.

Countdowns are local and can run late if Chrome suspends/backgrounds a tab. Website quiz timers, autosave and input logging continue normally. There are no simulated human keystrokes, fake cursor movements or detection-evasion features.

## Optional picture questions — experimental

**Include Question Pictures** is off by default. Enable it for the desired platform, activate the assignment tab, click the extension icon once, then use the side panel and start from the assignment controls. Chrome's temporary [activeTab grant](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) permits [visible-tab capture](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab); navigating to another origin may require clicking the icon again.

The extension finds visible question graphics, translates iframe coordinates, captures the active assignment and crops to the graphics before sending the image. All graphics must fit fully in the visible window; clipped pictures stop the request. The image is limited to 2 MB, tied to one tab/frame/request, and expires after 30 seconds if unused. Capture does not run with another assignment's request in progress. Keep the assignment active until capture finishes.

Gemini or ChatGPT receives the cropped picture with the question. DeepSeek's picture interface is not supported; an open ready Gemini/ChatGPT tab is required. When NotebookLM is preferred and open, the flow is **picture → chatbot visual description → selected notebook readings → chatbot answer formatting with the original picture**. NotebookLM receives the description, not the image itself. No AI-written code is executed.

Upload controls and readiness checks were tested with synthetic browser previews; Gemini's current live upload controls were inspected without sending an image. Real chatbot uploads and live picture-based answers have not been tested end to end. UI changes, image quality and model mistakes can still require manual entry. Complex drawing, graph manipulation, video, drag and specialized widgets remain unsupported even when a picture is captured.

## NotebookLM

**Prefer NotebookLM** is on by default for Canvas and off by default for the other platforms. You can enable it separately for any platform.

Open a specific notebook at notebook.google.com or notebooklm.google.com, select its sources and keep a regular chatbot open. Select **Readings notebook for this platform** when multiple notebooks are open.

The flow is: notebook gives a source-grounded answer with citations → regular chatbot maps it to the exact answer format → extension fills the fields using the site's adapter. AI-generated code is never executed. The original McGraw answer string/array format is translated at the worker boundary so it also uses the common connection.

With no notebook open, a ready regular chatbot answers directly. A busy notebook, unsent draft, missing selected sources, unsupported source answer or missing citation stops the request. If other notebooks are open but the selected notebook is absent, it stops rather than choosing a different notebook. Original McGraw controls do not display a source preview; citations remain in the NotebookLM/chatbot conversations. Other adapters display source-grounded previews.

## School-hosted Canvas

In Canvas settings, open the school’s HTTPS Canvas page in the active tab, enter its origin and click **Enable this Canvas site**. The extension uses Chrome’s temporary active-tab access to inject the adapter into that tab only; enable it again after a reload or origin change. Default support includes instructure.com subdomains and canvas.csuchico.edu. No wildcard host permission is requested.

## Limits and verification

All four adapters and the original SmartBook code were checked in Chrome using synthetic questions, AI replies and saves. The Connect journal tests verify native model commits, record-before-advance, existing-answer conflicts and cancellation. Pearson 2.0 tests use a synthetic editor bridge contract; previous native vendor-editor verification is separate. New Quiz patterns and image uploads remain experimental. See **VERIFICATION.md** for the precise test scope.

The latest Pearson dropdown markup was inspected on a live page, but answer entry and navigation were verified with synthetic fixtures rather than a live assignment. Other live chatbot and platform flows remain incompletely verified. It does not promise support for every question/player layout. Canvas itself may auto-submit timed quizzes. Programmatic inputs may be distinguished and logged; hidden instructor/server-side flags were not inspected.

## Permissions and source

Required host access is limited to the named learning platforms and AI services. Optional school Canvas access is granted per site. Settings use Chrome storage; pending requests and run metadata use session storage. Visible question text/options, optional notebook answers and optional cropped question pictures are sent to the selected AI services. The full capture is cropped in memory; only the crop enters session storage for delivery, and it is cleared after completion/cancellation. No API keys, login cookies or authentication tokens are read. Hidden answer APIs are not used by the shared worker.

Original MIT license and attribution are retained in LICENSE. The supplied Auto-McGraw code is the basis of the McGraw adapters; its old per-provider AI scripts and release updater are replaced with one correlated connection and this unified settings page. No proprietary Pearson/Cengage source library or question bank is bundled. The extension is unofficial and unaffiliated with the platforms or AI providers.
