# Notes for Claude

Chess Coach: a static web app (plain HTML, CSS and JavaScript, no build step) for two children
playing chess on one iPad mini. See README.md for what it does and how the files fit together.

## Standing instructions from the owner

- **Merge to main yourself.** When a piece of work is finished and the tests pass, merge your
  working branch into `main` and push `main`, without asking. Pushing `main` is what publishes the
  site. Never force-push `main`.
- **Never bump the offline-cache version by hand.** `VERSION` in `sw.js` stays `"chess-coach-dev"`.
  The publish workflow replaces it with the commit it publishes, so each release refreshes the
  cache on the iPads automatically.
- **Publishing is automatic.** `.github/workflows/pages.yml` runs on every push to `main`: it runs
  the tests, builds the site, stamps the version, and force-pushes the result to the `gh-pages`
  branch, which GitHub Pages serves at https://heee.github.io/chest/. Don't commit to `gh-pages`
  by hand; it is rebuilt from scratch on each publish.
- **One-time Pages setting (owner only).** Claude can't change repository settings or push to
  `gh-pages` from a session, so the owner switches Pages on once: Settings → Pages → Deploy from a
  branch → `gh-pages`, `/ (root)`. If the site isn't live, check that setting first.
- **Ask clarifying questions one at a time** before starting a new feature.

## Working on it

- Run the tests with `node --test tests/*.test.js` before merging. Rule changes need a test.
- Serve locally with `python3 -m http.server 8000` and check the layout at 1133 x 744.
- When you add a file the app needs at runtime, add it to `FILES` in `sw.js` and to the `cp` line
  in the workflow, or it won't work offline or won't be published.
- Visual direction: the "Marble" look from the original brief. Outfit font, no emoji, touch
  targets of at least 44 px, text contrast of at least 4.5:1.
