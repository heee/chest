# Chess Coach

Chess for two players on one iPad, made for Sophia (7) and Natalie (5). The iPad lies flat between them. White sits at the bottom edge, Black at the top, and a picture coach on the right shows how each piece moves. The coach turns to face whoever's turn it is.

It is a static web app: plain HTML, CSS and JavaScript, with no build step, no accounts and no server code. Added to the Home Screen, it runs full screen and works offline.

## What's in it

- **Six lessons:** Pawn race, then Rooks, Bishops, Knights and the Queen join in, then the Full game. In lessons 1 to 5 you win by getting a pawn to the far side or by capturing every enemy piece. The Full game is won by checkmate.
- **Full chess rules:** castling both ways, en passant, promotion (always to a Queen), check, checkmate and stalemate. A king can never move into check. Undo goes back one move at a time.
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

The tests check move generation against standard perft counts (start position, "Kiwipete", and an en passant endgame), plus castling, en passant, promotion, mate, stalemate, the lesson win rules, hints and the coach diagrams.

## Host it for free on GitHub Pages

The repository includes a workflow (`.github/workflows/pages.yml`) that runs the tests and publishes the site every time `main` changes.

1. Merge this branch into `main`.
2. On GitHub, open the repository's **Settings → Pages**. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Open the **Actions** tab and wait for "Publish to GitHub Pages" to finish. If it ran before you changed the setting, choose **Run workflow** to run it again.
4. The site will be at `https://<your-user>.github.io/<repository>/`, for example `https://heee.github.io/chest/`.

GitHub Pages on a free account requires the repository to be public. Netlify, Cloudflare Pages and Vercel all host static sites like this one for free too: point them at the repository with no build command and the root folder as the output.

## Install on the iPad

1. Open the site in **Safari**.
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Open Chess from the Home Screen. It runs full screen, and after this first launch it works without Wi-Fi.

Tip: lock rotation in Control Center while it's in landscape, so the screen doesn't flip when someone leans over the iPad.

## Publishing an update

The app caches itself for offline use. After changing any file, bump `VERSION` in `sw.js` (for example `chess-coach-v2`) so iPads download the new copy. An installed app picks up the update the next time it is opened with a connection, and shows it from the launch after that.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | Page shell and the marble gradients for the pieces |
| `css/app.css` | Marble look and layout |
| `js/engine.js` | Chess rules, lessons and hint scoring (also loaded by the tests) |
| `js/pieces.js` | Staunton piece shapes (SVG) |
| `js/app.js` | Game state, saving, the board, the coach pane and buttons |
| `sw.js`, `manifest.webmanifest` | Offline support and Home Screen install |
| `fonts/` | Outfit, bundled for offline use (SIL Open Font License, see `fonts/OFL.txt`) |
| `img/` | Marble vein textures |
| `icons/` | Home Screen icons |
| `tools/make-assets.js` | Regenerates the vein textures and icons (needs Playwright) |
| `tests/` | Engine tests |
