// Genera los iconos PNG (sin dependencias): carbón #0e0b0f con esfera lavanda. `node scripts/make-icons.mjs`
import zlib from 'node:zlib'; import fs from 'node:fs';
const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = ~0; for (const x of b) r = t[(r ^ x) & 255] ^ (r >>> 8); return ~r >>> 0; };
const chunk = (t, d) => { const b = Buffer.concat([Buffer.from(t), d]), o = Buffer.alloc(4); o.writeUInt32BE(d.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(b)); return Buffer.concat([o, b, c]); };
function png(size, k) { // esfera lavanda (la misma de la marca dentro de la app) sobre carbón #0e0b0f, con un halo suave; k = escala (el maskable usa menos)
  const raw = Buffer.alloc(size * (size * 3 + 1)), BG = [0x0e, 0x0b, 0x0f], hi = [0xf6, 0xd1, 0xef], lo = [0xb9, 0x77, 0xb3], c0 = size / 2, R = .3 * size * k / 1.25, cl = (x) => Math.min(1, Math.max(0, x));
  for (let y = 0; y < size; y++) { raw[y * (size * 3 + 1)] = 0; for (let x = 0; x < size; x++) {
    const d = Math.hypot(x + .5 - c0, y + .5 - c0), a = cl(.5 + (R - d)), glow = .22 * Math.exp(-Math.pow(Math.max(0, d - R) / (R * .55), 2)) * (1 - a);
    const t = cl(Math.hypot(x + .5 - (c0 - R * .3), y + .5 - (c0 - R * .4)) / (R * 1.45));
    for (let c = 0; c < 3; c++) { const sph = hi[c] * (1 - t) + lo[c] * t; raw[y * (size * 3 + 1) + 1 + x * 3 + c] = Math.round(BG[c] * (1 - a - glow) + sph * a + lo[c] * glow); } } }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(size, 0); ih.writeUInt32BE(size, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
for (const [n, s, k] of [['icon-180', 180, 1.25], ['icon-192', 192, 1.25], ['icon-512', 512, 1.25], ['icon-maskable-512', 512, .95]]) fs.writeFileSync(`public/${n}.png`, png(s, k));
console.log('iconos generados');
