/**
 * Génère les icônes PWA CNL Admin (192×192 et 512×512)
 * Fond rouge #C0392B, lettres "CNL" en blanc, police bitmap intégrée.
 * Aucune dépendance externe — Node.js pur (zlib).
 */

const fs   = require("fs");
const path = require("path");
const zlib = require("zlib");

// ── Couleurs ──────────────────────────────────────────────────────────────
const BG  = [0xC0, 0x39, 0x2B]; // #C0392B rouge CNL
const FG  = [0xFF, 0xFF, 0xFF]; // blanc

// ── Glyphes bitmap 5×7 pour C, N, L (pixel = 1 → FG) ─────────────────────
const GLYPHS = {
  C: [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ],
  N: [
    [1,0,0,0,1],
    [1,1,0,0,1],
    [1,0,1,0,1],
    [1,0,0,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
  ],
  L: [
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,1,1,1,1],
  ],
};

function renderIcon(size) {
  const scale    = Math.floor(size / 14);   // chaque pixel bitmap → scale px
  const glyphW   = 5 * scale;
  const glyphH   = 7 * scale;
  const gap      = Math.max(2, Math.floor(size / 40));  // espacement entre lettres
  const totalW   = 3 * glyphW + 2 * gap;
  const startX   = Math.floor((size - totalW) / 2);
  const startY   = Math.floor((size - glyphH) / 2);

  // ── Buffer RGBA (4 canaux) ───────────────────────────────────────────────
  const pixels = Buffer.alloc(size * size * 4);

  // Fond rouge
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4]     = BG[0];
    pixels[i * 4 + 1] = BG[1];
    pixels[i * 4 + 2] = BG[2];
    pixels[i * 4 + 3] = 0xFF;
  }

  // Dessiner chaque lettre
  ["C", "N", "L"].forEach((ch, idx) => {
    const ox = startX + idx * (glyphW + gap);
    GLYPHS[ch].forEach((row, gy) => {
      row.forEach((bit, gx) => {
        if (!bit) return;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = ox + gx * scale + dx;
            const py = startY + gy * scale + dy;
            if (px < size && py < size) {
              const off = (py * size + px) * 4;
              pixels[off]     = FG[0];
              pixels[off + 1] = FG[1];
              pixels[off + 2] = FG[2];
              pixels[off + 3] = 0xFF;
            }
          }
        }
      });
    });
  });

  return pixelsToPNG(pixels, size);
}

// ── Encodeur PNG minimal (RGBA, filtre None, zlib deflate) ────────────────

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const b of buf) {
    crc ^= b;
    for (let k = 0; k < 8; k++) {
      crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf  = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf  = Buffer.alloc(4);
  const crcData = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function pixelsToPNG(rgba, size) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8]  = 8;   // bit depth
  ihdr[9]  = 2;   // color type: RGB (on va ignorer l'alpha pour simplifier)
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Scanlines RGB avec filtre 0
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0; // filtre None
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      const dst = y * (1 + size * 3) + 1 + x * 3;
      raw[dst]     = rgba[src];
      raw[dst + 1] = rgba[src + 1];
      raw[dst + 2] = rgba[src + 2];
    }
  }

  const idat = zlib.deflateSync(raw, { level: 6 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Main ──────────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, "../frontend/public/icons");
fs.mkdirSync(outDir, { recursive: true });

[192, 512].forEach((size) => {
  const buf  = renderIcon(size);
  const dest = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(dest, buf);
  console.log(`✓ ${dest} (${buf.length} bytes)`);
});
