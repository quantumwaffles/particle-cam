// Simplified particle physics: Only repulsive forces that vary based on image brightness.
// Particles repel each other more strongly in dark regions, less strongly in bright regions.
export function stepParticles({ p, particles, pg, width, height, config, pixels, sampleWidth, sampleHeight }) {
  const pw = typeof sampleWidth === 'number' ? sampleWidth : (pg ? pg.width : 0);
  const ph = typeof sampleHeight === 'number' ? sampleHeight : (pg ? pg.height : 0);
  if (!pw || !ph) return;
  const pix = pixels || (pg ? pg.pixels : null);
  if (!pix) return;
  const flipSamplingX = true; // mirror to match displayed webcam

  // Repulsion will be distance-limited with a brightness-dependent target spacing
  const baseRepel = config.baseRepel; // kept for backward compatibility (scales force via forceScale)
  const minRepel = config.minRepel; // kept for backward compatibility
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
  const jitterAmp = config.jitterAmp;
  const forceScale = config.forceScale;
  const wrapEdges = config.wrapEdges !== false; // default true

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lum = (ix) => (pix[ix] * 0.299 + pix[ix + 1] * 0.587 + pix[ix + 2] * 0.114);
  const lightAttract = typeof config.lightAttract === 'number' ? config.lightAttract : 0.08;
  const brightnessGamma = typeof config.brightnessGamma === 'number' ? config.brightnessGamma : 0.85;
  const shadowDensityFloor = clamp01(typeof config.shadowDensityFloor === 'number' ? config.shadowDensityFloor : 0.45);
  const shadowDensityGamma = typeof config.shadowDensityGamma === 'number' ? Math.max(0.01, config.shadowDensityGamma) : 0.85;
  const shadowDetailBoost = clamp01(typeof config.shadowDetailBoost === 'number' ? config.shadowDetailBoost : 0.55);
  const shadowDetailGradientScale = Math.max(1, typeof config.shadowDetailGradientScale === 'number' ? config.shadowDetailGradientScale : 190);
  const shadowDetailGradientPower = typeof config.shadowDetailGradientPower === 'number' ? Math.max(0.01, config.shadowDetailGradientPower) : 0.8;
  const shadowAttract = typeof config.shadowAttract === 'number' ? config.shadowAttract : 0.25;
  const minSpacing = typeof config.minSpacing === 'number' ? Math.max(0.1, config.minSpacing) : undefined;

  // Debug: track brightness values
  let brightnessValues = [];
  let forceValues = [];

  for (let i = 0; i < particles.length; i++) {
    const a = particles[i];
    // brightness sample (map to pg coords; mirror X to match displayed image)
    let bx = ((a.pos.x / width) * pw) | 0;
    let by = ((a.pos.y / height) * ph) | 0;
    bx = bx < 0 ? 0 : bx >= pw ? pw - 1 : bx;
    by = by < 0 ? 0 : by >= ph ? ph - 1 : by;
    if (flipSamplingX) bx = pw - 1 - bx;

    // 4x4 box filter for smoother brightness (clamped at edges)
    let brSum = 0;
    let brCount = 0;
    for (let oy = 0; oy < 4; oy++) {
      let sy = by + oy; if (sy >= ph) sy = ph - 1;
      for (let ox = 0; ox < 4; ox++) {
        let sx = bx + ox; if (sx >= pw) sx = pw - 1;
        const sIdx = (sy * pw + sx) * 4;
        brSum += lum(sIdx);
        brCount++;
      }
    }
    let br = brSum / brCount; // average luminance
    let brightness = br * (1 / 255); // 0 = dark, 1 = bright
    brightness = clamp01(brightness);

    // Brightness-dependent desired spacing (radius within which repulsion acts)
    // Smaller radius in bright areas (denser), larger in dark areas (sparser, but we apply a floor and gradient boost for detail)
    const spacingBright = (typeof config.spacingBright === 'number')
      ? config.spacingBright
      : Math.max(2, neighborRadius * 0.3);
    const spacingDark = (typeof config.spacingDark === 'number')
      ? config.spacingDark
      : Math.max(spacingBright + 1, neighborRadius * 0.9);

    const darkness = Math.pow(1.0 - brightness, shadowDensityGamma);
    const darknessMix = shadowDensityFloor + (1.0 - shadowDensityFloor) * darkness;

    // Local gradient magnitude (computed below) modulates spacing to keep edge detail in shadows.
    // We'll compute the gradient first, then adjust the radius before applying neighbor forces.

  // accumulate forces (only repulsion now)
    let fx = 0.0, fy = 0.0;

  // Brightness gradient using a configurable pixel radius
  const gradR = Math.max(1, Math.floor(typeof config.gradientRadius === 'number' ? config.gradientRadius : 1));
  const bxL = bx - gradR >= 0 ? bx - gradR : 0;
  const bxR = bx + gradR <= pw - 1 ? bx + gradR : pw - 1;
  const byU = by - gradR >= 0 ? by - gradR : 0;
  const byD = by + gradR <= ph - 1 ? by + gradR : ph - 1;
  const idxL = (by * pw + bxL) * 4;
  const idxR = (by * pw + bxR) * 4;
  const idxU = (byU * pw + bx) * 4;
  const idxD = (byD * pw + bx) * 4;
  let gx = lum(idxR) - lum(idxL);
  let gy = lum(idxD) - lum(idxU);
  let gLen = Math.hypot(gx, gy);
  if (gLen > 1e-5) { gx /= gLen; gy /= gLen; }

  const gradNormRaw = gLen / shadowDetailGradientScale;
  const gradNorm = Math.pow(gradNormRaw > 1 ? 1 : gradNormRaw < 0 ? 0 : gradNormRaw, shadowDetailGradientPower);

  let localRadius = spacingBright + (spacingDark - spacingBright) * darknessMix;
  localRadius -= (spacingDark - spacingBright) * shadowDetailBoost * gradNorm;
  localRadius = Math.max(spacingBright, localRadius);
  if (minSpacing !== undefined) localRadius = Math.max(minSpacing, localRadius);
  if (localRadius > neighborRadius) localRadius = neighborRadius;

  // Gain based on brightness using baseRepel/minRepel semantics, modulated by darkness mix for shadow detail
  const gainBright = clamp01(baseRepel > 1e-3 ? (minRepel / baseRepel) : 0.0);
  const localGain = gainBright + (1.0 - gainBright) * darknessMix;

  // 1) Attraction toward brighter regions (restored)
  // Weight with gamma so mid-tones can be emphasized/de-emphasized
  const bGamma = Math.pow(brightness, Math.max(0.01, brightnessGamma));
  fx += gx * lightAttract * bGamma;
  fy += gy * lightAttract * bGamma;

  // 2) Optional extra push away from darker regions
  const darkRepel = (typeof config.darkRepel === 'number') ? config.darkRepel : 0.6;
  const darkWeight = (1.0 - brightness);
  fx += gx * darkRepel * darkWeight;
  fy += gy * darkRepel * darkWeight;

  if (shadowAttract !== 0) {
    fx -= gx * shadowAttract * darkWeight;
    fy -= gy * shadowAttract * darkWeight;
  }

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
            const d = Math.sqrt(d2);
            if (d < localRadius) {
              const invLen = 1.0 / d;
              // Linear falloff: 1 at contact, 0 at localRadius
              const strength = 1.0 - (d / localRadius);
              const fmag = strength * localGain; // scaled later by forceScale/maxForce
              fx += (dxp * invLen) * fmag;
              fy += (dyp * invLen) * fmag;
            }
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

  // (Optional) Debug logging removed for performance; enable if needed.
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
