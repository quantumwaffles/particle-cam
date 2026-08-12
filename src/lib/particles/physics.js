// Particle physics: brightness-driven density stippling.
//
// Each particle spaces itself from neighbors with a repulsion radius derived
// from local image brightness (bright = tight spacing = dense). On top of
// that, a coarse density-error relaxation compares actual particle density
// against the brightness-derived target density and pushes particles from
// over-full cells toward under-full ones, so flat regions fill evenly
// instead of leaving holes.
//
// The luminance field is prepared once per frame, already mirrored into
// canvas orientation, so gradients and forces share one coordinate space.

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const num = (v, d) => (typeof v === 'number' && !Number.isNaN(v) ? v : d);

// --- module-level buffers reused across frames (no per-frame allocation) ---
let fieldW = 0, fieldH = 0;
let lumField = null; // final blurred luminance, canvas orientation, 0..255
let lumTmp = null;
let gridStart = null; // Int32Array(nCells + 1): CSR-style cell offsets
let gridIdx = null;   // Int32Array(N): particle indices sorted by cell
let cellOf = null;    // Int32Array(N): cell index per particle
let gridCapacity = 0;
let gridCellCapacity = 0;
let errField = null;  // Float32Array(nCells): relative density error
let errTmp = null;

function buildLuminanceField(pix, pw, ph) {
  if (fieldW !== pw || fieldH !== ph) {
    fieldW = pw; fieldH = ph;
    lumField = new Float32Array(pw * ph);
    lumTmp = new Float32Array(pw * ph);
  }
  const raw = lumTmp;
  for (let y = 0; y < ph; y++) {
    const row = y * pw;
    for (let x = 0; x < pw; x++) {
      const s = (row + (pw - 1 - x)) * 4; // mirror X into canvas orientation
      raw[row + x] = pix[s] * 0.299 + pix[s + 1] * 0.587 + pix[s + 2] * 0.114;
    }
  }
  // separable [1 2 1]/4 blur to suppress sensor noise
  const hz = lumField;
  for (let y = 0; y < ph; y++) {
    const row = y * pw;
    hz[row] = (raw[row] * 3 + raw[row + 1]) * 0.25;
    for (let x = 1; x < pw - 1; x++) {
      hz[row + x] = (raw[row + x - 1] + 2 * raw[row + x] + raw[row + x + 1]) * 0.25;
    }
    hz[row + pw - 1] = (raw[row + pw - 2] + 3 * raw[row + pw - 1]) * 0.25;
  }
  const out = lumTmp;
  for (let x = 0; x < pw; x++) {
    out[x] = (hz[x] * 3 + hz[pw + x]) * 0.25;
    out[(ph - 1) * pw + x] = (hz[(ph - 2) * pw + x] + 3 * hz[(ph - 1) * pw + x]) * 0.25;
  }
  for (let y = 1; y < ph - 1; y++) {
    const row = y * pw;
    for (let x = 0; x < pw; x++) {
      out[row + x] = (hz[row - pw + x] + 2 * hz[row + x] + hz[row + pw + x]) * 0.25;
    }
  }
  // out (lumTmp) now holds the final field; swap so lumField is final
  const t = lumField; lumField = lumTmp; lumTmp = t;
}

// bilinear sample with edge clamp; x,y in field pixel coords
function sampleField(f, w, h, x, y) {
  if (x < 0) x = 0; else if (x > w - 1.001) x = w - 1.001;
  if (y < 0) y = 0; else if (y > h - 1.001) y = h - 1.001;
  const x0 = x | 0, y0 = y | 0;
  const fx = x - x0, fy = y - y0;
  const i = y0 * w + x0;
  const dx = x0 + 1 < w ? 1 : 0;
  const dy = y0 + 1 < h ? w : 0;
  return f[i] * (1 - fx) * (1 - fy) + f[i + dx] * fx * (1 - fy) +
         f[i + dy] * (1 - fx) * fy + f[i + dx + dy] * fx * fy;
}

