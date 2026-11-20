/* Chess Coach: game state, rendering and controls. Uses Chess (engine.js) and pieceSvg (pieces.js). */
(function () {
  "use strict";

  var C = window.Chess;
  var LESSONS = C.LESSONS, NAMES = C.NAMES, nm = C.nm;
  var SAVE_KEY = "chess-coach-v1";
  var DEFAULT_NAMES = { w: "Sophia", b: "Natalie" };
  var CONFIRM_MS = 3500;

  var SHORT = {
    p: "One step forward. Two on its first move. Captures diagonally.",
    n: "Jumps in an L shape, even over pieces.",
    b: "Slides corner to corner, as far as it likes.",
    r: "Slides straight, as far as it likes.",
    q: "Slides any direction, as far as she likes.",
    k: "One step any direction. Keep him safe!"
  };

  var ICON_WARN = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5"/><path d="M12 18h.01"/></svg>';
  var ICON_HINT = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/></svg>';

  /* ---------- State ---------- */

  function newGame(li) {
    var L = LESSONS[li];
    return {
      board: C.makeBoard(L.back), turn: true,
      castle: L.full ? { K: true, Q: true, k: true, q: true } : null,
      ep: -1, hist: [], lesson: li, last: null, over: null
    };
  }

  var names = { w: DEFAULT_NAMES.w, b: DEFAULT_NAMES.b };
  var game = newGame(0);
  var ui = { sel: -1, hint: null, mode: "main", confirm: null, confirmTimer: 0 };

  function load() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d.names) {
        if (typeof d.names.w === "string") names.w = d.names.w;
        if (typeof d.names.b === "string") names.b = d.names.b;
      }
      var g = d.game;
      if (g && Array.isArray(g.board) && g.board.length === 64 && LESSONS[g.lesson] && Array.isArray(g.hist)) {
        game = {
          board: g.board, turn: !!g.turn, castle: g.castle || null, ep: typeof g.ep === "number" ? g.ep : -1,
          hist: g.hist, lesson: g.lesson, last: g.last || null, over: g.over || null
        };
      }
    } catch (e) { /* Storage blocked or bad data: start fresh. */ }
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ names: names, game: game })); } catch (e) { /* ignore */ }
  }

  function nameOf(white) {
    var n = (white ? names.w : names.b).trim();
    return n || (white ? DEFAULT_NAMES.w : DEFAULT_NAMES.b);
  }

  function pos() { return { board: game.board, castle: game.castle, ep: game.ep }; }

  /* ---------- Game actions ---------- */

  function pick(i) {
    if (ui.mode !== "main") { ui.mode = "main"; clearConfirm(); }
    if (game.over) { render(); return; }
    if (ui.sel >= 0) {
      var ms = C.legal(pos(), ui.sel).filter(function (m) { return m.to === i; });
      if (ms.length) { move(ms[0]); return; }
    }
    var p = game.board[i];
    ui.sel = p && p.w === game.turn && ui.sel !== i ? i : -1;
    render();
  }

  function move(m) {
    var L = LESSONS[game.lesson];
    var n = C.apply(pos(), m);
    var next = !game.turn;
    game.hist.push({ board: game.board, turn: game.turn, castle: game.castle, ep: game.ep, last: game.last, over: game.over });
    // In the lessons a pawn that reaches the far side wins, so it stays a pawn instead of becoming a Queen.
    if (n.promo && !L.full) n.board[m.to] = { t: "p", w: game.turn };
    game.board = n.board;
    game.castle = n.castle;
    game.ep = n.ep;
    game.turn = next;
    game.last = { from: m.from, to: m.to };
    game.over = C.outcome({ board: n.board, castle: n.castle, ep: n.ep }, next, L.full, n.promo);
    if (!game.over && L.full && repeatedThreeTimes()) game.over = { kind: "repetition", winner: null };
    ui.sel = -1;
    ui.hint = null;
    clearConfirm();
    save();
    render();
  }

  /* Draw when the same position (same pieces, same player to move) has come up three times. */
  function repeatedThreeTimes() {
    var key = C.positionKey(pos(), game.turn), count = 1;
    for (var k = game.hist.length - 1; k >= 0 && count < 3; k--) {
      var h = game.hist[k];
      if (h.turn === game.turn && C.positionKey(h, h.turn) === key) count++;
    }
    return count >= 3;
  }

  function undo() {
    if (!game.hist.length) return;
    var s = game.hist.pop();
    game.board = s.board; game.turn = s.turn; game.castle = s.castle; game.ep = s.ep;
    game.last = s.last; game.over = s.over;
    ui.sel = -1; ui.hint = null; ui.mode = "main";
    clearConfirm();
    save();
    render();
  }

  function hint() {
    if (game.over) return;
    var L = LESSONS[game.lesson];
    var b = C.bestMove(pos(), game.turn, L.full);
    ui.mode = "main";
    clearConfirm();
    if (!b) { render(); return; }
    var why;
    if (b.mate) why = "That is checkmate.";
    else if (b.promo && !L.full) why = "Your pawn reaches the other side and you win.";
    else if (b.promo) why = "Your pawn reaches the end and becomes a Queen.";
    else if (b.cap) why = "It captures a " + NAMES[b.cap.t] + (b.safe ? ", and it is safe there." : ".");
    else if (b.castle) why = "Castling tucks your King in safely.";
    else if (b.check) why = "It puts the King in check.";
    else if (b.safe) why = "Nothing can capture it there.";
    else why = "It is the best move I can find, but be careful.";
    ui.sel = -1;
    ui.hint = { from: b.m.from, to: b.m.to, text: "Try your " + NAMES[b.piece.t] + " from " + nm(b.m.from) + " to " + nm(b.m.to) + ". " + why };
    render();
  }

  function inProgress() { return game.hist.length > 0 && !game.over; }

  /* Wiping a game in progress needs a second tap within a few seconds. */
  function confirmed(key) {
    if (!inProgress() || ui.confirm === key) { clearConfirm(); return true; }
    clearConfirm();
    ui.confirm = key;
    ui.confirmTimer = setTimeout(function () { ui.confirm = null; render(); }, CONFIRM_MS);
    render();
    return false;
  }

  function clearConfirm() {
    if (ui.confirmTimer) clearTimeout(ui.confirmTimer);
    ui.confirmTimer = 0;
    ui.confirm = null;
  }

  function startLesson(li) {
    game = newGame(li);
    ui.sel = -1; ui.hint = null; ui.mode = "main";
    save();
    render();
  }

  /* ---------- Board ---------- */

  var boardEl = document.getElementById("board");
  var squares = [];

  /* Stable pseudo-random vein offsets, so each square shows its own piece of stone. */
  function seeded(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function buildBoard() {
    for (var i = 0; i < 64; i++) {
      var r = Math.floor(i / 8), c = i % 8;
      var el = document.createElement("button");
      el.type = "button";
      el.className = "sq " + ((r + c) % 2 === 0 ? "light" : "dark");
      el.setAttribute("role", "gridcell");
      var vx = Math.round(seeded(i) * 299), vy = Math.round(seeded(i + 64) * 299);
      el.style.backgroundPosition = "-" + vx + "px -" + vy + "px, 0 0";
      var html = "";
      if (c === 0) html += '<span class="coord rank" aria-hidden="true">' + (8 - r) + "</span>";
      if (r === 7) html += '<span class="coord file" aria-hidden="true">' + C.FILES[c] + "</span>";
      html += '<span class="slot"></span><span class="mark"></span>';
      el.innerHTML = html;
      el.addEventListener("click", (function (i) { return function () { pick(i); }; })(i));
      boardEl.appendChild(el);
      squares.push({ el: el, slot: el.querySelector(".slot"), mark: el.querySelector(".mark"), light: (r + c) % 2 === 0, key: "", markKey: "", cls: "" });
    }
  }

  function renderBoard() {
    var targets = {};
    if (ui.sel >= 0 && !game.over) C.legal(pos(), ui.sel).forEach(function (m) { targets[m.to] = m; });
    var chk = LESSONS[game.lesson].full && C.inCheck(game.board, game.turn) && !(game.over && game.over.kind !== "mate")
      ? C.kingSq(game.board, game.turn) : -1;

    for (var i = 0; i < 64; i++) {
      var s = squares[i], p = game.board[i], t = targets[i];
      var cls = "sq " + (s.light ? "light" : "dark");
      if (game.last && (i === game.last.from || i === game.last.to)) cls += " last";
      if (ui.hint && (i === ui.hint.from || i === ui.hint.to)) cls = cls.replace(" last", "") + " hint";
      if (i === ui.sel) cls = cls.replace(" last", "").replace(" hint", "") + " sel";
      if (i === chk) cls += " check";
      if (cls !== s.cls) { s.el.className = cls; s.cls = cls; }

      var key = p ? (p.w ? "w" : "b") + p.t : "";
      if (key !== s.key) {
        s.slot.innerHTML = p
          ? '<span class="piece' + (p.w ? "" : " flip") + '"><span>' + window.pieceSvg(p.t, p.w, !p.w, 74) + "</span></span>"
          : "";
        s.key = key;
      }

      var markKey = t ? (p || t.ep ? "ring" : "dot") : "";
      if (markKey !== s.markKey) {
        s.mark.innerHTML = markKey ? '<span class="move-' + markKey + '" aria-hidden="true"></span>' : "";
        s.markKey = markKey;
      }

      var label = nm(i) + (p ? ", " + (p.w ? "white " : "black ") + NAMES[p.t] : ", empty") + (t ? ", can move here" : "");
      if (s.el.getAttribute("aria-label") !== label) s.el.setAttribute("aria-label", label);
    }
  }

  /* ---------- Coach pane ---------- */

  var paneTurn = document.getElementById("paneTurn");
  var pane = document.getElementById("pane");
  var paneBody = document.getElementById("paneBody");
  var turnDot = document.getElementById("turnDot");
  var turnTitle = document.getElementById("turnTitle");
  var turnSub = document.getElementById("turnSub");
  var btnHint = document.getElementById("btnHint");
  var btnUndo = document.getElementById("btnUndo");
  var btnLessons = document.getElementById("btnLessons");
  var btnRestart = document.getElementById("btnRestart");

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function overText() {
    var o = game.over;
    if (!o) return null;
    var W = o.winner === null ? "" : nameOf(o.winner), Lo = o.winner === null ? "" : nameOf(!o.winner);
    if (o.kind === "promo") return { title: W + " wins!", body: "A pawn made it all the way to the other side." };
    if (o.kind === "wipe") return { title: W + " wins!", body: "Every one of " + Lo + "'s pieces was captured." };
    if (o.kind === "mate") return { title: "Checkmate! " + W + " wins", body: Lo + "'s King is trapped and cannot escape." };
    if (o.kind === "repetition") return { title: "It's a draw", body: "The same position came up three times, so nobody can win. That's a draw." };
    if (o.kind === "material") return { title: "It's a draw", body: "Nobody has enough pieces left to checkmate. That's a draw." };
    return { title: "It's a draw", body: nameOf(game.turn) + " has no moves left. In chess this is called stalemate." };
  }

  /* Who the pane faces: the player to move, or once the game ends, the winner
     (in a draw, the player who made the last move). */
  function facingWhite() {
    if (game.over) return game.over.winner === null ? !game.turn : game.over.winner;
    return game.turn;
  }

  function warningsFor() {
    var out = [];
    if (game.over) return out;
    var b = game.board, me = game.turn;
    if (LESSONS[game.lesson].full && C.inCheck(b, me))
      out.push("Your King is in check. Move him to safety, block the attack, or capture the attacker.");
    for (var j = 0; j < 64 && out.length < 2; j++) {
      var q = b[j];
      if (q && q.w === me && q.t !== "k" && C.isAttacked(b, j, !me) && !C.isAttacked(b, j, me))
        out.push("Your " + NAMES[q.t] + " on " + nm(j) + " could be captured, and nothing is protecting it.");
    }
    return out.slice(0, 2);
  }

  function diagramHtml(t, white) {
    var cells = C.diagramFor(t), html = "";
    for (var i = 0; i < 25; i++) {
      var light = (Math.floor(i / 5) + i % 5) % 2 === 0, k = cells[i];
      var vx = Math.round(seeded(i + 200) * 160), vy = Math.round(seeded(i + 300) * 160);
      var inner = k === "center" ? window.pieceSvg(t, white, false, 26)
        : k === "dot" ? '<span class="d-dot"></span>'
        : k === "ring" ? '<span class="d-ring"></span>' : "";
      html += '<span class="' + (light ? "light" : "dark") + (k === "center" ? " center" : "") +
        '" style="background-position: -' + vx + "px -" + vy + 'px, 0 0">' + inner + "</span>";
    }
    return '<div class="diagram" aria-hidden="true">' + html + "</div>";
  }

  function mainHtml() {
    var L = LESSONS[game.lesson], h = "";
    h += '<div class="lesson-card">' +
      '<span class="lesson-label">Lesson ' + (game.lesson + 1) + " of " + LESSONS.length + "</span>" +
      '<span class="lesson-title">' + esc(L.title) + "</span>" +
      '<span class="lesson-goal">' + esc(L.goal) + "</span></div>";

    var ot = overText();
    if (ot) {
      h += '<div class="over-card" role="status">' +
        '<span class="over-title">' + esc(ot.title) + "</span>" +
        '<span class="over-body">' + esc(ot.body) + "</span>" +
        '<button type="button" class="btn" data-action="again">Play again</button></div>';
    } else {
      var sp = ui.sel >= 0 ? game.board[ui.sel] : null;
      if (sp) {
        var none = C.legal(pos(), ui.sel).length === 0;
        h += '<div class="card coach">' +
          "<h2>The " + NAMES[sp.t] + "</h2>" +
          '<div class="coach-main">' + diagramHtml(sp.t, sp.w) +
          '<div class="coach-text"><p class="coach-line">' + SHORT[sp.t] + "</p>" +
          '<div class="legend"><span><span class="d-dot"></span>moves</span><span><span class="d-ring"></span>captures</span></div>' +
          "</div></div>" +
          (none ? '<p class="coach-line" style="font-size: 15px; color: var(--gold); font-weight: 600">This one can\'t move right now.</p>' : "") +
          "</div>";
      } else {
        h += '<div class="card coach">' +
          "<h2>Your move, " + esc(nameOf(game.turn)) + "</h2>" +
          '<p class="coach-line">Tap a piece to see how it moves.</p></div>';
      }
    }

    warningsFor().forEach(function (w) {
      h += '<div class="alert warn" role="status">' + ICON_WARN + "<span>" + esc(w) + "</span></div>";
    });
    if (ui.hint) h += '<div class="alert hint" role="status">' + ICON_HINT + "<span>" + esc(ui.hint.text) + "</span></div>";
    return h;
  }

  function lessonsHtml() {
    var h = '<h2 class="section-title">Choose a lesson</h2><div class="lesson-list">';
    LESSONS.forEach(function (l, k) {
      var confirming = ui.confirm === "lesson" + k;
      h += '<button type="button" class="lesson-row' + (k === game.lesson ? " current" : "") + (confirming ? " confirm" : "") +
        '" data-lesson="' + k + '">' +
        '<span class="lesson-num">' + (k + 1) + "</span>" +
        '<span class="lesson-row-text"><span class="lesson-row-title">' + esc(l.title) + "</span>" +
        '<span class="lesson-row-sub">' + (confirming ? "Tap again to start this lesson" : esc(l.short)) + "</span></span></button>";
    });
    return h + "</div>";
  }

  function namesHtml() {
    return '<h2 class="section-title">Players</h2><div class="names">' +
      '<div class="name-field"><label for="nameW"><span class="turn-dot white"></span>White, sits at the bottom</label>' +
      '<input id="nameW" data-side="w" maxlength="14" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="next" value="' + esc(names.w) + '"></div>' +
      '<div class="name-field"><label for="nameB"><span class="turn-dot black"></span>Black, sits at the top</label>' +
      '<input id="nameB" data-side="b" maxlength="14" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" value="' + esc(names.b) + '"></div>' +
      '<button type="button" class="btn primary" data-action="names-done">Done</button></div>';
  }

  function renderHeader() {
    var fw = facingWhite();
    paneTurn.classList.toggle("facing-black", !fw);
    turnDot.className = "turn-dot " + (fw ? "white" : "black");
    var o = game.over;
    turnTitle.textContent = !o ? nameOf(game.turn) + "'s turn" : o.winner === null ? "It's a draw" : nameOf(o.winner) + " wins!";
    turnSub.textContent = o ? "Game over" : (game.turn ? "White" : "Black") + " · Move " + (Math.floor(game.hist.length / 2) + 1);
  }

  function renderPane() {
    renderHeader();
    if (ui.mode === "lessons") paneBody.innerHTML = lessonsHtml();
    else if (ui.mode === "names") paneBody.innerHTML = namesHtml();
    else paneBody.innerHTML = mainHtml();
    fitPane();

    btnHint.disabled = !!game.over;
    btnUndo.disabled = game.hist.length === 0;
    btnLessons.textContent = ui.mode === "lessons" ? "Back to game" : "Lessons";
    var rc = ui.confirm === "restart";
    btnRestart.textContent = rc ? "Tap again to reset" : "Start over";
    btnRestart.classList.toggle("confirm", rc);
    btnRestart.setAttribute("aria-label", rc ? "Tap again to start over" : "Start over");
  }

  /* Steps down to more compact layouts until everything fits in the pane. */
  function fitPane() {
    pane.classList.remove("c1", "c2", "c3", "c4");
    var levels = ["c1", "c2", "c3", "c4"];
    for (var k = 0; k < levels.length && paneBody.scrollHeight > paneBody.clientHeight + 1; k++) {
      pane.classList.add(levels[k]);
    }
  }

  function render() {
    renderBoard();
    renderPane();
  }

  /* ---------- Events ---------- */

  btnHint.addEventListener("click", hint);
  btnUndo.addEventListener("click", undo);
  btnLessons.addEventListener("click", function () {
    clearConfirm();
    ui.mode = ui.mode === "lessons" ? "main" : "lessons";
    ui.sel = -1;
    render();
  });
  btnRestart.addEventListener("click", function () {
    if (confirmed("restart")) startLesson(game.lesson);
  });
  document.getElementById("nameBtn").addEventListener("click", function () {
    clearConfirm();
    ui.mode = ui.mode === "names" ? "main" : "names";
    ui.sel = -1;
    render();
  });

  paneBody.addEventListener("click", function (e) {
    var row = e.target.closest("[data-lesson]");
    if (row) {
      var k = Number(row.getAttribute("data-lesson"));
      if (confirmed("lesson" + k)) startLesson(k);
      return;
    }
    var act = e.target.closest("[data-action]");
    if (!act) return;
    var a = act.getAttribute("data-action");
    if (a === "again") startLesson(game.lesson);
    if (a === "names-done") { closeNames(); }
  });

  paneBody.addEventListener("input", function (e) {
    var side = e.target.getAttribute && e.target.getAttribute("data-side");
    if (!side) return;
    names[side] = e.target.value.slice(0, 14);
    save();
    renderHeader();
  });

  paneBody.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var side = e.target.getAttribute && e.target.getAttribute("data-side");
    if (side === "w") { e.preventDefault(); document.getElementById("nameB").focus(); }
    else if (side === "b") { e.preventDefault(); closeNames(); }
  });

  function closeNames() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    names.w = names.w.trim(); names.b = names.b.trim();
    save();
    ui.mode = "main";
    render();
    window.scrollTo(0, 0);
  }

  /* ---------- Fit the stage to the screen ---------- */

  var stage = document.getElementById("stage");
  function fitStage() {
    var vw = window.innerWidth, vh = window.innerHeight;
    stage.style.setProperty("--scale", Math.min(vw / 1133, vh / 744));
  }
  window.addEventListener("resize", fitStage);
  window.addEventListener("orientationchange", function () { setTimeout(fitStage, 250); });

  /* No pinch or double-tap zoom while playing. */
  document.addEventListener("gesturestart", function (e) { e.preventDefault(); });
  document.addEventListener("dblclick", function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener("touchmove", function (e) {
    if (e.touches.length > 1 || !e.target.closest("input")) e.preventDefault();
  }, { passive: false });

  /* ---------- Start ---------- */

  load();
  buildBoard();
  fitStage();
  // Render once without the turn animation so the pane appears already facing the right way.
  paneTurn.style.transition = "none";
  render();
  void paneTurn.offsetWidth;
  paneTurn.style.transition = "";
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPane);

  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () { /* offline support unavailable */ });
    });
  }
})();
