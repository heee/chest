/*
 * Chess engine: board set-up, legal move generation, check detection and hint scoring.
 * Ported from the design prototype (chess-design-reference.html).
 *
 * Board: an array of 64 squares, index 0 = a8, 7 = h8, 56 = a1, 63 = h1.
 * A piece is {t: "p"|"n"|"b"|"r"|"q"|"k", w: true for White}.
 * A position ("g") is {board, castle, ep}: castle is {K,Q,k,q} or null (lessons), ep is the
 * en-passant target square or -1.
 */
(function (root) {
  "use strict";

  var FILES = "abcdefgh";
  var PV = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  var NAMES = { p: "Pawn", n: "Knight", b: "Bishop", r: "Rook", q: "Queen", k: "King" };
  var ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  var KN = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];

  var LESSONS = [
    { title: "Pawn race", back: "........", full: false, short: "Only pawns",
      goal: "Bring one of your pawns all the way to the other side. Pawns only move forward." },
    { title: "Rooks join in", back: "r......r", full: false, short: "Pawns and Rooks",
      goal: "Reach the other side with a pawn, or capture every enemy piece. Rooks slide in straight lines." },
    { title: "Bishops join in", back: "..b..b..", full: false, short: "Pawns and Bishops",
      goal: "Reach the other side with a pawn, or capture every enemy piece. Bishops slide diagonally." },
    { title: "Knights join in", back: ".n....n.", full: false, short: "Pawns and Knights",
      goal: "Reach the other side with a pawn, or capture every enemy piece. Knights jump in an L." },
    { title: "Queen joins in", back: "...q....", full: false, short: "Pawns and the Queen",
      goal: "Reach the other side with a pawn, or capture every enemy piece. The Queen goes any direction." },
    { title: "Full game", back: "rnbqkbnr", full: true, short: "Real chess",
      goal: "Every piece is on the board. Trap the other King so he cannot escape: that is checkmate." }
  ];

  function nm(i) { return FILES[i % 8] + (8 - Math.floor(i / 8)); }

  function makeBoard(back) {
    var b = [];
    for (var k = 0; k < 64; k++) b.push(null);
    for (var c = 0; c < 8; c++) {
      var t = back[c];
      if (t !== ".") { b[c] = { t: t, w: false }; b[56 + c] = { t: t, w: true }; }
      b[8 + c] = { t: "p", w: false };
      b[48 + c] = { t: "p", w: true };
    }
    return b;
  }

  function rays(b, i, dirs, slide) {
    var out = [], r = Math.floor(i / 8), c = i % 8;
    for (var d = 0; d < dirs.length; d++) {
      var rr = r + dirs[d][0], cc = c + dirs[d][1];
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        var j = rr * 8 + cc;
        out.push(j);
        if (b[j] || !slide) break;
        rr += dirs[d][0]; cc += dirs[d][1];
      }
    }
    return out;
  }

  /* Squares the piece on i attacks (for pawns: the two diagonal squares). */
  function attacks(b, i) {
    var p = b[i];
    if (!p) return [];
    var r = Math.floor(i / 8), c = i % 8;
    if (p.t === "p") {
      var dr = p.w ? -1 : 1, o = [];
      [-1, 1].forEach(function (dc) {
        var rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) o.push(rr * 8 + cc);
      });
      return o;
    }
    if (p.t === "n") return rays(b, i, KN, false);
    if (p.t === "b") return rays(b, i, DIAG, true);
    if (p.t === "r") return rays(b, i, ORTH, true);
    if (p.t === "q") return rays(b, i, ORTH.concat(DIAG), true);
    return rays(b, i, ORTH.concat(DIAG), false);
  }

  function isAttacked(b, sq, byWhite) {
    for (var i = 0; i < 64; i++) {
      var p = b[i];
      if (p && p.w === byWhite && attacks(b, i).indexOf(sq) >= 0) return true;
    }
    return false;
  }

  function kingSq(b, w) {
    for (var i = 0; i < 64; i++) { var p = b[i]; if (p && p.t === "k" && p.w === w) return i; }
    return -1;
  }

  /* No king on the board (lessons 1 to 5) means never in check. */
  function inCheck(b, w) { var k = kingSq(b, w); return k >= 0 && isAttacked(b, k, !w); }

  function pseudo(g, i) {
    var b = g.board, p = b[i], out = [];
    if (!p) return out;
    var r = Math.floor(i / 8);
    if (p.t === "p") {
      var dr = p.w ? -1 : 1, start = p.w ? 6 : 1, f = i + dr * 8;
      if (r + dr >= 0 && r + dr < 8 && !b[f]) {
        out.push({ from: i, to: f });
        var f2 = i + dr * 16;
        if (r === start && !b[f2]) out.push({ from: i, to: f2, dbl: true });
      }
      attacks(b, i).forEach(function (j) {
        if (b[j] && b[j].w !== p.w) out.push({ from: i, to: j });
        else if (!b[j] && j === g.ep) out.push({ from: i, to: j, ep: true });
      });
    } else {
      attacks(b, i).forEach(function (j) { if (!b[j] || b[j].w !== p.w) out.push({ from: i, to: j }); });
      if (p.t === "k" && g.castle) {
        var row = p.w ? 56 : 0, cr = g.castle;
        if (i === row + 4 && !inCheck(b, p.w)) {
          var rk = b[row + 7], rq = b[row];
          if (cr[p.w ? "K" : "k"] && !b[row + 5] && !b[row + 6] && rk && rk.t === "r" && rk.w === p.w &&
              !isAttacked(b, row + 5, !p.w))
            out.push({ from: i, to: row + 6, castle: "k" });
          if (cr[p.w ? "Q" : "q"] && !b[row + 3] && !b[row + 2] && !b[row + 1] && rq && rq.t === "r" && rq.w === p.w &&
              !isAttacked(b, row + 3, !p.w))
            out.push({ from: i, to: row + 2, castle: "q" });
        }
      }
    }
    return out;
  }

  /* Plays move m on position g and returns the new {board, castle, ep} plus what was captured
     and whether a pawn was promoted (always to a Queen). */
  function apply(g, m) {
    var b = g.board.slice(), p = b[m.from], cap = b[m.to];
    b[m.to] = p; b[m.from] = null;
    if (m.ep) { var cs = m.to + (p.w ? 8 : -8); cap = b[cs]; b[cs] = null; }
    if (m.castle) {
      var row = p.w ? 56 : 0;
      if (m.castle === "k") { b[row + 5] = b[row + 7]; b[row + 7] = null; }
      else { b[row + 3] = b[row]; b[row] = null; }
    }
    var promo = false;
    if (p.t === "p" && (m.to < 8 || m.to >= 56)) { b[m.to] = { t: "q", w: p.w }; promo = true; }
    var castle = null;
    if (g.castle) {
      castle = { K: g.castle.K, Q: g.castle.Q, k: g.castle.k, q: g.castle.q };
      if (p.t === "k") { if (p.w) { castle.K = false; castle.Q = false; } else { castle.k = false; castle.q = false; } }
      [[63, "K"], [56, "Q"], [7, "k"], [0, "q"]].forEach(function (x) {
        if (m.from === x[0] || m.to === x[0]) castle[x[1]] = false;
      });
    }
    return { board: b, castle: castle, ep: m.dbl ? (m.from + m.to) / 2 : -1, cap: cap, promo: promo };
  }

  function legal(g, i) {
    var p = g.board[i];
    if (!p) return [];
    return pseudo(g, i).filter(function (m) { return !inCheck(apply(g, m).board, p.w); });
  }

  function allLegal(g, w) {
    var o = [];
    for (var i = 0; i < 64; i++) { var p = g.board[i]; if (p && p.w === w) o = o.concat(legal(g, i)); }
    return o;
  }

  /* Picks the best simple move for side w. Scores capture value, promotion, check or mate,
     castling, safety (moving onto an attacked square costs points, less when protected) and a
     small bonus for central squares. */
  function bestMove(g, w, full) {
    var best = null, bs = -1e9;
    allLegal(g, w).forEach(function (m) {
      var p = g.board[m.from], n = apply(g, m), s = 0, cap = n.cap;
      if (cap) s += PV[cap.t] * 10;
      if (n.promo) s += full ? 80 : 1000;
      var nx = { board: n.board, castle: n.castle, ep: n.ep };
      var chk = inCheck(n.board, !w);
      var mate = full && chk && allLegal(nx, !w).length === 0;
      if (mate) s += 10000; else if (chk) s += 3;
      var danger = isAttacked(n.board, m.to, !w);
      if (danger) {
        var prot = isAttacked(n.board, m.to, w);
        s -= prot ? Math.max(0, PV[p.t] - (cap ? PV[cap.t] : 0)) * 5 : PV[p.t] * 10;
      }
      var r = Math.floor(m.to / 8), c = m.to % 8;
      s += (3.5 - Math.abs(3.5 - c)) * 0.3 + (3.5 - Math.abs(3.5 - r)) * 0.3;
      if (p.t === "k" && !m.castle) s -= 2;
      if (m.castle) s += 4;
      if (s > bs) {
        bs = s;
        best = { m: m, piece: p, cap: cap, promo: n.promo, check: chk, mate: mate, safe: !danger, castle: m.castle };
      }
    });
    return best;
  }

  /* Result of the position for the side to move, or null if the game goes on.
     lessonFull = false: a pawn reaching the far side or capturing everything wins. */
  function outcome(g, sideToMove, lessonFull, promoted) {
    var mover = !sideToMove;
    if (!lessonFull && promoted) return { kind: "promo", winner: mover };
    var oppHas = g.board.some(function (q) { return q && q.w === sideToMove; });
    if (!oppHas) return { kind: "wipe", winner: mover };
    if (allLegal(g, sideToMove).length === 0) {
      if (inCheck(g.board, sideToMove)) return { kind: "mate", winner: mover };
      return { kind: "stalemate", winner: null };
    }
    return null;
  }

  /* 5x5 teaching diagram: returns 25 cells, each "", "dot", "ring" or "center". */
  function diagramFor(t) {
    var kinds = {};
    function mark(dr, dc, k) { var r = 2 + dr, c = 2 + dc; if (r >= 0 && r < 5 && c >= 0 && c < 5) kinds[r * 5 + c] = k; }
    if (t === "p") { mark(-1, 0, "dot"); mark(-2, 0, "dot"); mark(-1, -1, "ring"); mark(-1, 1, "ring"); }
    else if (t === "n") { KN.forEach(function (d) { mark(d[0], d[1], "dot"); }); }
    else {
      var dirs = t === "b" ? DIAG : t === "r" ? ORTH : ORTH.concat(DIAG);
      var reach = t === "k" ? 1 : 2;
      dirs.forEach(function (d) { for (var s = 1; s <= reach; s++) mark(d[0] * s, d[1] * s, "dot"); });
    }
    var out = [];
    for (var i = 0; i < 25; i++) out.push(i === 12 ? "center" : kinds[i] || "");
    return out;
  }

  var api = {
    FILES: FILES, PV: PV, NAMES: NAMES, LESSONS: LESSONS,
    nm: nm, makeBoard: makeBoard, attacks: attacks, isAttacked: isAttacked, kingSq: kingSq,
    inCheck: inCheck, pseudo: pseudo, apply: apply, legal: legal, allLegal: allLegal,
    bestMove: bestMove, outcome: outcome, diagramFor: diagramFor
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Chess = api;
})(this);
