# Project publishing instructions

The project owner explicitly authorized uploading this update and future changes on October 2, 2026. This is standing authorization for changes to this project to be committed and pushed after appropriate verification.

- Use the existing Git remote for this project: https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill.git.
- Inspect Git status and remote changes before publishing. Preserve unrelated work and never overwrite remote changes or rewrite published history without specific authorization.
- Run relevant tests, inspect the diff and check for secrets before committing. Show the commit hash before pushing.
- Retain the configured project author identity and private no-reply email.
- Report the repository URL, branch, commit hash and push result. If authentication or a test fails, report it accurately; never claim an upload succeeded without confirmation.
- Never commit passwords, access tokens, API keys, Git internals or local credentials.
- Do not create a new repository unless the owner explicitly requests one.
- This standing instruction covers GitHub source updates. Chrome Web Store submission and unrelated projects require their own authorization.

Do not infer permission to make future product changes from this instruction; it authorizes uploading changes that the owner requests.

## Release and handoff continuity

The owner authorized publishing a matching GitHub release and installable ZIP after each requested update on October 2, 2026. After verified source push, push the matching version tag and confirm the release and ZIP asset succeeded. Never overwrite an existing release/tag. Chrome Web Store publication remains separate. Read HANDOFF.md and DECISIONS.md before work and update them with completed work, verification and remaining tasks at the end of each update. Keep regression tests and build scripts in this repository so another account can continue without local chat files.
