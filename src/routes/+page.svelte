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
	let currentFPS = 0;
	let config = {
		neighborRadius: 40,
		maxNeighbors: 40,
		forceScale: 1.6,
		baseRepel: 110.0,
		baseRepelMin: 2.0,
		lightAttract: 0.08,
		brightnessGamma: 0.85,
		jitterAmp: 0.0008,
		maxForce: 1.6,
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
		({ particleCount, ghostEnabled: uiShowGhost, ghostOpacity: uiGhostOpacity, pointSizeScale: uiSizeScale, pointsOpacity: uiOpacity, contrast: uiContrast, contrastEnabled: uiContrastEnabled, showFPS: uiShowFPS, particleColor: uiParticleColor, backgroundColor: uiBackgroundColor, config } = e.detail);
		if (p5Instance && p5Instance.setParticleCount) p5Instance.setParticleCount(+particleCount);
	}

	onMount(() => {
		p5Instance = new p5((p) => {
			let video;
			let rbCanvas; // offscreen 2D canvas for brightness sampling
			let rbCtx;
			const sampleScale = 0.5; // downscale sampling buffer for speed

			// GPU point rendering state
			let gl;
			let points; // points renderer instance
			let camShader; // camera shader for ghost image
			let positions = new Float32Array(0);
			let sizes = new Float32Array(0);
			// pixel readback cache to reduce getImageData warnings
			let cachedPixels = null;
			let lastReadbackFrame = -9999;
			const readbackInterval = 2; // only read every N frames

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
						}
					}
					// compute physics and apply forces
					stepParticles({ p, particles, pg: null, width: p.width, height: p.height, config, pixels: cachedPixels, sampleWidth: rbCanvas.width, sampleHeight: rbCanvas.height });
					for (let i = 0; i < particles.length; i++) particles[i].update(config, p.width, p.height);

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
			};

			p.windowResized = () => {
				p.resizeCanvas(p.windowWidth, p.windowHeight);
				rbCanvas.width = Math.max(1, Math.floor(p.width * sampleScale));
				rbCanvas.height = Math.max(1, Math.floor(p.height * sampleScale));
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
				config={config}
				on:change={handlePanelChange}
			/>
	</div>
</div>

