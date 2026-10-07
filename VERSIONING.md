# Versioning and releases

Study Assistant uses three-part versions: `MAJOR.MINOR.PATCH` (for example,
`2.7.2`). The version in `manifest.json` identifies the extension build. Keep
the README title, download URL, ZIP filename, extracted folder name, changelog
heading, Git tag, and GitHub release in sync with it.

## Choosing the next number

Start from the latest published version and change one part:

| Change | Increment | Example |
| --- | --- | --- |
| Breaking change that requires a migration or removes a supported behavior | Major | `2.7.2` → `3.0.0` |
| New user-facing feature that remains compatible | Minor; reset patch to zero | `2.7.2` → `2.8.0` |
| Bug fix, small improvement, or documentation correction shipped in a release | Patch | `2.7.2` → `2.7.3` |

Use normal numeric ordering. Do not skip numbers or reuse a published version.
Changes that are not being released do not need a version bump. Once a version
has been published, make corrections in a new version rather than replacing the
published package.

## Release series

The first two numbers identify the feature series; the last number identifies a
release within that series. For example, `2.7.0`, `2.7.1`, and `2.7.2` are the
three releases in the `2.7` series. A feature release starts the next series at
`.0` (`2.8.0`); follow-up fixes continue it (`2.8.1`, `2.8.2`). A major release
starts a new major series at `.0.0` (`3.0.0`).

Do not use the word “update” as a separate number. The version is the update
identifier everywhere: `2.7.2` in the extension, `v2.7.2` for its Git tag, and
`Study Assistant 2.7.2` for the GitHub release title.

## Prepare one release

1. Choose the next number using the table above.
2. Update `manifest.json` and every user-facing version reference in the same
   change. Search for the previous version before packaging.
3. Add a dated entry at the top of `CHANGELOG.md`. Group user-visible notes
   under `Added`, `Changed`, `Fixed`, and `Security` when those headings apply.
   Include material verification limits; do not imply live verification that
   was not performed.
4. Build the ZIP from the extension folder so that `manifest.json` is at the
   root of the extracted folder. Name the archive
   `study-assistant-MAJOR.MINOR.PATCH.zip` and the folder
   `Study-Assistant-MAJOR.MINOR.PATCH`.
5. Verify that the manifest version, changelog heading, README title and links,
   folder name, and ZIP name all use the same number.
6. Publish a Git tag named `vMAJOR.MINOR.PATCH` and a GitHub release titled
   `Study Assistant MAJOR.MINOR.PATCH`. Attach the matching ZIP and include
   concise release notes for that version.
7. Keep the changelog entry as the source history even if release publication
   fails. A version is downloadable only after its GitHub release and ZIP are
   published.

## Changelog entry shape

Add newest releases first and keep one heading for every released version:

```markdown
## 2.8.0 — YYYY-MM-DD

### Added
- Describe the user-visible feature.

### Changed
- Describe a changed behavior, if any.

### Fixed
- Describe a correction, if any.

### Verification
- State what was checked and any important unverified scope.
```

Omit empty headings. Keep bullets concrete and user-facing. Do not create a
second version numbering system for feature names, packages, or update notices.
