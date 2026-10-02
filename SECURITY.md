# Privacy and security notes

The extension has no `web_accessible_resources` declaration, so assignment pages cannot fetch bundled assets or discover an exposed extension resource list. The broad `https://*/*` optional host permission was removed. Built-in adapters retain only their listed assignment and AI origins. A school-hosted Canvas origin is injected only into the active tab after the user chooses Enable; it is not registered persistently and must be enabled again after a reload or origin change.

Page-facing code remains in isolated worlds by default. Two narrow MAIN-world bridges are retained for documented compatibility: Pearson’s page-owned `EqEditor`/Dojo/result state and McGraw’s page-owned jQuery Sheet editor. They accept only bounded JSON messages, exact field/cell identifiers and plain numeric values; they do not evaluate scripts, selectors, HTML or commands. The bridges use non-enumerable document symbols for their duplicate-install guards.

Question text is treated as untrusted data. The adapters send a redacted, normalized question snapshot and declarative field inventory to the AI. Each request carries a request ID and snapshot hash. Before applying an answer, the adapter re-extracts the page, compares the question hash, revision, frame and field inventory, rejects unknown or missing response fields and exact-option mismatches, and verifies every retained value. Unsupported or incomplete controls stop for manual review.

The extension stores only short-lived request state and bounded progress markers in extension storage. It does not log question text, answers, images or credentials to the console. User-visible previews use text content, and AI-generated code, HTML, selectors and commands are never executed.
