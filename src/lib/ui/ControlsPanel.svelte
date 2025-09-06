<script>
  import { createEventDispatcher } from 'svelte';
  export let particleCount = 400;
  export let maxParticles = 80000;
  export let ghostEnabled = true;
  export let ghostOpacity = 0.35;
  export let pointSizeScale = 1.0;
  export let pointsOpacity = 1.0;
  export let config = {
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
  const dispatch = createEventDispatcher();
  const emit = () => dispatch('change', { particleCount, ghostEnabled, ghostOpacity, pointSizeScale, pointsOpacity, config });
</script>

<div class="panel">
  <div class="row">
    <label title="Total number of particles to simulate. Higher values are heavier on CPU/GPU.">Particles: {particleCount}
      <input title="Total number of particles to simulate. Higher values are heavier on CPU/GPU." type="range" min="100" max={maxParticles} step="100" bind:value={particleCount} on:input={emit} />
    </label>
  </div>
  <div class="row">
    <label title="Show the mirrored webcam image behind the points."><input title="Show the mirrored webcam image behind the points." type="checkbox" bind:checked={ghostEnabled} on:change={emit} /> Ghost camera</label>
  </div>
  <div class="row">
    <label title="Opacity of the background webcam 'ghost' layer.">Ghost opacity: {ghostOpacity.toFixed(2)}
      <input title="Opacity of the background webcam 'ghost' layer." type="range" min="0" max="1" step="0.01" bind:value={ghostOpacity} on:input={emit} />
    </label>
  </div>
  <div class="row">
    <label title="Multiplier applied to each particle's size (in pixels).">Point size: {pointSizeScale.toFixed(2)}
      <input title="Multiplier applied to each particle's size (in pixels)." type="range" min="0.2" max="3" step="0.05" bind:value={pointSizeScale} on:input={emit} />
    </label>
  </div>
  <div class="row">
    <label title="Opacity of the particle points.">Points opacity: {pointsOpacity.toFixed(2)}
      <input title="Opacity of the particle points." type="range" min="0.2" max="1" step="0.02" bind:value={pointsOpacity} on:input={emit} />
    </label>
  </div>

  <details open>
    <summary title="Parameters that drive the particle motion.">Physics</summary>
  <div class="row"><label title="If enabled, particles leaving one edge re-enter from the opposite edge (toroidal wrap). Disable to bounce inside the view."><input title="If enabled, particles leaving one edge re-enter from the opposite edge (toroidal wrap). Disable to bounce inside the view." type="checkbox" bind:checked={config.wrapEdges} on:change={emit} /> Wrap at edges</label></div>
    <div class="row"><label title="Interaction radius used for neighbor repulsion (in pixels). Larger values spread particles out and increase cost.">Neighbor radius: {config.neighborRadius}
      <input title="Interaction radius used for neighbor repulsion (in pixels). Larger values spread particles out and increase cost." type="range" min="6" max="80" step="1" bind:value={config.neighborRadius} on:input={emit} /></label></div>
    <div class="row"><label title="Maximum number of nearby particles considered per particle. Limits computation cost.">Max neighbors: {config.maxNeighbors}
      <input title="Maximum number of nearby particles considered per particle. Limits computation cost." type="range" min="4" max="80" step="1" bind:value={config.maxNeighbors} on:input={emit} /></label></div>
    <div class="row"><label title="Overall multiplier applied to all computed forces.">Force scale: {config.forceScale.toFixed(2)}
      <input title="Overall multiplier applied to all computed forces." type="range" min="0.1" max="3" step="0.05" bind:value={config.forceScale} on:input={emit} /></label></div>
    <div class="row"><label title="Base strength of repulsion between nearby particles.">Repulsion: {config.baseRepel.toFixed(2)}
      <input title="Base strength of repulsion between nearby particles." type="range" min="0" max="300" step="1" bind:value={config.baseRepel} on:input={emit} /></label></div>
    <div class="row"><label title="Minimum repulsion even in bright areas (prevents collapse).">Min repulsion: {config.baseRepelMin.toFixed(2)}
      <input title="Minimum repulsion even in bright areas (prevents collapse)." type="range" min="0" max="20" step="0.5" bind:value={config.baseRepelMin} on:input={emit} /></label></div>
    <div class="row"><label title="Strength of attraction toward brighter regions of the webcam image.">Light attract: {config.lightAttract.toFixed(2)}
      <input title="Strength of attraction toward brighter regions of the webcam image." type="range" min="0" max="1.0" step="0.005" bind:value={config.lightAttract} on:input={emit} /></label></div>
    <div class="row"><label title="Gamma applied to brightness before attraction. <1 boosts darker areas; >1 favors highlights.">Brightness gamma: {config.brightnessGamma.toFixed(2)}
      <input title="Gamma applied to brightness before attraction. <1 boosts darker areas; >1 favors highlights." type="range" min="0.3" max="2" step="0.05" bind:value={config.brightnessGamma} on:input={emit} /></label></div>
    <div class="row"><label title="Random jitter force to keep motion lively and avoid clumping.">Jitter: {config.jitterAmp.toFixed(3)}
      <input title="Random jitter force to keep motion lively and avoid clumping." type="range" min="0" max="0.02" step="0.0005" bind:value={config.jitterAmp} on:input={emit} /></label></div>
    <div class="row"><label title="Cap on the per-step force magnitude to stabilize motion.">Max force: {config.maxForce.toFixed(2)}
      <input title="Cap on the per-step force magnitude to stabilize motion." type="range" min="0.05" max="3" step="0.05" bind:value={config.maxForce} on:input={emit} /></label></div>
    <div class="row"><label title="Velocity damping (drag). Lower values keep particles moving longer.">Damping: {config.damping.toFixed(2)}
      <input title="Velocity damping (drag). Lower values keep particles moving longer." type="range" min="0.6" max="0.98" step="0.005" bind:value={config.damping} on:input={emit} /></label></div>
    <div class="row"><label title="Maximum particle speed (pixels per frame).">Max speed: {config.maxSpeed.toFixed(1)}
      <input title="Maximum particle speed (pixels per frame)." type="range" min="1" max="15" step="0.1" bind:value={config.maxSpeed} on:input={emit} /></label></div>
  </details>
</div>

<style>
  .panel { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.55); color: #fff; padding: 10px; border-radius: 8px; font: 12px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; width: 280px; }
  .row { display: flex; align-items: center; gap: 10px; margin: 6px 0; }
  label { flex: 1; }
  input[type="range"] { width: 130px; }
  summary { cursor: pointer; margin-top: 6px; }
  details > div { margin-top: 6px; }
  .panel input[type="checkbox"] { transform: translateY(1px); }
  .panel :global(input) { accent-color: #66e; }
  .panel :global(details) { user-select: none; }
</style>