// bilinear sample over the coarse cell grid (wrap- or clamp-aware)
function sampleCellField(f, cols, rows, x, y, wrap) {
  let x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  let x1 = x0 + 1, y1 = y0 + 1;
  if (wrap) {
    x0 = ((x0 % cols) + cols) % cols;
    x1 = ((x1 % cols) + cols) % cols;
    y0 = ((y0 % rows) + rows) % rows;
    y1 = ((y1 % rows) + rows) % rows;
  } else {
    x0 = x0 < 0 ? 0 : x0 >= cols ? cols - 1 : x0;
    x1 = x1 < 0 ? 0 : x1 >= cols ? cols - 1 : x1;
    y0 = y0 < 0 ? 0 : y0 >= rows ? rows - 1 : y0;
    y1 = y1 < 0 ? 0 : y1 >= rows ? rows - 1 : y1;
  }
  return f[y0 * cols + x0] * (1 - fx) * (1 - fy) + f[y0 * cols + x1] * fx * (1 - fy) +
         f[y1 * cols + x0] * (1 - fx) * fy + f[y1 * cols + x1] * fx * fy;
}

// Relative target density (0..1] for a normalized brightness value.
export function densityFromBrightness(b, config) {
  const floorD = Math.max(0.02, clamp01(num(config.shadowDensityFloor, 0.15)));
  const gamma = Math.max(0.05, num(config.shadowDensityGamma, 1.0));
  return floorD + (1 - floorD) * Math.pow(clamp01(b), gamma);
}

// Target nearest-neighbor spacing (px) given density and mean spacing.
export function spacingFromDensity(dnorm, sAvg, config) {
  const spacingScale = Math.max(0.2, num(config.spacingScale, 1.0));
  const sBright = Math.max(2, sAvg * spacingScale);
  return sBright / Math.sqrt(Math.max(0.02, dnorm));
}

