# Earlier feature notes

These notes describe earlier releases and may use names or layouts that changed later. For current behavior, use the main README and [changelog](../CHANGELOG.md).

## 2.5.0 realistic pacing and Pearson input update

The small in-page assistant popup now includes Instant Auto, Timed Auto, Human pace and Manual review. Human pace asks the AI for a question-specific working-time estimate, accounts for reading, calculator or written work, splits the estimate across fields, and offers Faster, Typical and More deliberate speeds. AI wait time is counted toward the estimate, and the existing Timed Auto countdown remains unchanged.

Pearson Auto now discovers custom dropdown options after Pearson moves them into its menu, selects them through the visible control, and leaves an explicit answer preview/manual instruction when a custom control cannot be automated. Numeric editors receive one native character at a time. Labels use the question and printed subpart hierarchy across supported adapters, including table row and column context. Final Submit remains manual.

Background AI response handling now completes on DOM changes instead of waiting for a long stability timer. Short pacing waits use the extension worker so hidden tabs do not stretch every keystroke. Loaded, unfrozen AI tabs are still required because Chrome can throttle or discard background pages.

## 2.4.2 Pearson preview and navigation update

Recognizes the question-level Final check control as well as Check Answer, excluding final Submit controls and hidden copies. No-pause Auto checks and advances; final assignment submission stays manual.

Previews preserve detected printed question/subpart labels, identify number boxes and dropdowns, group paired Above/Below fields into a table, and show long single answers at full width. Undetected field labels fall back to Field numbering. Explanations request plain text; common math delimiters are cleaned in the preview. Unsupported dropdowns are not invented or silently claimed complete.

## 2.4.2 McGraw navigation fix

Uses visible responsive copies of Check my work and Next. When pause after fill is off, automatic modes record journal entries, check work (when enabled), and advance. Final assignment submission remains manual. A missing Next is no longer treated as proof that the assignment is complete.

One Chrome extension containing the original Auto-McGraw SmartBook/Connect adapters, Pearson MyLab, Canvas and Cengage MindTap Aplia. It selects the adapter by the website and uses one shared AI/NotebookLM connection. Each platform has its own settings.

## New in 2.4.2: clearer modes and answer review

Automation pace uses four clickable illustrated cards in Settings and first-use setup, with bundled PNG icons. There is no visible pace dropdown. **Instant Auto** adds no countdown; **Timed Auto** continues automatically after each countdown; **Review each step** waits for Continue now. Existing saved mode keys and behavior are retained.

**Guided walkthrough:** after first-use preferences are saved, a 12-step tour highlights the actual assistant controls. Settings and Back steps let you click the highlighted button; other steps explain the controls without triggering them. Back, Next, Skip walkthrough and Escape are available. Replay it from **Help → Walkthrough** when no run, AI request or answer edit is active. Skipping the tour keeps your preferences and does not skip the first-use acknowledgement. The tour never starts a request, enters answers or changes the selected mode.

Pearson previews follow detected question and printed subpart labels, with available table row/column or option context; unidentified inputs use Field numbering. The small Pearson menu uses a readable answer table; the side panel receives the same structured labels. Technical fixture wording such as “Embedded number” is replaced by its visible option context or a numbered part.

The assistant shows the current stage: Read, Ask AI, Prepare, Enter or Check. It highlights observed activity, rather than claiming every stage completed. **Recent activity** contains up to eight observed updates for the selected assignment while the panel is open. It is temporary and clears on panel close or assignment change. Original SmartBook/older Connect have a limited stage summary.

An **Attention needed** card translates connection and unsupported-control messages into next steps. Available buttons can refresh the connection, open a chatbot/notebook, focus the assignment or explicitly ask again. They do not replay a save or grading action. Go to assignment only focuses that tab; use Stop all before taking over a running task. Raw troubleshooting text stays under Details.

