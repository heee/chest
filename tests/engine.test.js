// Run with: node --test tests/
const test = require("node:test");
const assert = require("node:assert");
const C = require("../js/engine.js");

function sq(name) { return (8 - Number(name[1])) * 8 + C.FILES.indexOf(name[0]); }

function fromFen(fen) {
  const [placement, side, castling, ep] = fen.split(" ");
  const board = [];
  for (const ch of placement.replace(/\//g, "")) {
    if (/\d/.test(ch)) for (let k = 0; k < Number(ch); k++) board.push(null);
    else board.push({ t: ch.toLowerCase(), w: ch === ch.toUpperCase() });
  }
  assert.strictEqual(board.length, 64);
  const castle = { K: castling.includes("K"), Q: castling.includes("Q"), k: castling.includes("k"), q: castling.includes("q") };
  return { g: { board, castle, ep: ep === "-" ? -1 : sq(ep) }, white: side === "w" };
}

function perft(g, w, depth) {
  const moves = C.allLegal(g, w);
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) {
    const r = C.apply(g, m);
    n += perft({ board: r.board, castle: r.castle, ep: r.ep }, !w, depth - 1);
  }
  return n;
}

function play(g, white, from, to) {
  const m = C.legal(g, sq(from)).find((x) => x.to === sq(to));
  assert.ok(m, `${from}-${to} should be legal`);
  const r = C.apply(g, m);
  return { g: { board: r.board, castle: r.castle, ep: r.ep }, r };
}

test("perft: start position", () => {
  const { g, white } = fromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  assert.deepStrictEqual([1, 2, 3, 4].map((d) => perft(g, white, d)), [20, 400, 8902, 197281]);
});

test("perft: Kiwipete (castling, en passant, pins)", () => {
  const { g, white } = fromFen("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1");
  assert.deepStrictEqual([1, 2, 3].map((d) => perft(g, white, d)), [48, 2039, 97862]);
});

test("perft: endgame position 3 (en passant discovered checks)", () => {
  const { g, white } = fromFen("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1");
  assert.deepStrictEqual([1, 2, 3, 4].map((d) => perft(g, white, d)), [14, 191, 2812, 43238]);
});

test("castling moves king and rook, and clears rights", () => {
  const { g } = fromFen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
  const { g: g2 } = play(g, true, "e1", "g1");
  assert.strictEqual(g2.board[sq("g1")].t, "k");
  assert.strictEqual(g2.board[sq("f1")].t, "r");
  assert.strictEqual(g2.board[sq("h1")], null);
  assert.strictEqual(g2.castle.K, false);
  assert.strictEqual(g2.castle.Q, false);
  const { g: g3 } = play(g2, false, "e8", "c8");
  assert.strictEqual(g3.board[sq("c8")].t, "k");
  assert.strictEqual(g3.board[sq("d8")].t, "r");
});

test("cannot castle out of, through, or into check", () => {
  const through = fromFen("4k3/4r3/8/8/8/8/8/R3K2R w KQ - 0 1").g; // e7 rook: e1 in check
  assert.ok(!C.legal(through, sq("e1")).some((m) => m.castle));
  const cross = fromFen("4kr2/8/8/8/8/8/8/R3K2R w KQ - 0 1").g; // f-file attacked
  const ms = C.legal(cross, sq("e1"));
  assert.ok(!ms.some((m) => m.castle === "k"));
  assert.ok(ms.some((m) => m.castle === "q"));
});

test("en passant capture removes the passed pawn", () => {
  let { g } = fromFen("4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1");
  ({ g } = play(g, false, "d7", "d5"));
  assert.strictEqual(g.ep, sq("d6"));
  const { g: g2, r } = play(g, true, "e5", "d6");
  assert.strictEqual(r.cap.t, "p");
  assert.strictEqual(g2.board[sq("d5")], null);
});

test("promotion makes a Queen", () => {
  const { g } = fromFen("4k3/1P6/8/8/8/8/8/4K3 w - - 0 1");
  const { g: g2, r } = play(g, true, "b7", "b8");
  assert.ok(r.promo);
  assert.deepStrictEqual(g2.board[sq("b8")], { t: "q", w: true });
});

test("a king may not move into check", () => {
  const { g } = fromFen("4k3/8/8/8/8/8/3r4/4K3 w - - 0 1");
  const targets = C.legal(g, sq("e1")).map((m) => C.nm(m.to)).sort();
  assert.deepStrictEqual(targets, ["d2", "f1"].sort()); // d1, e2, f2 attacked; d2 captures
});

