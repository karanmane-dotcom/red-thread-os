# Red Thread OS: source

Live page: https://claude.ai/artifact/SUeKN7dYG4DMAURBEq592s (artifact slug ce508ba4-3bc4-47a7-86aa-e23ae2e73dcc)

- src/redthread_live.html: the original Red Thread brief flow, as published (13 Oct 2026).
- src/tslprod.html: TSL production credentials page, used only for its fonts.
- src/roster.json, src/logo.json: allocation-sheet roster and the Red Thread logo paths.
- os/: the OS layer. os-tools.js holds every module and tool; add a tool by adding an entry there.
- build.py: patches the brief flow, adds fonts and the OS layer, writes dist/.
- test.py: headless browser test on desktop and phone with mocked Claude, database, Gmail and Drive.
- seed.json: the settings, client profiles and client rules loaded on 13 Nov 2026.

Build: python3 build.py. Test: python3 test.py (needs Playwright and Chrome).
Publish: upload the files in dist/ to the artifact above.
