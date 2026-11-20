// Regenerates the marble vein textures (img/veins-*.webp) and app icons (icons/*.png).
// Needs Playwright with Chromium:  node tools/make-assets.js
// The output is committed, so this only needs to run again if you want different veins or icons.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");

// Runs inside the browser page. Draws transparent vein layers on a canvas.
function veins(opts) {
  const { size, seed, color, alpha, mottle, angle, freq, turb } = opts;
  let s = seed >>> 0;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const G = 256, grid = new Float32Array(G * G);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();
  const fade = (t) => t * t * (3 - 2 * t);
  const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = fade(x - xi), yf = fade(y - yi);
    const at = (a, b) => grid[((b & (G - 1)) * G) + (a & (G - 1))];
    const top = at(xi, yi) * (1 - xf) + at(xi + 1, yi) * xf;
    const bot = at(xi, yi + 1) * (1 - xf) + at(xi + 1, yi + 1) * xf;
    return top * (1 - yf) + bot * yf;
  };
  const fbm = (x, y, oct) => { let v = 0, a = 0.5, f = 1; for (let o = 0; o < oct; o++) { v += a * noise(x * f, y * f); a *= 0.5; f *= 2.03; } return v; };

  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  const ca = Math.cos(angle), sa = Math.sin(angle);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size * 6, v = y / size * 6;
      const n = fbm(u, v, 6);
      // Main veins: sharp ridges where a warped sine crosses zero.
      const w1 = Math.sin((u * ca + v * sa) * freq + n * turb);
      const main = Math.pow(1 - Math.abs(w1), 18);
      // Fine secondary veins at another angle.
      const n2 = fbm(u * 1.7 + 40, v * 1.7 + 40, 5);
      const w2 = Math.sin((u * -sa + v * ca) * freq * 1.9 + n2 * turb * 1.4);
      const fine = Math.pow(1 - Math.abs(w2), 40) * 0.55;
      // Soft cloudy mottling.
      const cloud = Math.max(0, fbm(u * 0.8 + 90, v * 0.8 + 90, 4) - 0.45) * mottle;
      const a = Math.min(1, main * alpha + fine * alpha + cloud);
      const k = (y * size + x) * 4;
      img.data[k] = color[0]; img.data[k + 1] = color[1]; img.data[k + 2] = color[2];
      img.data[k + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/webp", 0.82);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent("<!doctype html><body></body>");

  const textures = {
    "veins-light.webp": { size: 768, seed: 7, color: [126, 118, 108], alpha: 0.42, mottle: 0.22, angle: 0.6, freq: 1.3, turb: 7 },
    "veins-dark.webp": { size: 768, seed: 31, color: [236, 238, 240], alpha: 0.34, mottle: 0.16, angle: -0.5, freq: 1.2, turb: 8 }
  };
  fs.mkdirSync(path.join(root, "img"), { recursive: true });
  for (const [file, opts] of Object.entries(textures)) {
    const url = await page.evaluate(veins, opts);
    fs.writeFileSync(path.join(root, "img", file), Buffer.from(url.split(",")[1], "base64"));
    console.log("wrote img/" + file);
  }

  // Icons: a white marble knight on a grey marble tile.
  const knight = fs.readFileSync(path.join(root, "tools", "icon.svg"), "utf8");
  fs.mkdirSync(path.join(root, "icons"), { recursive: true });
  for (const [file, px] of [["icon-180.png", 180], ["icon-192.png", 192], ["icon-512.png", 512], ["icon-maskable-512.png", 512]]) {
    const pad = file.includes("maskable") ? 0.62 : 0.78;
    await page.setViewportSize({ width: px, height: px });
    await page.setContent(`<!doctype html><html><body style="margin:0">
      <div style="width:${px}px;height:${px}px;position:relative;overflow:hidden;
        background: url(data:image/webp;base64,${fs.readFileSync(path.join(root, "img", "veins-dark.webp")).toString("base64")}) 0 0/${px * 1.6}px,
                    linear-gradient(135deg, #9BA0A6 0%, #7E848B 45%, #959AA0 60%, #6E747B 100%);">
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
          <div style="width:${px * pad}px;height:${px * pad}px;filter:drop-shadow(0 ${px * 0.03}px ${px * 0.025}px rgba(40,30,20,0.45))">${knight}</div>
        </div>
      </div></body></html>`);
    await page.screenshot({ path: path.join(root, "icons", file) });
    console.log("wrote icons/" + file);
  }
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