test("checkmate and stalemate outcomes", () => {
  // Fool's mate
  let g = { board: C.makeBoard("rnbqkbnr"), castle: { K: true, Q: true, k: true, q: true }, ep: -1 };
  ({ g } = play(g, true, "f2", "f3"));
  ({ g } = play(g, false, "e7", "e5"));
  ({ g } = play(g, true, "g2", "g4"));
  ({ g } = play(g, false, "d8", "h4"));
  assert.deepStrictEqual(C.outcome(g, true, true, false), { kind: "mate", winner: false });

  const stale = fromFen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1").g;
  assert.deepStrictEqual(C.outcome(stale, false, true, false), { kind: "stalemate", winner: null });
});

test("lessons: promotion wins, capturing everything wins", () => {
  for (const L of C.LESSONS) {
    const b = C.makeBoard(L.back);
    assert.strictEqual(b.filter(Boolean).length, 16 + 2 * L.back.replace(/\./g, "").length);
  }
  assert.deepStrictEqual(C.outcome({ board: [], castle: null, ep: -1 }, false, false, true), { kind: "promo", winner: true });
  const board = Array(64).fill(null);
  board[sq("a4")] = { t: "p", w: true };
  assert.deepStrictEqual(C.outcome({ board, castle: null, ep: -1 }, false, false, false), { kind: "wipe", winner: true });
});

test("hint finds mate in one and prefers safe captures", () => {
  const { g } = fromFen("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1");
  const b = C.bestMove(g, true, true);
  assert.ok(b.mate);
  assert.strictEqual(C.nm(b.m.to), "a8");

  const lesson = fromFen("8/8/8/3p4/4P3/8/8/8 w - - 0 1").g;
  lesson.castle = null;
  const h = C.bestMove(lesson, true, false);
  assert.strictEqual(C.nm(h.m.to), "d5");
  assert.ok(h.cap);
});

test("diagrams", () => {
  const n = C.diagramFor("n");
  assert.strictEqual(n.filter((x) => x === "dot").length, 8);
  const p = C.diagramFor("p");
  assert.strictEqual(p.filter((x) => x === "ring").length, 2);
  assert.strictEqual(p.filter((x) => x === "dot").length, 2);
  assert.strictEqual(C.diagramFor("k").filter((x) => x === "dot").length, 8);
  assert.strictEqual(C.diagramFor("q").filter((x) => x === "dot").length, 16);
  assert.strictEqual(C.diagramFor("r").filter((x) => x === "dot").length, 8);
});

test("draw: not enough pieces to checkmate", () => {
  const ins = (f) => C.insufficientMaterial(fromFen(f + " w - - 0 1").g.board);
  assert.ok(ins("4k3/8/8/8/8/8/8/4K3"));                 // K v K
  assert.ok(ins("4k3/8/8/8/8/8/8/2B1K3"));               // K+B v K
  assert.ok(ins("4k3/8/8/8/8/8/8/1N2K3"));               // K+N v K
  assert.ok(ins("2b1k3/8/8/8/8/8/8/2B1K3") === false);    // bishops on opposite colours
  assert.ok(ins("3bk3/8/8/8/8/8/8/2B1K3"));              // bishops on the same colour
  assert.ok(!ins("4k3/8/8/8/8/8/8/1NN1K3"));              // two knights: not automatic
  assert.ok(!ins("4k3/8/8/8/8/8/4P3/4K3"));               // a pawn can still promote
  assert.ok(!ins("4k3/8/8/8/8/8/8/R3K3"));
  // Capturing the last piece ends the full game in a draw, but never a lesson.
  const { g } = fromFen("4k3/8/8/8/8/8/3r4/4K3 w - - 0 1");
  const { g: g2 } = play(g, true, "e1", "d2");
  assert.deepStrictEqual(C.outcome(g2, false, true, false), { kind: "material", winner: null });
});

test("draw: position keys for repetition", () => {
  let g = { board: C.makeBoard("rnbqkbnr"), castle: { K: true, Q: true, k: true, q: true }, ep: -1 };
  const start = C.positionKey(g, true);
  for (const [a, b] of [["g1", "f3"], ["g8", "f6"], ["f3", "g1"], ["f6", "g8"]]) ({ g } = play(g, null, a, b));
  assert.strictEqual(C.positionKey(g, true), start); // knights out and back: same position
  // A double pawn step only counts the en passant square when a capture is possible.
  ({ g } = play(g, true, "e2", "e4"));
  assert.ok(!/\d+$/.test(C.positionKey(g, false)));
  // Lost castling rights make it a different position.
  const noCastle = { board: g.board, castle: { K: false, Q: true, k: true, q: true }, ep: -1 };
  assert.notStrictEqual(C.positionKey(noCastle, false), C.positionKey({ ...g, ep: -1 }, false));
});
