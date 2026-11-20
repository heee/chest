# Chess Coach

Chess for two players on one iPad, made for Sophia (7) and Natalie (5). The iPad lies flat between them. White sits at the bottom edge, Black at the top, and a picture coach on the right shows how each piece moves. The coach turns to face whoever's turn it is.

It is a static web app: plain HTML, CSS and JavaScript, with no build step, no accounts and no server code. Added to the Home Screen, it runs full screen and works offline.

## What's in it

- **Six lessons:** Pawn race, then Rooks, Bishops, Knights and the Queen join in, then the Full game. In lessons 1 to 5 you win by getting a pawn to the far side or by capturing every enemy piece. The Full game is won by checkmate.
- **Full chess rules:** castling both ways, en passant, promotion (always to a Queen), check, checkmate and stalemate. A king can never move into check. The Full game is also a draw when the same position comes up three times, or when nobody has enough pieces left to checkmate (for example king against king). Undo goes back one move at a time, including out of a finished game.
- **Picture coach:** select a piece to see a 5x5 diagram of how it moves, plus one short line of text.
- **Warnings** when your King is in check or a piece is unprotected, and a **hint** button that suggests a good simple move.
- **Names:** tap "[Name]'s turn" at the top of the coach to change them.
- **Saving:** names, the lesson and the game in progress (with its undo history) are kept on the iPad, so a game survives the app being closed.
- **No accidental resets:** in the middle of a game, Start over and picking a lesson need a second tap.

## Run it on your computer

Any static web server works. From this folder:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. The layout is built for 1133 x 744 (iPad mini in landscape) and scales to fit any window.

To test on the iPad before publishing, run the server on a computer on the same Wi-Fi and open `http://<computer's IP>:8000` in Safari. Offline mode needs HTTPS (or localhost), so test offline after publishing.

Run the engine tests (Node 18 or later):

```sh
node --test tests/*.test.js
```

The tests check move generation against standard perft counts (start position, "Kiwipete", and an en passant endgame), plus castling, en passant, promotion, mate, stalemate, the draw rules, the lesson win rules, hints and the coach diagrams.

## Publishing (automatic)

Every push to `main` publishes the app. The workflow in `.github/workflows/pages.yml`:

1. runs the engine tests (a failing test stops the release),
2. copies the app files into a clean folder,
3. stamps the offline-cache version in `sw.js` with the commit, so iPads always pick up the new copy,
4. force-pushes the result to the `gh-pages` branch, which GitHub Pages serves at https://heee.github.io/chest/.

Nothing needs bumping or uploading by hand. If Pages ever isn't serving the site, check the repository's **Settings → Pages**: the source should be **Deploy from a branch**, branch **gh-pages**, folder **/ (root)**. Free GitHub Pages needs the repository to be public.

## Install on the iPad

1. Open the site in **Safari**.
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Open Chess from the Home Screen. It runs full screen, and after this first launch it works without Wi-Fi.

Tip: lock rotation in Control Center while it's in landscape, so the screen doesn't flip when someone leans over the iPad.

## How updates reach the iPad

The app caches itself for offline use. Because each release has a new cache version, an installed app downloads the update the next time it opens with a connection and shows it from the launch after that. Don't edit `VERSION` in `sw.js` yourself: it stays `chess-coach-dev` in the repository and is filled in when publishing.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | Page shell and the marble gradients for the pieces |
| `css/app.css` | Marble look and layout |
| `js/engine.js` | Chess rules, lessons and hint scoring (also loaded by the tests) |
| `js/pieces.js` | Staunton piece shapes (SVG) |
| `js/app.js` | Game state, saving, the board, the coach pane and buttons |
| `sw.js`, `manifest.webmanifest` | Offline support and Home Screen install |
| `.github/workflows/pages.yml` | Tests, builds and publishes on every push to `main` |
| `CLAUDE.md` | Standing instructions for Claude (merging, publishing, versioning) |
| `fonts/` | Outfit, bundled for offline use (SIL Open Font License, see `fonts/OFL.txt`) |
| `img/` | Marble vein textures |
| `icons/` | Home Screen icons |
| `tools/make-assets.js` | Regenerates the vein textures and icons (needs Playwright) |
| `tests/` | Engine tests |