**Edit answer** is available for supported prepared answers in newer Connect MAP, Pearson, Canvas and MindTap. Use Ask AI with Auto Fill after Ask AI off, then edit the preview before filling. Saving updates the prepared answer used by Fill answers; it does not enter answers, save the assignment or grade. Exact choices and existing adapter validators apply. The editor invalidates on a question change, answer revision or running/filling workflow. Once filling has been attempted, ask again to prepare a fresh answer. Current nonempty native values are shown for comparison; replacement settings still apply when filling.

Journal account/debit/credit cells are separate editable fields, with the original row count and balance checks. Adding/removing journal rows is not supported. Edited answers replace the AI explanation with a notice that its original explanation and citations may no longer support the edits. Original SmartBook and older Connect do not support this editor. No new permissions were added.

## Included from 2.3.3: structured settings

Settings keeps the same dark cards, colors and illustrated pace options, with a stable header, category navigation, platform selector and save-status footer. Only the selected category scrolls inside the content area; the browser page no longer grows into one long stack. Wide tabs use a navigation rail and grouped columns. The narrow side panel uses compact category buttons and a single content column.

- **Automation:** pace, answer controls and tab behavior.
- **AI & readings:** chatbot preference and per-platform NotebookLM sources.
- **Pictures:** question-image capture and its requirements.
- **Platform options:** site selection, checking/grading options, custom Canvas access and support details.

Countdown values are under **Countdown settings**, available for Timed Auto and Review each step. Each category remembers its scroll position while you stay in Settings. Every control still saves automatically; existing preference keys and automation behavior are retained.

Normal Settings stays inside the side panel. **Expanded view** opens a full browser tab for deeper configuration, preserving the selected platform. Chrome’s Options command also opens the full settings page. Expansion remains an explicit click. The Feature guide returns to the same Settings view when opened from the side panel.

