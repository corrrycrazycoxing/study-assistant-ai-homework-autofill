# MindTap graph mock

Open `mindtap-graph-mock.html` in a browser to run the local graph interaction test. Click **Run all 10 point placements**. A passing run shows ten retained points, including all five orange and five green points. **Reset graph** clears the simulation.

The page loads `../shared/mindtap-graph.js`, so it exercises the same inspection, coordinate mapping, drag, and retention-check adapter as the extension. The mock deliberately replaces its legend SVG elements after every accepted drop to model a renderer refresh; it catches stale-handle bugs that a one-off drag check misses.

The page is synthetic and does not use an extension, contact Cengage, or change an assignment. A passing mock validates our event sequence against the fixture, but live MindTap compatibility still needs a user-controlled test on an ungraded assignment.
