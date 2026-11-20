/* Staunton piece silhouettes from the design prototype, drawn in a 100 x 100 viewBox. */
(function (root) {
  "use strict";

  var PATHS = {
    p: '<path d="M22 92 Q22 84 30 82 H70 Q78 84 78 92 Z"/><path d="M32 82 Q34 76 40 74 H60 Q66 76 68 82 Z"/>' +
       '<path d="M41 74 Q45 64 45 57 H55 Q55 64 59 74 Z"/><ellipse cx="50" cy="56" rx="13" ry="4"/><circle cx="50" cy="41" r="12.5"/>',
    r: '<path d="M20 92 Q20 84 28 82 H72 Q80 84 80 92 Z"/><path d="M30 82 Q32 76 38 74 H62 Q68 76 70 82 Z"/>' +
       '<path d="M37 74 L39 47 H61 L63 74 Z"/><path d="M34 47 Q34 43 38 42 H62 Q66 43 66 47 Z"/>' +
       '<path d="M34 42 V24 H41 V31 H46.5 V24 H53.5 V31 H59 V24 H66 V42 Z"/>',
    b: '<path d="M22 92 Q22 84 30 82 H70 Q78 84 78 92 Z"/><path d="M32 82 Q34 76 40 74 H60 Q66 76 68 82 Z"/>' +
       '<path d="M41 74 Q45 64 45 59 H55 Q55 64 59 74 Z"/><ellipse cx="50" cy="58" rx="14" ry="4"/>' +
       '<path d="M50 19 C37 30 35 43 42 53 H58 C65 43 63 30 50 19 Z"/><circle cx="50" cy="14" r="4.5"/>' +
       '<path d="M55 29 L46 41" fill="none"/>',
    n: '<path d="M20 92 Q20 84 28 82 H72 Q80 84 80 92 Z"/><path d="M30 82 Q32 76 38 74 H64 Q70 76 70 82 Z"/>' +
       '<path d="M36 74 C36 63 42 57 46 51 C40 52 33 55 28 52 C23 49 25 42 31 38 C38 33 42 25 51 20 L53 12 L58 19 C70 22 75 36 73 52 C71 62 67 68 67 74 Z"/>' +
       '<path d="M60 23 C66 30 68 42 66 54" fill="none"/><circle cx="47" cy="31" r="2.2" fill="STROKE" stroke="none"/>',
    q: '<path d="M20 92 Q20 84 28 82 H72 Q80 84 80 92 Z"/><path d="M30 82 Q32 76 38 74 H62 Q68 76 70 82 Z"/>' +
       '<path d="M39 74 Q43 58 41 47 H59 Q57 58 61 74 Z"/><ellipse cx="50" cy="47" rx="15" ry="4"/>' +
       '<path d="M36 45 L31 24 L42 34 L50 17 L58 34 L69 24 L64 45 Z"/>' +
       '<circle cx="31" cy="21" r="3.5"/><circle cx="50" cy="13.5" r="3.5"/><circle cx="69" cy="21" r="3.5"/>',
    k: '<path d="M20 92 Q20 84 28 82 H72 Q80 84 80 92 Z"/><path d="M30 82 Q32 76 38 74 H62 Q68 76 70 82 Z"/>' +
       '<path d="M39 74 Q43 58 41 47 H59 Q57 58 61 74 Z"/><ellipse cx="50" cy="47" rx="15" ry="4"/>' +
       '<path d="M37 44 Q34 29 50 27 Q66 29 63 44 Z"/><path d="M47 6 H53 V12 H59 V18 H53 V27 H47 V18 H41 V12 H47 Z"/>'
  };

  /* white: piece colour. flipped: true when the piece is drawn turned 180 degrees on the board. */
  function pieceSvg(t, white, flipped, size) {
    var fill = white ? "url(#marbleW)" : flipped ? "url(#marbleBR)" : "url(#marbleB)";
    var stroke = white ? "#8C8273" : "#050506";
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
      '<g fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.4" stroke-linejoin="round">' +
      PATHS[t].replace("STROKE", stroke) + "</g></svg>";
  }

  root.pieceSvg = pieceSvg;
})(this);
