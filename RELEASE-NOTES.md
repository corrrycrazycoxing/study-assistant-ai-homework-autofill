Study Assistant 2.7.2

The panel now has an always-visible **How to update** link beside the version status. It opens the unpacked-install instructions directly, whether or not an update is detected. The **Refresh** button now checks GitHub Releases immediately instead of relying on a six-hour cached result, while also refreshing the assignment connection.

Unpacked Chrome extensions still require you to install the downloaded/extracted files and click **Reload** in `chrome://extensions`; a GitHub release cannot replace local files automatically. After reloading the extension, reload the assignment and connected AI tabs.

Verification: `node scripts/check.cjs` and `git diff --check` pass. The added tests check direct access to updater instructions and a forced release-status refresh.

Install: extract `study-assistant-2.7.2.zip`, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the extracted **Study-Assistant-2.7.2** folder containing `manifest.json` directly. The ZIP itself cannot be loaded.