export function stepParticles({ particles, width, height, config, pixels, sampleWidth, sampleHeight }) {
  const pw = sampleWidth | 0, ph = sampleHeight | 0;
  const N = particles.length;
  if (!pw || !ph || !pixels || !N) return;

  buildLuminanceField(pixels, pw, ph);
  const lum = lumField;

  const wrapEdges = config.wrapEdges !== false;
  const maxNeighbors = num(config.maxNeighbors, 64);
  const forceScale = num(config.forceScale, 1.0);
  const maxForce = num(config.maxForce, 2.5);
  const jitterAmp = num(config.jitterAmp, 0.008);
  const lightAttract = num(config.lightAttract, 0.25);
  const darkRepel = num(config.darkRepel, 0.3);
  const brightnessGamma = Math.max(0.05, num(config.brightnessGamma, 1.0));
  const detailBoost = clamp01(num(config.shadowDetailBoost, 0.5));
  const gradScale = Math.max(1, num(config.shadowDetailGradientScale, 100));
  const gradPower = Math.max(0.05, num(config.shadowDetailGradientPower, 0.7));
  const holeFill = num(config.holeFill, 0.6);
  const densityGamma = Math.max(0.05, num(config.shadowDensityGamma, 1.0));
  const floorD = Math.max(0.02, clamp01(num(config.shadowDensityFloor, 0.15)));
  const gradR = Math.max(1, num(config.gradientRadius, 2) | 0);

  // spacing derived from particle count so defaults hold at any density
  const sAvg = Math.sqrt((width * height) / N);
  const spacingScale = Math.max(0.2, num(config.spacingScale, 1.0));
  const sBright = Math.max(2, sAvg * spacingScale);
  const sMax = Math.min(sBright / Math.sqrt(floorD), sBright * 3, 96);

  // --- spatial grid (counting sort into typed arrays; zero allocation) ---
  const cellSize = sMax;
  const cols = Math.max(1, Math.ceil(width / cellSize));
  const rows = Math.max(1, Math.ceil(height / cellSize));
  const nCells = cols * rows;
  if (gridCapacity < N) {
    gridIdx = new Int32Array(N);
    cellOf = new Int32Array(N);
    gridCapacity = N;
  }
  if (gridCellCapacity < nCells + 1) {
    gridStart = new Int32Array(nCells + 1);
    errField = new Float32Array(nCells);
    errTmp = new Float32Array(nCells);
    gridCellCapacity = nCells + 1;
  }
  gridStart.fill(0, 0, nCells + 1);
  const invCell = 1 / cellSize;
  for (let i = 0; i < N; i++) {
    const a = particles[i];
    let cx = (a.pos.x * invCell) | 0;
    let cy = (a.pos.y * invCell) | 0;
    cx = cx < 0 ? 0 : cx >= cols ? cols - 1 : cx;
    cy = cy < 0 ? 0 : cy >= rows ? rows - 1 : cy;
    const c = cy * cols + cx;
    cellOf[i] = c;
    gridStart[c + 1]++;
  }
  for (let c = 0; c < nCells; c++) gridStart[c + 1] += gridStart[c];
  // gridStart[c] currently marks the write cursor for cell c after this loop
  for (let i = 0; i < N; i++) {
    const c = cellOf[i];
    gridIdx[gridStart[c]++] = i;
  }
  for (let c = nCells; c > 0; c--) gridStart[c] = gridStart[c - 1];
  gridStart[0] = 0;

  // --- coarse density error: actual particle count vs brightness target ---
  const fieldScaleX = pw / width;
  const fieldScaleY = ph / height;
  let targetSum = 0;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const bx = (cx + 0.5) * cellSize * fieldScaleX;
      const by = (cy + 0.5) * cellSize * fieldScaleY;
      const b = sampleField(lum, pw, ph, bx, by) / 255;
      const d = floorD + (1 - floorD) * Math.pow(b, densityGamma);
      errTmp[cy * cols + cx] = d;
      targetSum += d;
    }
  }
  const targetScale = targetSum > 0 ? N / targetSum : 0;
  const invAvgCount = nCells / N;
  for (let c = 0; c < nCells; c++) {
    const count = gridStart[c + 1] - gridStart[c];
    errField[c] = (count - errTmp[c] * targetScale) * invAvgCount;
  }
  // one 3x3 blur pass to smooth the error field
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      let sum = 0, wsum = 0;
      for (let oy = -1; oy <= 1; oy++) {
        let ny = cy + oy;
        if (wrapEdges) ny = (ny + rows) % rows; else { if (ny < 0 || ny >= rows) continue; }
        for (let ox = -1; ox <= 1; ox++) {
          let nx = cx + ox;
          if (wrapEdges) nx = (nx + cols) % cols; else { if (nx < 0 || nx >= cols) continue; }
          const w = (ox === 0 && oy === 0) ? 4 : (ox === 0 || oy === 0) ? 2 : 1;
          sum += errField[ny * cols + nx] * w;
          wsum += w;
        }
      }
      errTmp[cy * cols + cx] = sum / wsum;
    }
  }
  const err = errTmp;

  const halfW = width * 0.5, halfH = height * 0.5;

  for (let i = 0; i < N; i++) {
    const a = particles[i];
    const px = a.pos.x, py = a.pos.y;

    // brightness + gradient from the shared field (canvas orientation)
    const fx0 = px * fieldScaleX;
    const fy0 = py * fieldScaleY;
    const b = clamp01(sampleField(lum, pw, ph, fx0, fy0) / 255);
    const gx = sampleField(lum, pw, ph, fx0 + gradR, fy0) - sampleField(lum, pw, ph, fx0 - gradR, fy0);
    const gy = sampleField(lum, pw, ph, fx0, fy0 + gradR) - sampleField(lum, pw, ph, fx0, fy0 - gradR);
    const gLen = Math.sqrt(gx * gx + gy * gy);
    let dirx = 0, diry = 0, gnorm = 0;
    if (gLen > 1e-4) {
      dirx = gx / gLen; diry = gy / gLen;
      const gn = gLen / gradScale;
      gnorm = Math.pow(gn > 1 ? 1 : gn, gradPower);
    }

    let fx = 0, fy = 0;

    // 1) edge-following field force: toward light, out of shadows
    const fieldMag = gnorm * (lightAttract * Math.pow(b, brightnessGamma) + darkRepel * (1 - b));
    fx += dirx * fieldMag;
    fy += diry * fieldMag;

    // 2) hole-filling: descend the density-error gradient (surplus -> deficit)
    if (holeFill > 0) {
      const ex = px * invCell - 0.5;
      const ey = py * invCell - 0.5;
      const eR = sampleCellField(err, cols, rows, ex + 1, ey, wrapEdges);
      const eL = sampleCellField(err, cols, rows, ex - 1, ey, wrapEdges);
      const eD = sampleCellField(err, cols, rows, ex, ey + 1, wrapEdges);
      const eU = sampleCellField(err, cols, rows, ex, ey - 1, wrapEdges);
      fx -= holeFill * (eR - eL) * 0.5;
      fy -= holeFill * (eD - eU) * 0.5;
    }

    // 3) target spacing: denser where bright, extra density along strong edges
    const dEff = (floorD + (1 - floorD) * Math.pow(b, densityGamma)) * (1 + detailBoost * gnorm);
    let s = sBright / Math.sqrt(dEff);
    if (s > sMax) s = sMax;

    // 4) neighbor repulsion within the local spacing radius
    const ccx = cellOf[i] % cols;
    const ccy = (cellOf[i] / cols) | 0;
    let processed = 0;
    outer:
    for (let dy = -1; dy <= 1; dy++) {
      let ncy = ccy + dy;
      if (wrapEdges) ncy = (ncy + rows) % rows; else { if (ncy < 0 || ncy >= rows) continue; }
      for (let dx = -1; dx <= 1; dx++) {
        let ncx = ccx + dx;
        if (wrapEdges) ncx = (ncx + cols) % cols; else { if (ncx < 0 || ncx >= cols) continue; }
        const c = ncy * cols + ncx;
        const end = gridStart[c + 1];
        for (let k = gridStart[c]; k < end; k++) {
          const j = gridIdx[k];
          if (j === i) continue;
          const o = particles[j];
          let dxp = px - o.pos.x;
          let dyp = py - o.pos.y;
          if (wrapEdges) {
            if (dxp > halfW) dxp -= width; else if (dxp < -halfW) dxp += width;
            if (dyp > halfH) dyp -= height; else if (dyp < -halfH) dyp += height;
          }
          const d2 = dxp * dxp + dyp * dyp;
          if (d2 > 1e-9 && d2 < s * s) {
            const d = Math.sqrt(d2);
            const strength = 1 - d / s; // linear falloff: 1 at contact, 0 at spacing
            const inv = strength / d;
            fx += dxp * inv;
            fy += dyp * inv;
            if (++processed >= maxNeighbors) break outer;
          }
        }
      }
    }

    // jitter (dithers the lattice toward blue-noise), scale, clamp
    fx += (Math.random() * 2 - 1) * jitterAmp;
    fy += (Math.random() * 2 - 1) * jitterAmp;
    fx *= forceScale; fy *= forceScale;
    const len2 = fx * fx + fy * fy;
    if (len2 > maxForce * maxForce) {
      const sc = maxForce / Math.sqrt(len2);
      fx *= sc; fy *= sc;
    }

    a.applyForceXY(fx, fy);
  }
}

