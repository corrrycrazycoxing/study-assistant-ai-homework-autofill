Study Assistant 2.7.3

MindTap Course Mode now finds course outlines and activities inside open component roots, and follows navigation between the course outline and solo assignments. Not-started work stays the default; selecting **Allow in-progress assignments** requires confirmation before the queue starts. Existing users are shown the updated first-use walkthrough again after installing this version.

MindTap status matching now ignores capitalization differences. If a scan finds activities but none qualify, Course Mode reports how many passed the status, selected-section, gradeability, visibility and assessment checks.

The panel has an always-visible **How to update** link beside the version status. It opens the unpacked-install instructions directly, whether or not an update is detected. The **Refresh** button checks GitHub Releases immediately instead of relying on a six-hour cached result, while also refreshing the assignment connection.

Unpacked Chrome extensions still require you to install the downloaded/extracted files and click **Reload** in `chrome://extensions`; a GitHub release cannot replace local files automatically. After reloading the extension, reload the assignment and connected AI tabs.

Verification: `node scripts/check.cjs` and `git diff --check` pass. Tests cover MindTap outline detection and queue gates, setup-version re-prompting, updater instructions and a forced release-status refresh. Live Chrome testing is pending; do not publish before the Course Mode and first-use walkthrough are verified in Chrome.

Install: extract `study-assistant-2.7.3.zip`, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the extracted **Study-Assistant-2.7.3** folder containing `manifest.json` directly. The ZIP itself cannot be loaded.
