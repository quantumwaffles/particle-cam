// Step particles by applying forces based on local brightness and neighbor repulsion.
// Particles are objects with { pos:{x,y}, applyForceXY(fx,fy) } provided by the sketch.
export function stepParticles({ p, particles, pg, width, height, config, pixels, sampleWidth, sampleHeight }) {
  const pw = typeof sampleWidth === 'number' ? sampleWidth : (pg ? pg.width : 0);
  const ph = typeof sampleHeight === 'number' ? sampleHeight : (pg ? pg.height : 0);
  if (!pw || !ph) return;
  const pix = pixels || (pg ? pg.pixels : null);
  if (!pix) return;
  const flipSamplingX = true; // mirror to match displayed webcam

  const baseRepel = config.baseRepel;
  const baseRepelMin = config.baseRepelMin;
  const neighborRadius = config.neighborRadius;
  const radius2 = neighborRadius * neighborRadius;
  const cellSize = neighborRadius;
  const cols = Math.max(1, Math.ceil(width / cellSize));
  const rows = Math.max(1, Math.ceil(height / cellSize));
  const grid = new Array(cols * rows);
  for (let i = 0; i < grid.length; i++) grid[i] = [];
  for (let i = 0; i < particles.length; i++) {
    const a = particles[i];
    const cx = Math.min(cols - 1, Math.max(0, (a.pos.x / cellSize) | 0));
    const cy = Math.min(rows - 1, Math.max(0, (a.pos.y / cellSize) | 0));
    grid[cy * cols + cx].push(i);
  }

  const maxNeighbors = config.maxNeighbors;
  const maxForce = config.maxForce;
  const lightAttract = config.lightAttract;
  const brightnessGamma = config.brightnessGamma;
  const jitterAmp = config.jitterAmp;
  const forceScale = config.forceScale;
  const wrapEdges = config.wrapEdges !== false; // default true

  const lum = (ix) => (pix[ix] * 0.299 + pix[ix + 1] * 0.587 + pix[ix + 2] * 0.114);

  for (let i = 0; i < particles.length; i++) {
    const a = particles[i];
    // brightness sample (map to pg coords; mirror X to match displayed image)
    let bx = ((a.pos.x / width) * pw) | 0;
    let by = ((a.pos.y / height) * ph) | 0;
    bx = bx < 0 ? 0 : bx >= pw ? pw - 1 : bx;
    by = by < 0 ? 0 : by >= ph ? ph - 1 : by;
    if (flipSamplingX) bx = pw - 1 - bx;

    // 2x2 box filter for smoother brightness
    const bx1 = bx < pw - 1 ? bx + 1 : bx;
    const by1 = by < ph - 1 ? by + 1 : by;
    let idx00 = (by * pw + bx) * 4;
    let idx10 = (by * pw + bx1) * 4;
    let idx01 = (by1 * pw + bx) * 4;
    let idx11 = (by1 * pw + bx1) * 4;
    let br = 0.25 * (lum(idx00) + lum(idx10) + lum(idx01) + lum(idx11));
    let b = br * (1 / 255);
    const localRepelStrength = baseRepelMin + baseRepel * (1.0 - b);

    // accumulate forces
    let fx = 0.0, fy = 0.0;

    // brightness gradient attraction (toward brighter regions)
    const bxL = bx > 0 ? bx - 1 : bx;
    const bxR = bx < pw - 1 ? bx + 1 : bx;
    const byU = by > 0 ? by - 1 : by;
    const byD = by < ph - 1 ? by + 1 : by;
    const idxL = (by * pw + bxL) * 4;
    const idxR = (by * pw + bxR) * 4;
    const idxU = (byU * pw + bx) * 4;
    const idxD = (byD * pw + bx) * 4;
    let gx = lum(idxR) - lum(idxL);
    let gy = lum(idxD) - lum(idxU);
    let gln = Math.hypot(gx, gy);
    if (gln > 0.0001) { gx /= gln; gy /= gln; }
    const bGamma = Math.pow(b, brightnessGamma);
    fx += gx * lightAttract * bGamma;
    fy += gy * lightAttract * bGamma;

    // neighbor repulsion via grid (3x3 cells; wrap or clamp based on setting)
    let ccx = Math.min(cols - 1, Math.max(0, (a.pos.x / cellSize) | 0));
    let ccy = Math.min(rows - 1, Math.max(0, (a.pos.y / cellSize) | 0));
    let processed = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        let ncx = ccx + dx;
        let ncy = ccy + dy;
        if (wrapEdges) {
          ncx = (ncx + cols) % cols;
          ncy = (ncy + rows) % rows;
        } else {
          if (ncx < 0 || ncx >= cols || ncy < 0 || ncy >= rows) continue;
        }
        const cell = grid[ncy * cols + ncx];
        for (let k = 0; k < cell.length; k++) {
          const j = cell[k]; if (j === i) continue;
          const o = particles[j];
          let dxp = a.pos.x - o.pos.x;
          let dyp = a.pos.y - o.pos.y;
          if (wrapEdges) {
            if (dxp > width * 0.5) dxp -= width; else if (dxp < -width * 0.5) dxp += width;
            if (dyp > height * 0.5) dyp -= height; else if (dyp < -height * 0.5) dyp += height;
          }
          const d2 = dxp * dxp + dyp * dyp;
          if (d2 > 0 && d2 < radius2) {
            const invLen = 1.0 / Math.sqrt(d2);
            const fmag = (localRepelStrength / (d2 + 10.0)) * 0.08;
            fx += (dxp * invLen) * fmag;
            fy += (dyp * invLen) * fmag;
            processed++; if (processed >= maxNeighbors) break;
          }
        }
        if (processed >= maxNeighbors) break;
      }
      if (processed >= maxNeighbors) break;
    }

    // jitter and clamp
    fx += (Math.random() * 2 - 1) * jitterAmp;
    fy += (Math.random() * 2 - 1) * jitterAmp;
    fx *= forceScale; fy *= forceScale;
    const len = Math.hypot(fx, fy);
    if (len > maxForce) { const s = maxForce / len; fx *= s; fy *= s; }

    a.applyForceXY(fx, fy);
  }
}