// Alternative update: particles move toward precomputed target positions (brightness-weighted distribution)
// Expects config.targetPositions (array of {x,y}) length == particles.length
export function stepParticlesToTargets({ particles, width, height, config }) {
  const targets = config.targetPositions;
  if (!targets || targets.length !== particles.length) return;
  const neighborRadius = config.neighborRadius || 30;
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

  const targetAttract = config.targetAttract ?? 0.15; // spring strength
  const jitterAmp = config.jitterAmp ?? 0.0005;
  const maxForce = config.maxForce ?? 3.0;
  const forceScale = config.forceScale ?? 1.0;
  const repelStrength = (config.targetRepel ?? 0.5); // mild neighbor spacing
  const maxNeighbors = config.maxNeighbors ?? 32;
  const wrapEdges = config.wrapEdges !== false;

  for (let i = 0; i < particles.length; i++) {
    const a = particles[i];
    const t = targets[i];
    if (!t) continue;
    let fx = 0, fy = 0;
    // spring attraction to target
    let dx = t.x - a.pos.x;
    let dy = t.y - a.pos.y;
    if (wrapEdges) {
      if (dx > width * 0.5) dx -= width; else if (dx < -width * 0.5) dx += width;
      if (dy > height * 0.5) dy -= height; else if (dy < -height * 0.5) dy += height;
    }
    fx += dx * targetAttract;
    fy += dy * targetAttract;

    // local neighbor repulsion to prevent collapse
    const ccx = Math.min(cols - 1, Math.max(0, (a.pos.x / cellSize) | 0));
    const ccy = Math.min(rows - 1, Math.max(0, (a.pos.y / cellSize) | 0));
    let processed = 0;
    for (let dyc = -1; dyc <= 1; dyc++) {
      for (let dxc = -1; dxc <= 1; dxc++) {
        let ncx = ccx + dxc;
        let ncy = ccy + dyc;
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
              const d = Math.sqrt(d2);
              const inv = 1 / d;
              const strength = 1 - (d / neighborRadius); // linear falloff
              const f = strength * repelStrength;
              fx += dxp * inv * f;
              fy += dyp * inv * f;
              processed++; if (processed >= maxNeighbors) break;
            }
        }
        if (processed >= maxNeighbors) break;
      }
      if (processed >= maxNeighbors) break;
    }

    // jitter & scale & clamp
    fx += (Math.random() * 2 - 1) * jitterAmp;
    fy += (Math.random() * 2 - 1) * jitterAmp;
    fx *= forceScale; fy *= forceScale;
    const len = Math.hypot(fx, fy);
    if (len > maxForce) { const s = maxForce / len; fx *= s; fy *= s; }
    a.applyForceXY(fx, fy);
  }
}
