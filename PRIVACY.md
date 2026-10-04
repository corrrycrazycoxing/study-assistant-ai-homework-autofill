# Study Assistant privacy policy

**Last updated:** October 2, 2026

Study Assistant is a browser extension that helps a user review questions and prepare answers on supported learning sites. It is an independent project. It is not operated by Pearson, McGraw Hill, Canvas, Cengage, Google, OpenAI, or any other learning or AI provider.

## Information the extension processes

When the user asks for help, the extension may read the visible question text, part labels, editable field types, visible choices, and the current page origin so it can identify the supported assignment. If the user enables picture support, it may capture a cropped image of the visible question. The extension does not request or intentionally collect passwords, cookies, authentication tokens, course rosters, or payment information.

The AI service used for the request receives question data. The preferred service may fall back to another ready supported AI tab; NotebookLM may also provide source context when enabled. Those services may retain or process data under their own terms and privacy policies. Modern adapters redact common email addresses, phone numbers, and long numeric identifiers in question text and labels, but redaction is not guaranteed to remove every personal detail. Legacy workflows, correction feedback and question images do not have complete personal-data redaction. Users should remove sensitive information and follow their institution's rules before asking an AI service to process a question.

## Local storage and retention

Settings are stored in Chrome extension storage. Active requests, answer previews, and picture-capture state are kept temporarily for the current workflow. Saved automation checkpoints contain only platform names, timestamps, counts, and opaque hashes; they do not contain question text, answers, images, or credentials. Checkpoints expire after seven days and are limited in number. Uninstalling the extension removes its local storage through Chrome's normal extension behavior.

The developer does not operate a server that stores question content, answers, images, or account credentials. AI providers and learning sites may have their own retention, logging, and deletion practices; use their controls for data held by those services.

## Sharing

Question data is shared with the supported AI services used for the request and with the learning site already open in the user's browser as part of normal page interaction. The extension does not sell personal information, run advertising profiles, or add analytics trackers. It does not expose bundled extension resources through `web_accessible_resources`.

## Permissions

- **Tabs:** identify the active assignment and selected AI tabs so the user can move between them when Watch automation is enabled.
- **Storage:** save settings, temporary workflow state, and short-lived hashed progress markers.
- **Scripting and activeTab:** support a user-requested active-tab Canvas adapter and reviewed page integrations.
- **Side panel:** display the assistant controls and answer review.
- **Site access:** run reviewed adapters only on the supported learning and AI origins listed in `manifest.json`. A custom Canvas origin is enabled for the active tab only and is not registered persistently.

## Security and user control

The extension treats page text and AI responses as untrusted data. Modern adapters validate declarative answers against request IDs, question snapshots, field inventories and visible options. Legacy SmartBook/older Connect workflows have different validation and review paths; they do not have all modern snapshot protections. AI-generated JavaScript, selectors, HTML, and commands are never executed. The extension does not forge trusted browser events, change `Event.isTrusted`, spoof fingerprints, or attempt to conceal automation.

Modern Ask AI requests show a preview by default. Auto Fill can be enabled, and a user-started Auto run may continue according to the selected settings. Legacy workflows may enter answers after an Ask AI request. Review the platform's settings before starting. The extension leaves final assignment submission to the user.

## Deletion requests and contact

To remove extension-held data, clear the extension's saved progress and settings or uninstall it from `chrome://extensions`. To request help with this project, open an issue at [github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/issues](https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/issues). Requests concerning data retained by an AI provider must be sent to that provider.

This policy may be updated when the extension's data practices change. The date above identifies the version currently described.
