Study Assistant 2.7.4

Pearson now distinguishes missing answer context from malformed AI data. If a response leaves a field blank because referenced source values are not present, the preview marks that field **Needs source data**, explains which fields could not be determined and confirms that no answers were entered. Other invalid values identify the affected field and offer a retry/manual review action.

Pearson Full Course Mode now displays a prominent review warning and keeps its start action disabled until you acknowledge that you will review results and submit assignments yourself. The updated setup notice appears again after installing this version.

The update instructions now say to reload the Pearson course or assignment-list tab as well as the assignment and AI tabs; otherwise Course Mode may not reappear in an already-open course page.

Unpacked Chrome extensions still require you to install the downloaded/extracted files and click **Reload** in `chrome://extensions`; a GitHub release cannot replace local files automatically.

Verification: `node scripts/check.cjs`, focused Pearson course and response tests, and `git diff --check` pass. Live Pearson confirms that the old 2.7.3 UI displayed a generic error when ChatGPT returned empty fields for a question missing its referenced sample data. The new build has not yet been loaded in Chrome, and the MindTap pace/refresh checks from 2.7.3 remain outstanding.

Install: extract `study-assistant-2.7.4.zip`, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the extracted **Study-Assistant-2.7.4** folder containing `manifest.json` directly. The ZIP itself cannot be loaded.
