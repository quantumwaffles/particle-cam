<script>
	// run only on the client — shaders and webcam are browser-only
	export const ssr = false;
	import { onMount } from 'svelte';
	import p5 from 'p5';
	import { createPointsRenderer } from '$lib/gpu/pointsRenderer.js';
	import ControlsPanel from '$lib/ui/ControlsPanel.svelte';
	import { stepParticles } from '$lib/particles/physics.js';
	import { Particle } from '$lib/particles/Particle.js';
	import { camVert, camFrag } from '$lib/shaders/camShader.js';

	let sketchContainer;
	let p5Instance;

	// state managed in the panel
	let particleCount = 400;
	let uiShowGhost = true;
	let uiGhostOpacity = 0.35;
	let uiSizeScale = 1.0;
	let uiOpacity = 1.0;
	let uiContrast = 1.0;
	let uiContrastEnabled = true;
	let uiShowFPS = true;
	let uiParticleColor = "#ffffff";
	let uiBackgroundColor = "#000000";
	let uiShowBrightnessDebug = false;
	let currentFPS = 0;
	let config = {
		neighborRadius: 40,
		maxNeighbors: 40,
		forceScale: 2.5,
		baseRepel: 500.0,
		minRepel: 5.0,
		spacingBright: 8, // desired nearest-neighbor spacing in bright areas
		spacingDark: 28,  // desired spacing in dark areas
		darkRepel: 0.6,
		lightAttract: 0.08,
		brightnessGamma: 0.85,
		gradientRadius: 2, // pixels: distance for gradient sampling (controls smoothing)
		// target distribution (importance sampling) settings
		useTargets: false,
		targetAttract: 0.15,
		targetRepel: 0.5,
		targetResampleInterval: 20, // frames between resampling targets
		targetSampleStride: 2, // pixel stride when building weight map
		targetGamma: 1.0, // gamma applied to brightness when weighting
		jitterAmp: 0.0001,
		maxForce: 3.0,
		damping: 0.85,
		maxSpeed: 5.0,
		wrapEdges: true
	};

	// Helper function to convert hex color to RGB values (0-1)
	function hexToRgb(hex) {
		const r = parseInt(hex.slice(1, 3), 16) / 255;
		const g = parseInt(hex.slice(3, 5), 16) / 255;
		const b = parseInt(hex.slice(5, 7), 16) / 255;
		return { r, g, b };
	}

	function handlePanelChange(e) {
		({ particleCount, ghostEnabled: uiShowGhost, ghostOpacity: uiGhostOpacity, pointSizeScale: uiSizeScale, pointsOpacity: uiOpacity, contrast: uiContrast, contrastEnabled: uiContrastEnabled, showFPS: uiShowFPS, particleColor: uiParticleColor, backgroundColor: uiBackgroundColor, showBrightnessDebug: uiShowBrightnessDebug, config } = e.detail);
		if (p5Instance && p5Instance.setParticleCount) p5Instance.setParticleCount(+particleCount);
	}

	onMount(() => {
		p5Instance = new p5((p) => {
			let video;
			let rbCanvas; // offscreen 2D canvas for brightness sampling
			let rbCtx;
			let dbgGfx; // p5.Graphics used to display grayscale brightness
			let dbgImageData = null; // cached ImageData buffer for grayscale
			let tooltipGfx = null; // small 2D overlay for tooltip text
			const sampleScale = 1.0; // full-res sampling for crisper brightness data

			// GPU point rendering state
			let gl;
			let points; // points renderer instance
			let camShader; // camera shader for ghost image
			let positions = new Float32Array(0);
			let sizes = new Float32Array(0);
			// pixel readback cache to reduce getImageData warnings
			let cachedPixels = null;
			let lastReadbackFrame = -9999;
			// target distribution state
			let targetFrameCounter = 0;
			let targetPositions = null; // Float32Array length = particleCount*2
			function buildTargetsFromBrightness(pixels, w, h) {
				if (!pixels) return;
				const stride = Math.max(1, config.targetSampleStride || 1);
				const gamma = Math.max(0.01, config.targetGamma || 1.0);
				// accumulate weights
				const samples = [];
				let total = 0;
				for (let y = 0; y < h; y += stride) {
					for (let x = 0; x < w; x += stride) {
						const idx = (y * w + x) * 4;
						const lum = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
						let b = lum / 255;
						b = Math.pow(b, gamma);
						// small epsilon to keep dark regions possible
						const wgt = b + 1e-6;
						total += wgt;
						samples.push({ x, y, w: wgt });
					}
				}
				if (!samples.length || total <= 0) return;
				// prefix sums
				let csum = 0;
				for (const s of samples) { csum += s.w; s.c = csum; }
				const scale = 1 / csum;
				// ensure targetPositions sized
				if (!targetPositions || targetPositions.length !== particles.length * 2) {
					targetPositions = new Float32Array(particles.length * 2);
					config.targetPositions = [];
				}
				// stratified sampling across cumulative distribution
				for (let i = 0; i < particles.length; i++) {
					const u = (i + Math.random()) / particles.length; // jittered stratification
					const targetC = u * csum;
					// binary search (linear fallback for simplicity due to moderate sample count)
					let lo = 0, hi = samples.length - 1, mid;
					while (lo < hi) {
						mid = (lo + hi) >> 1;
						if (samples[mid].c < targetC) lo = mid + 1; else hi = mid;
					}
					const pick = samples[lo];
					// map sample coords back to canvas space (mirror X like physics expects display)
					const px = (w - 1 - pick.x) / w * p.width; // mirror
					const py = pick.y / h * p.height;
					targetPositions[i * 2] = px;
					targetPositions[i * 2 + 1] = py;
				}
				// build object array for physics helper
				config.targetPositions = [];
				for (let i = 0; i < particles.length; i++) {
					config.targetPositions.push({ x: targetPositions[i * 2], y: targetPositions[i * 2 + 1] });
				}
			}
			const readbackInterval = 1; // read every frame for responsiveness

			// no inline GL shader here; we use createPointsRenderer when GL is ready
 
			// particle system

			let particles = [];
			function ensureArrays(n) {
				if (positions.length !== n * 2) positions = new Float32Array(n * 2);
				if (sizes.length !== n) sizes = new Float32Array(n);
			}
			function initParticles(n) {
				particles = [];
				for (let i = 0; i < n; i++) {
					particles.push(new Particle(Math.random() * p.width, Math.random() * p.height));
				}
				ensureArrays(n);
			}

			// init GPU points renderer later in setup when GL exists
 
			p.setup = () => {
				p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
				p.noStroke();

				// request webcam and hide DOM video; we'll use it as a texture
				video = p.createCapture(p.VIDEO);
				video.size(p.width, p.height);
				video.hide();

				// offscreen 2D canvas for sampling with willReadFrequently
				rbCanvas = document.createElement('canvas');
				rbCanvas.width = Math.max(1, Math.floor(p.width * sampleScale));
				rbCanvas.height = Math.max(1, Math.floor(p.height * sampleScale));
				rbCtx = rbCanvas.getContext('2d', { willReadFrequently: true });

				// graphics buffer for grayscale debug view
				dbgGfx = p.createGraphics(rbCanvas.width, rbCanvas.height);
				if (dbgGfx.pixelDensity) dbgGfx.pixelDensity(1);

				// init GPU points renderer now that GL exists
				gl = p._renderer.GL;
				points = createPointsRenderer(gl);
				
				// create camera shader for ghost image
				camShader = p.createShader(camVert, camFrag);

				// init particles
				initParticles(particleCount);
			};

			p.draw = () => {
				// Apply background color
				const bgColor = hexToRgb(uiBackgroundColor);
				p.background(bgColor.r * 255, bgColor.g * 255, bgColor.b * 255);
				
				if (video && video.elt && (video.elt.readyState === 4 || video.elt.readyState === 3)) {
					if (uiShowGhost && camShader) {
						p.push();
						p.shader(camShader);
						camShader.setUniform('tex0', video);
						camShader.setUniform('u_flip', 1.0); // flip horizontally to match mirror
						camShader.setUniform('u_opacityGhost', uiGhostOpacity);
						camShader.setUniform('u_contrast', uiContrastEnabled ? uiContrast : 1.0);
						p.rect(-p.width / 2, -p.height / 2, p.width, p.height);
						p.resetShader();
						p.pop();
					}

					// debug brightness visualization as a full-resolution grayscale image
					if (uiShowBrightnessDebug && dbgGfx) {
						p.push();
						p.noStroke();
						// mirror horizontally to match the displayed webcam
						p.scale(-1, 1);
						p.image(dbgGfx, -p.width / 2, -p.height / 2, p.width, p.height);
						p.pop();
					}

					// update sampling buffer at lower resolution (guard readiness)
					if (rbCtx && video.width && video.height) {
						rbCtx.drawImage(video.elt, 0, 0, rbCanvas.width, rbCanvas.height);
						if (p.frameCount - lastReadbackFrame >= readbackInterval) {
							const imgData = rbCtx.getImageData(0, 0, rbCanvas.width, rbCanvas.height);
							
							// Apply contrast adjustment to the pixel data used by particles
							if (uiContrastEnabled && uiContrast !== 1.0) {
								const pixels = imgData.data;
								for (let i = 0; i < pixels.length; i += 4) {
									// Apply contrast to RGB channels (skip alpha)
									pixels[i] = Math.min(255, Math.max(0, ((pixels[i] - 128) * uiContrast + 128)));     // R
									pixels[i + 1] = Math.min(255, Math.max(0, ((pixels[i + 1] - 128) * uiContrast + 128))); // G
									pixels[i + 2] = Math.min(255, Math.max(0, ((pixels[i + 2] - 128) * uiContrast + 128))); // B
								}
							}
							
							cachedPixels = imgData.data;
							lastReadbackFrame = p.frameCount;
							// resample targets if enabled and interval reached
							if (config.useTargets) {
								if ((targetFrameCounter % Math.max(1, config.targetResampleInterval || 1)) === 0) {
									buildTargetsFromBrightness(cachedPixels, rbCanvas.width, rbCanvas.height);
								}
							}
							// Update grayscale debug texture if enabled
							if (uiShowBrightnessDebug && dbgGfx) {
								const gctx = dbgGfx.drawingContext;
								if (!dbgImageData || dbgImageData.width !== rbCanvas.width || dbgImageData.height !== rbCanvas.height) {
									dbgImageData = gctx.createImageData(rbCanvas.width, rbCanvas.height);
								}
								const src = cachedPixels;
								const dst = dbgImageData.data;
								for (let i = 0; i < src.length; i += 4) {
									const r = src[i], g = src[i + 1], b = src[i + 2];
									const lum = 0.299 * r + 0.587 * g + 0.114 * b;
									const v = lum | 0;
									dst[i] = v; dst[i + 1] = v; dst[i + 2] = v; dst[i + 3] = 255;
								}
								gctx.putImageData(dbgImageData, 0, 0);
							}
						}
					}
					// compute physics and apply forces (either classic field or target distribution)
					if (config.useTargets && config.targetPositions) {
						import('$lib/particles/physics.js').then(mod => {
							mod.stepParticlesToTargets({ particles, width: p.width, height: p.height, config });
							for (let i = 0; i < particles.length; i++) particles[i].update(config, p.width, p.height);
						});
					} else {
						stepParticles({ p, particles, pg: null, width: p.width, height: p.height, config, pixels: cachedPixels, sampleWidth: rbCanvas.width, sampleHeight: rbCanvas.height });
						for (let i = 0; i < particles.length; i++) particles[i].update(config, p.width, p.height);
					}
					if (config.useTargets) targetFrameCounter++;

					// stream positions/sizes to GPU and draw points
					ensureArrays(particles.length);
					for (let i = 0; i < particles.length; i++) {
						const a = particles[i];
						const k = i * 2;
						positions[k] = a.pos.x;
						positions[k + 1] = a.pos.y;
						sizes[i] = a.size;
					}
					// draw with custom GL program, then restore p5 state
					const particleRgb = hexToRgb(uiParticleColor);
					points.draw(positions, sizes, p.width, p.height, uiSizeScale, uiOpacity, particleRgb);
					if (p.resetShader) p.resetShader();
				} else {
					p.background(50);
				}
				
				// Update FPS display (throttled)
				if (p.frameCount % 10 === 0) {
					currentFPS = Math.round(p.frameRate());
				}

				// Pointer tooltip with brightness and force info
				if (cachedPixels && rbCanvas && typeof p.mouseX === 'number' && typeof p.mouseY === 'number') {
					const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
					const mx = clamp(p.mouseX, 0, p.width - 1);
					const my = clamp(p.mouseY, 0, p.height - 1);
					let bx = Math.floor((mx / p.width) * rbCanvas.width);
					let by = Math.floor((my / p.height) * rbCanvas.height);
					bx = clamp(bx, 0, rbCanvas.width - 1);
					by = clamp(by, 0, rbCanvas.height - 1);
					// mirror X to match displayed image
					bx = rbCanvas.width - 1 - bx;

					const lumAt = (x, y) => {
						const ix = (y * rbCanvas.width + x) * 4;
						return cachedPixels[ix] * 0.299 + cachedPixels[ix + 1] * 0.587 + cachedPixels[ix + 2] * 0.114;
					};

					// 2x2 average
					const bx1 = bx < rbCanvas.width - 1 ? bx + 1 : bx;
					const by1 = by < rbCanvas.height - 1 ? by + 1 : by;
					const br = 0.25 * (lumAt(bx, by) + lumAt(bx1, by) + lumAt(bx, by1) + lumAt(bx1, by1));
					const brightness = br / 255;

					// gradient (not normalized magnitude for display), using configurable radius
					const gradR = Math.max(1, Math.floor(config.gradientRadius ?? 1));
					const bxL = bx - gradR >= 0 ? bx - gradR : 0;
					const bxR = bx + gradR <= rbCanvas.width - 1 ? bx + gradR : rbCanvas.width - 1;
					const byU = by - gradR >= 0 ? by - gradR : 0;
					const byD = by + gradR <= rbCanvas.height - 1 ? by + gradR : rbCanvas.height - 1;
					let gx = lumAt(bxR, by) - lumAt(bxL, by);
					let gy = lumAt(bx, byD) - lumAt(bx, byU);
					const gLen = Math.hypot(gx, gy);

					// physics-derived scalars at this point
					const spacingBright = typeof config.spacingBright === 'number' ? config.spacingBright : Math.max(2, config.neighborRadius * 0.3);
					const spacingDark = typeof config.spacingDark === 'number' ? config.spacingDark : Math.max(spacingBright + 1, config.neighborRadius * 0.9);
					const localRadius = spacingBright + (spacingDark - spacingBright) * (1.0 - brightness);
					const baseRepel = config.baseRepel;
					const minRepel = config.minRepel;
					const gainBright = Math.min(1.0, Math.max(0.0, baseRepel > 1e-3 ? (minRepel / baseRepel) : 0.0));
					const localGain = gainBright + (1.0 - gainBright) * (1.0 - brightness);
					const bGamma = Math.pow(Math.max(0.0, Math.min(1.0, brightness)), Math.max(0.01, config.brightnessGamma ?? 0.85));
					const attractMag = (config.lightAttract ?? 0.08) * bGamma;
					const darkRepelMag = (config.darkRepel ?? 0.6) * (1.0 - brightness);
					const fieldMag = attractMag + darkRepelMag;
					const scaledFieldMag = Math.min(config.maxForce, fieldMag * config.forceScale);

					// prepare tooltip lines
					const lines = [
						`brightness: ${brightness.toFixed(3)}`,
						`grad| |: ${(gLen / 255).toFixed(3)}`,
						`attract: ${attractMag.toFixed(3)}`,
						`darkRepel: ${darkRepelMag.toFixed(3)}`,
						`field*scale: ${scaledFieldMag.toFixed(3)}`,
						`spacing: ${localRadius.toFixed(1)}`,
						`repelGain: ${localGain.toFixed(2)}`
					];
					// measure with 2D canvas font metrics and render onto a small graphics
					const fontCss = '12px monospace';
					if (!tooltipGfx) {
						tooltipGfx = p.createGraphics(16, 16);
						if (tooltipGfx.pixelDensity) tooltipGfx.pixelDensity(1);
					}
					const g2d = tooltipGfx.drawingContext;
					g2d.font = fontCss;
					g2d.textBaseline = 'top';
					let tw = 0;
					for (const s of lines) tw = Math.max(tw, g2d.measureText(s).width);
					const pad = 8;
					const lh = 14;
					const boxW = Math.ceil(tw + pad * 2);
					const boxH = Math.ceil(lines.length * lh + pad * 2);
					// position clamped to screen
					let tx = mx + 12;
					let ty = my + 12;
					if (tx + boxW > p.width - 4) tx = p.width - boxW - 4;
					if (ty + boxH > p.height - 4) ty = p.height - boxH - 4;
					if (tx < 4) tx = 4;
					if (ty < 4) ty = 4;

					// resize and draw into tooltip canvas
					tooltipGfx.resizeCanvas(Math.max(1, boxW), Math.max(1, boxH));
					// clear fully
					g2d.clearRect(0, 0, tooltipGfx.width, tooltipGfx.height);
					// background
					g2d.fillStyle = 'rgba(0,0,0,0.8)';
					g2d.strokeStyle = 'rgba(255,255,255,0.15)';
					// draw rounded rect
					const r = 6;
					g2d.beginPath();
					g2d.moveTo(r, 0);
					g2d.lineTo(boxW - r, 0);
					g2d.quadraticCurveTo(boxW, 0, boxW, r);
					g2d.lineTo(boxW, boxH - r);
					g2d.quadraticCurveTo(boxW, boxH, boxW - r, boxH);
					g2d.lineTo(r, boxH);
					g2d.quadraticCurveTo(0, boxH, 0, boxH - r);
					g2d.lineTo(0, r);
					g2d.quadraticCurveTo(0, 0, r, 0);
					g2d.closePath();
					g2d.fill();
					// text
					g2d.fillStyle = '#ffffff';
					g2d.font = fontCss;
					let yy = pad;
					for (const s of lines) { g2d.fillText(s, pad, yy); yy += lh; }

					// draw onto WEBGL canvas on top, disable depth test to ensure visibility
					const glctx = (p._renderer && p._renderer.GL) ? p._renderer.GL : p.drawingContext;
					const hadDepth = glctx && glctx.isEnabled && glctx.isEnabled(glctx.DEPTH_TEST);
					if (glctx && glctx.disable) glctx.disable(glctx.DEPTH_TEST);
					p.push();
					p.translate(-p.width / 2, -p.height / 2);
					p.image(tooltipGfx, tx, ty);
					p.pop();
					if (glctx && glctx.enable && hadDepth) glctx.enable(glctx.DEPTH_TEST);
				}
			};

			p.windowResized = () => {
				p.resizeCanvas(p.windowWidth, p.windowHeight);
				rbCanvas.width = Math.max(1, Math.floor(p.width * sampleScale));
				rbCanvas.height = Math.max(1, Math.floor(p.height * sampleScale));
				// recreate debug graphics to match new sampling size
				dbgGfx = p.createGraphics(rbCanvas.width, rbCanvas.height);
				if (dbgGfx.pixelDensity) dbgGfx.pixelDensity(1);
				dbgImageData = null;
				if (video && video.size) video.size(p.width, p.height);
				ensureArrays(particles.length);
				// reinit particles retained
			};

			// allow outer code to change particle count at runtime
			p.setParticleCount = (n) => {
				initParticles(Math.max(1, Math.floor(n)));
			};

			// expose a stop method to cleanup camera tracks
			p._stopCapture = () => {
				if (video) {
					try {
						const el = video.elt;
						if (el && el.srcObject && el.srcObject.getTracks) {
							el.srcObject.getTracks().forEach((t) => t.stop());
						}
					} catch (e) {}
					try { video.remove(); } catch (e) {}
				}
			};
		}, sketchContainer);

		return () => {
			if (p5Instance) {
				try {
					if (p5Instance._stopCapture) p5Instance._stopCapture();
				} catch (e) {}
				if (p5Instance.remove) p5Instance.remove();
			}
		};
	});
</script>

<div style="position: relative; min-height:100vh;">
	<div
		bind:this={sketchContainer}
		style="position:fixed; inset:0; width:100%; height:100%; z-index:0;"
	></div>

	<!-- FPS Display -->
	{#if uiShowFPS}
		<div style="position:fixed; top:1rem; right:1rem; z-index:2; background:rgba(0,0,0,0.7); color:white; padding:0.5rem 1rem; border-radius:0.5rem; font-family:monospace; font-size:0.9rem;">
			FPS: {currentFPS}
		</div>
	{/if}

	<div style="position:relative; z-index:1; padding:1rem; max-width:40ch;">
			<ControlsPanel
				particleCount={particleCount}
				ghostEnabled={uiShowGhost}
				ghostOpacity={uiGhostOpacity}
				pointSizeScale={uiSizeScale}
				pointsOpacity={uiOpacity}
				contrast={uiContrast}
				contrastEnabled={uiContrastEnabled}
				showFPS={uiShowFPS}
				particleColor={uiParticleColor}
				backgroundColor={uiBackgroundColor}
				showBrightnessDebug={uiShowBrightnessDebug}
				config={config}
				on:change={handlePanelChange}
			/>
	</div>
</div>