Layout references: [Carbon navigation shell](https://carbondesignsystem.com/patterns/global-header/) and [Nielsen Norman Group progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/).

## Included from 2.3.1: first-use setup

The first use shows an acknowledgement over the side panel. It explains AI mistakes, course rules, question text sent to connected AI services, assignment changes/attempts and activity logging. Check the acknowledgement, then choose your AI, automation pace, Pause after fill, Watch automation and NotebookLM preference. The last step says which platform receives its own pace/pause/readings preferences; AI and tab behavior apply to all platforms. Finishing saves the choices and leaves the assistant in the side panel without starting a run.

Completion is remembered locally for this extension in this Chrome profile, across reloads and ordinary updates. It is not synced to other profiles/devices. Before completion, the side panel is blocked and the worker rejects run starts, AI requests, new image captures and fill/resume commands. Stop remains available. The original on-page controls are hidden behind a small **Set up Study Assistant** launcher until setup finishes.

Chrome requires a user gesture to open its side panel. On a reloaded supported assignment, click the setup launcher or the extension icon. The extension cannot automatically force open Chrome’s side panel just because it was installed or enabled. Setup also works before an assignment connects.

**Why NotebookLM?** Questions tied to readings may expect a particular author’s definition, example or wording. NotebookLM uses the sources you select and can supply citations to check. That can be more useful than a broad chatbot answer that does not match your course. Add the relevant assigned readings and keep that notebook open. This extension asks it for a source-based answer, then a regular chatbot formats that response for entry. It does not send the whole notebook to that chatbot. Missing/irrelevant sources and AI mistakes still need review. The walkthrough, Settings and Help all explain this choice.

API/source references: [Chrome side panel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel), [Google source-based chat](https://support.google.com/notebooklm/answer/16179559?hl=en).

## Included from 2.3.0

Connect MAP now distinguishes numeric accounting worksheets from journal entries. Numeric cells use the native editor and saved-value verification, with separate pacing for each cell. Computed totals and other read-only cells are left to the site. Negative amounts, decimals and displayed currency formatting are supported. Non-numeric widgets and multi-frame questions still stop for manual entry. Journal A/B/C and later-entry behavior is retained.

**Settings** opens inside the side panel, with **Back to assistant** returning to the run. The small McGraw page menu opens that same panel instead of a new settings tab. The settings controls adapt to narrow widths and apply to the selected assignment’s platform. Chrome’s own extension Options command can still open the standalone settings page.

The panel holds a direct connection to the selected assignment’s local controls. Closing the panel restores the small menu immediately on disconnect; normal status polling no longer hides it afterward. Switching between assistant and embedded Settings keeps that connection. The old timed fallback remains for older/unconnected panel probes.

**Instant Auto**, **Timed Auto**, and **Review each step** have illustrated selection cards and plain descriptions. Timed Auto continues automatically when each countdown ends; Review each step waits for your click. Help and the Settings feature guide open inside the panel with Back navigation. Existing pace preferences keep their behavior.

## Included from 2.2.1: background by default

Automatic AI requests and replies leave your current tab and window in place. **Watch automation** is off by default, including upgraded settings without this option. Turn it on in the side panel or Settings to follow each AI/NotebookLM/assignment transition. It applies to all four platforms and the original McGraw adapters. Changes apply at the next transition, including during a pending request; turning it on does not immediately move to the current AI step. AI hyperlinks and Open selected AI still switch tabs when you click them.

Background operation requires loaded, unfrozen AI tabs. Frozen/unloaded tabs show an attention message; the extension does not automatically activate them or change Chrome memory settings. Background scheduling may delay timers or replies, and live provider compatibility remains unverified. Picture capture still requires the assignment to be the visible active tab. The experimental SmartBook duplicate-tab workflow requires Watch automation because Chrome activates duplicates; turn Double Credit off for background operation. No new permissions.

## Included from 2.2.0

The compact panel keeps assignment actions together, shows readable answer tables and plain-text explanations, and hides raw responses behind **Nerd mode**. Click any AI card to focus its open tab or open that service. Saved progress and reading sources are collapsed until needed. A new original book-and-spark icon replaces the blue square.

Connect MAP now reviews each journal account/debit/credit cell separately, waits for rebuilt transactions, and follows every available journal tab rather than assuming A/B only. Already recorded transactions are skipped. After the last entry, it uses **Check my work** when available, then **Next**. A visible **Pause after fill** control chooses whether to review between entries or continue automatically. A conflict offers **Enable replacement & restart Auto**; that explicitly enables replacement for McGraw until disabled in Settings.

The monitor also stops cleanly when Chrome invalidates an old extension after update/reload. Refresh the assignment and AI tabs after upgrading. No new permissions were added.

## Install

1. Extract **study-assistant-2.5.0.zip**.
2. Open **chrome://extensions**, enable **Developer mode**, click **Load unpacked**, and select the extracted folder containing **manifest.json**. Do not select its parent folder or the ZIP.
3. Disable the separate Auto-McGraw, Pearson, Canvas and MindTap extensions so their AI connectors do not compete with this one.
4. Reload your assignment and any open Gemini, ChatGPT, DeepSeek or NotebookLM tabs. Sign into the AI services and leave their prompt boxes empty.
5. Click the extension icon on the assignment tab to open the **Study Assistant side panel**. Leave **Run on** set to **Automatic** in Settings. Pick an assignment in the panel and choose Ask AI or Start Auto. Chrome 116 or newer is required.
6. If upgrading, disable the older combined extension and load this complete folder. Do not merge it with older extracted folders. Reload the assignment and AI tabs afterward. Your prior settings belong to the old extension unless Chrome treats this as an in-place update.

The panel resizes with Chrome’s sidebar. **Settings** opens inside the side panel. Use **Back to assistant** to return. Local page controls are hidden while the panel is connected and return immediately when the panel’s direct connection closes (the timeout remains only as a fallback). Assignment selection stays with its page when the chatbot tab becomes active, including assignments in another Chrome window. An assignment must have loaded supported controls before it appears. **Run on** can restrict the extension to a single platform or turn all platforms off. A mode change stops current work; reload the assignment afterward. This selector does not turn an unsupported website into a supported one.

**Stop all automation** cancels pending answers, ends the active run and closes only a temporary duplicate tab created by the original SmartBook workflow. Entered answers remain. It does not stop generation already underway on an AI website.
