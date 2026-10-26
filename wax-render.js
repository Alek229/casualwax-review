/* Renders a wax fabric into the pure-green (#00FF00) patch of a product model picture.
   Same engine as the internal studio (prototype/studio/studio.js): keep the two in step.
   Shopify: ship as a theme asset and load it with `defer` before main.js. */
window.WaxRender = (() => {
  const REF_W = 1000;  // a repeating tile's scale is expressed against a 1000px-wide model
  const SVG_RES = 4;   // SVG tiles are rasterised at 4x so they stay sharp when scaled

  function loadImage(src) {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    return img.decode().then(() => img);
  }

  // A seamless tile (SVG) repeats at a fixed size. A photo of cloth is mirrored 2x2 so its joins
  // line up, and first scaled to cover the whole patch.
  async function fabric(src, repeat) {
    const img = await loadImage(src);
    const isSvg = /\.svg($|\?)/i.test(src);
    const res = isSvg ? SVG_RES : 1;
    const w = Math.max(1, Math.round(img.naturalWidth * res));
    const h = Math.max(1, Math.round(img.naturalHeight * res));
    const mirror = (repeat || (isSvg ? 'straight' : 'mirror')) === 'mirror';
    const tile = document.createElement('canvas');
    tile.width = mirror ? w * 2 : w;
    tile.height = mirror ? h * 2 : h;
    const ctx = tile.getContext('2d');
    const flips = mirror ? [[1, 1], [-1, 1], [1, -1], [-1, -1]] : [[1, 1]];
    for (const [sx, sy] of flips) {
      ctx.setTransform(sx, 0, 0, sy, sx < 0 ? w * 2 : 0, sy < 0 ? h * 2 : 0);
      ctx.drawImage(img, 0, 0, w, h);
    }
    return { tile, res, cover: !isSvg, w, h };
  }

  // alpha: how much of each pixel is patch. shade: its brightness against the patch average,
  // so folds and stitches drawn in green carry over onto the fabric.
  function prepare(img, width) {
    const w = Math.round(Math.min(width, img.naturalWidth));
    const h = Math.round(img.naturalHeight * w / img.naturalWidth);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const base = ctx.getImageData(0, 0, w, h);
    const d = base.data, n = w * h;
    const alpha = new Float32Array(n), shade = new Float32Array(n);
    let sum = 0, count = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;

    for (let i = 0; i < n; i++) {
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      if (g < 24) continue;
      const a = Math.min(1, Math.max(0, ((g - Math.max(r, b)) / g - 0.25) / 0.5));
      if (!a) continue;
      alpha[i] = a;
      if (a === 1) { shade[i] = g; sum += g; count++; }
      const x = i % w, y = (i / w) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      d[i * 4 + 1] = Math.min(g, Math.max(r, b));  // no green fringe on the garment side
    }
    const ref = count ? sum / count : 1;
    for (let i = 0; i < n; i++) shade[i] = shade[i] ? shade[i] / ref : 1;
    despillRim(d, alpha, w, h, x0, y0, x1, y1);
    return { w, h, base, alpha, shade, found: count > 0, box: { x0, y0, x1, y1 } };
  }

  // Pixels just outside the key, too faintly green to count as patch, still read as a green rim
  // on light cotton. Within 2px of the patch, any green lean is removed.
  function despillRim(d, alpha, w, h, x0, y0, x1, y1) {
    if (x1 < 0) return;
    const R = 2;
    for (let y = Math.max(0, y0 - R); y <= Math.min(h - 1, y1 + R); y++) {
      for (let x = Math.max(0, x0 - R); x <= Math.min(w - 1, x1 + R); x++) {
        const i = y * w + x;
        if (alpha[i]) continue;
        const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
        if (g <= Math.max(r, b)) continue;
        let near = false;
        for (let dy = -R; dy <= R && !near; dy++) {
          for (let dx = -R; dx <= R; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < w && yy < h && alpha[yy * w + xx]) { near = true; break; }
          }
        }
        if (near) d[i * 4 + 1] = Math.max(r, b);
      }
    }
  }

  // settings: { scale (1 = default), rotate (deg), x, y (px on a 1000px model), shade (0..1.5) }
  function render(p, fab, settings = {}) {
    const s = { scale: 1, rotate: 0, x: 0, y: 0, shade: 1, ...settings };
    const out = document.createElement('canvas');
    out.width = p.w; out.height = p.h;
    const ctx = out.getContext('2d');
    if (!p.found) { ctx.putImageData(p.base, 0, 0); return out; }

    const { x0, y0, x1, y1 } = p.box;
    const unit = p.w / REF_W;
    const fit = fab.cover ? Math.max((x1 - x0 + 1) / fab.w, (y1 - y0 + 1) / fab.h) : unit / fab.res;
    const layer = document.createElement('canvas');
    layer.width = p.w; layer.height = p.h;
    const lctx = layer.getContext('2d', { willReadFrequently: true });
    const pattern = lctx.createPattern(fab.tile, 'repeat');
    const m = new DOMMatrix()
      .translate((x0 + x1) / 2 + s.x * unit, (y0 + y1) / 2 + s.y * unit)
      .rotate(s.rotate)
      .scale(s.scale * fit);
    pattern.setTransform(fab.cover ? m.translate(-fab.w / 2, -fab.h / 2) : m);
    lctx.fillStyle = pattern;
    lctx.fillRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    const f = lctx.getImageData(0, 0, p.w, p.h).data;

    const img = new ImageData(new Uint8ClampedArray(p.base.data), p.w, p.h);
    const o = img.data;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * p.w + x, a = p.alpha[i];
        if (!a) continue;
        const sh = 1 + (p.shade[i] - 1) * s.shade, j = i * 4;
        for (let c = 0; c < 3; c++) {
          const v = f[j + c];
          o[j + c] = o[j + c] * (1 - a) + (sh <= 1 ? v * sh : v + (255 - v) * (sh - 1)) * a;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return out;
  }

  return { loadImage, fabric, prepare, render };
})();
