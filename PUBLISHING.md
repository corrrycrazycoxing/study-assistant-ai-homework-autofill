# Publication checklist

This page tracks work to review before a public release. Documents alone do not establish legal compliance or Chrome Web Store approval.

## Added in 2.5.1

- [Privacy policy](PRIVACY.md) covering question data, AI providers, storage, permissions and deletion.
- [Terms of use](TERMS.md) covering authorized use, answer review, third-party services and support.
- [Changelog](CHANGELOG.md) and GitHub release-notification instructions in the README.
- A Chrome update notice that uses the browser's own update event.

## Review before public distribution

- Verify each privacy statement against every supported adapter, including legacy integrations and optional picture capture. Disclose any differences.
- Test keyboard navigation, focus visibility, screen-reader labels, contrast and zoom across settings, onboarding, previews and errors. Existing labels are not a completed accessibility audit.
- Review third-party assets, font/image licenses and trademark use in [assets/ATTRIBUTION.md](assets/ATTRIBUTION.md) and LICENSE.
- Remove unsupported marketing claims. Document tested compatibility, limitations and AI accuracy risks.
- Confirm that the GitHub issue tracker is an appropriate public support channel. Tell users not to post personal information or credentials.
- Review age suitability and any obligations that apply if the product is offered to children. No age-verification or parental-consent system is currently provided.
- Review the privacy policy and terms for the intended audience and jurisdictions before relying on them commercially.

## GitHub release steps

1. Increment manifest.json and the displayed version together for each new package.
2. Run the relevant regression checks and inspect the package for secrets and development files.
3. When publishing is explicitly requested, commit and push to the existing repository.
4. Publish a GitHub release with the matching tag (such as `v2.5.11`), changelog notes and the installable ZIP as an attached asset.
5. Confirm the README's latest-release link opens that release. Users can select **Watch → Custom → Releases** for notifications.

Pushing source changes does not publish a release or update an installed extension. GitHub's generated source archive contains a repository folder; the attached extension ZIP extracts to a single `Study-Assistant-<version>` folder with `manifest.json` directly inside it. Select that extracted folder with Chrome’s **Load unpacked**; Chrome cannot load the ZIP itself.

## Chrome Web Store steps

- Register a developer account and complete the dashboard's required publisher information.
- Upload the extension ZIP with manifest.json at the root; exclude Git history, credentials and development-only files.
- Provide screenshots, a clear single purpose, accurate permissions explanations and the required privacy disclosures.
- Provide a publicly accessible privacy-policy URL. A private repository's policy page will not be accessible to users.
- Test an initial release with an appropriate distribution setting and complete store review before public availability.
- Upload a higher manifest version for each store update. Chrome updates store installations automatically; GitHub downloads remain manual installations.

See [Chrome publishing guidance](https://developer.chrome.com/docs/webstore/publish) and [GitHub releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).

## Add only if the product changes

Payments would require clear prices, refund/cancellation terms and applicable business disclosures. Tracking or additional cookies would require a new privacy assessment and any applicable consent controls. Marketing email would require consent and unsubscribe handling. Review third-party SDKs before adding them. The current documentation does not claim those systems exist.

## Automated tagged releases

Run `node scripts/check.cjs` and `python3 scripts/package.py v<version>` locally. After committing and pushing verified source, push a matching `v<version>` tag. Run `python3 scripts/publish-release.py` to publish the built ZIP with RELEASE-NOTES.md using existing Git credentials. The current token cannot upload GitHub workflow files. Confirm the release and attached ZIP succeeded. Existing tags/releases must not be overwritten.
