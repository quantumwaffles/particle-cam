<script>
    import { createEventDispatcher } from "svelte";
    let open = true;
    export let particleCount = 400;
    export let maxParticles = 80000;
    export let ghostEnabled = true;
    export let ghostOpacity = 0.35;
    export let pointSizeScale = 1.0;
    export let pointsOpacity = 1.0;
    export let contrast = 1.0;
    export let contrastEnabled = true;
    export let showFPS = true;
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
        wrapEdges: true,
    };
    const dispatch = createEventDispatcher();
    const emit = () =>
        dispatch("change", {
            particleCount,
            ghostEnabled,
            ghostOpacity,
            pointSizeScale,
            pointsOpacity,
            contrast,
            contrastEnabled,
            showFPS,
            config,
        });
</script>

<div class="panel" aria-expanded={open} class:closed={!open}>
    <div class="panel-header">
        <div class="panel-title">Controls</div>
    </div>
    <button
        class="panel-toggle"
        on:click={() => (open = !open)}
        title={open ? "Hide controls" : "Show controls"}
        aria-label={open ? "Hide controls" : "Show controls"}
        >{open ? "◂" : "▸"}</button
    >
    <div class="control-grid">
        <div class="control-row">
            <label class="control-label" title="Total number of particles to simulate. Higher values are heavier on CPU/GPU.">
                Particles:
            </label>
            <div class="control-value">{particleCount}</div>
            <input
                title="Total number of particles to simulate. Higher values are heavier on CPU/GPU."
                type="range"
                min="100"
                max={maxParticles}
                step="100"
                bind:value={particleCount}
                on:input={emit}
            />
        </div>
        
        <div class="control-row">
            <label class="control-label" title="Show the mirrored webcam image behind the points.">
                Ghost camera:
            </label>
            <div class="control-toggle">
                <input
                    type="checkbox"
                    style="display: none;"
                    bind:checked={ghostEnabled}
                    on:change={emit}
                    title="Show the mirrored webcam image behind the points."
                />
                <div class="custom-toggle" class:active={ghostEnabled} on:click={() => { ghostEnabled = !ghostEnabled; emit(); }} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { ghostEnabled = !ghostEnabled; emit(); } }} tabindex="0" role="switch" aria-checked={ghostEnabled}>
                    <div class="toggle-slider"></div>
                </div>
            </div>
        </div>
        
        <div class="control-row">
            <label class="control-label" title="Opacity of the background webcam 'ghost' layer.">
                Ghost opacity:
            </label>
            <div class="control-value">{ghostOpacity.toFixed(2)}</div>
            <input
                title="Opacity of the background webcam 'ghost' layer."
                type="range"
                min="0"
                max="1"
                step="0.01"
                bind:value={ghostOpacity}
                on:input={emit}
            />
        </div>
        
        <div class="control-row">
            <label class="control-label" title="Multiplier applied to each particle's size (in pixels).)">
                Point size:
            </label>
            <div class="control-value">{pointSizeScale.toFixed(2)}</div>
            <input
                title="Multiplier applied to each particle's size (in pixels)."
                type="range"
                min="0.2"
                max="3"
                step="0.05"
                bind:value={pointSizeScale}
                on:input={emit}
            />
        </div>
        
        <div class="control-row">
            <label class="control-label" title="Opacity of the particle points.">
                Points opacity:
            </label>
            <div class="control-value">{pointsOpacity.toFixed(2)}</div>
            <input
                title="Opacity of the particle points."
                type="range"
                min="0.2"
                max="1"
                step="0.02"
                bind:value={pointsOpacity}
                on:input={emit}
            />
        </div>
        
        <div class="control-row">
            <label class="control-label" title="Enable/disable contrast adjustment processing for performance.">
                Contrast processing:
            </label>
            <div class="control-toggle">
                <input
                    type="checkbox"
                    style="display: none;"
                    bind:checked={contrastEnabled}
                    on:change={emit}
                    title="Enable/disable contrast adjustment processing for performance."
                />
                <div class="custom-toggle" class:active={contrastEnabled} on:click={() => { contrastEnabled = !contrastEnabled; emit(); }} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { contrastEnabled = !contrastEnabled; emit(); } }} tabindex="0" role="switch" aria-checked={contrastEnabled}>
                    <div class="toggle-slider"></div>
                </div>
            </div>
        </div>
        
        <div class="control-row">
            <label class="control-label" title="Contrast adjustment applied to the camera image used for particle behavior. Higher values increase contrast.">
                Image contrast:
            </label>
            <div class="control-value">{contrast.toFixed(2)}</div>
            <input
                title="Contrast adjustment applied to the camera image used for particle behavior. Higher values increase contrast."
                type="range"
                min="0.2"
                max="5"
                step="0.05"
                bind:value={contrast}
                on:input={emit}
                disabled={!contrastEnabled}
            />
        </div>
        
        <div class="control-row">
            <label class="control-label" title="Show/hide the FPS display in the top right corner.">
                Show FPS:
            </label>
            <div class="control-toggle">
                <input
                    type="checkbox"
                    style="display: none;"
                    bind:checked={showFPS}
                    on:change={emit}
                    title="Show/hide the FPS display in the top right corner."
                />
                <div class="custom-toggle" class:active={showFPS} on:click={() => { showFPS = !showFPS; emit(); }} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { showFPS = !showFPS; emit(); } }} tabindex="0" role="switch" aria-checked={showFPS}>
                    <div class="toggle-slider"></div>
                </div>
            </div>
        </div>
    </div>

    <details open>
        <summary title="Parameters that drive the particle motion.">Physics</summary>
        <div class="control-grid">
            <div class="control-row">
                <label class="control-label" title="If enabled, particles leaving one edge re-enter from the opposite edge (toroidal wrap). Disable to bounce inside the view.">
                    Wrap at edges:
                </label>
                <div class="control-toggle">
                    <input
                        type="checkbox"
                        style="display: none;"
                        bind:checked={config.wrapEdges}
                        on:change={emit}
                        title="If enabled, particles leaving one edge re-enter from the opposite edge (toroidal wrap). Disable to bounce inside the view."
                    />
                    <div class="custom-toggle" class:active={config.wrapEdges} on:click={() => { config.wrapEdges = !config.wrapEdges; emit(); }} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { config.wrapEdges = !config.wrapEdges; emit(); } }} tabindex="0" role="switch" aria-checked={config.wrapEdges}>
                        <div class="toggle-slider"></div>
                    </div>
                </div>
            </div>
            
            <div class="control-row">
                <label class="control-label" title="Interaction radius used for neighbor repulsion (in pixels). Larger values spread particles out and increase cost.">
                    Neighbor radius:
                </label>
                <div class="control-value">{config.neighborRadius}</div>
                <input
                    title="Interaction radius used for neighbor repulsion (in pixels). Larger values spread particles out and increase cost."
                    type="range"
                    min="6"
                    max="80"
                    step="1"
                    bind:value={config.neighborRadius}
                    on:input={emit}
                />
            </div>
            
            <div class="control-row">
                <label class="control-label" title="Maximum number of nearby particles considered per particle. Limits computation cost.">
                    Max neighbors:
                </label>
                <div class="control-value">{config.maxNeighbors}</div>
                <input
                    title="Maximum number of nearby particles considered per particle. Limits computation cost."
                    type="range"
                    min="4"
                    max="80"
                    step="1"
                    bind:value={config.maxNeighbors}
                    on:input={emit}
                />
            </div>
            
            <div class="control-row">
                <label class="control-label" title="Overall multiplier applied to all computed forces.">
                    Force scale:
                </label>
                <div class="control-value">{config.forceScale.toFixed(2)}</div>
                <input
                    title="Overall multiplier applied to all computed forces."
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.05"
                    bind:value={config.forceScale}
                    on:input={emit}
                />
            </div>
            
            <div class="control-row">
                <label class="control-label" title="Base strength of repulsion between nearby particles.">
                    Repulsion:
                </label>
                <div class="control-value">{config.baseRepel.toFixed(2)}</div>
                <input
                    title="Base strength of repulsion between nearby particles."
                    type="range"
                    min="0"
                    max="300"
                    step="1"
                    bind:value={config.baseRepel}
                    on:input={emit}
                />
            </div>
            
            <div class="control-row">
                <label class="control-label" title="Minimum repulsion even in bright areas (prevents collapse).">
                    Min repulsion:
                </label>
                <div class="control-value">{config.baseRepelMin.toFixed(2)}</div>
                <input
                    title="Minimum repulsion even in bright areas (prevents collapse)."
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    bind:value={config.baseRepelMin}
                    on:input={emit}
                />
            </div>
            
            <div class="control-row">
                <label class="control-label" title="Strength of attraction toward brighter regions of the webcam image.">
                    Light attract:
                </label>
                <div class="control-value">{config.lightAttract.toFixed(2)}</div>
                <input
                    title="Strength of attraction toward brighter regions of the webcam image."
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.005"
                    bind:value={config.lightAttract}
                    on:input={emit}
                />
            </div>
            
            <div class="control-row">
                <label class="control-label" title="Gamma applied to brightness before attraction. <1 boosts darker areas; >1 favors highlights.">
                    Brightness gamma:
                </label>
                <div class="control-value">{config.brightnessGamma.toFixed(2)}</div>
                <input
                    title="Gamma applied to brightness before attraction. <1 boosts darker areas; >1 favors highlights."
                    type="range"
                    min="0.3"
                    max="2"
                    step="0.05"
                    bind:value={config.brightnessGamma}
                    on:input={emit}
                />
            </div>
            
            <div class="control-row">
                <label class="control-label" title="Random jitter force to keep motion lively and avoid clumping.">
                    Jitter:
                </label>
                <div class="control-value">{config.jitterAmp.toFixed(3)}</div>
                <input
                    title="Random jitter force to keep motion lively and avoid clumping."
                    type="range"
                    min="0"
                    max="0.02"
                    step="0.0005"
                    bind:value={config.jitterAmp}
                    on:input={emit}
                />
            </div>
            
            <div class="control-row">
                <label class="control-label" title="Cap on the per-step force magnitude to stabilize motion.">
                    Max force:
                </label>
                <div class="control-value">{config.maxForce.toFixed(2)}</div>
                <input
                    title="Cap on the per-step force magnitude to stabilize motion."
                    type="range"
                    min="0.05"
                    max="3"
                    step="0.05"
                    bind:value={config.maxForce}
                    on:input={emit}
                />
            </div>
            
            <div class="control-row">
                <label class="control-label" title="Velocity damping (drag). Lower values keep particles moving longer.">
                    Damping:
                </label>
                <div class="control-value">{config.damping.toFixed(2)}</div>
                <input
                    title="Velocity damping (drag). Lower values keep particles moving longer."
                    type="range"
                    min="0.6"
                    max="0.98"
                    step="0.005"
                    bind:value={config.damping}
                    on:input={emit}
                />
            </div>
            
            <div class="control-row">
                <label class="control-label" title="Maximum particle speed (pixels per frame).">
                    Max speed:
                </label>
                <div class="control-value">{config.maxSpeed.toFixed(1)}</div>
                <input
                    title="Maximum particle speed (pixels per frame)."
                    type="range"
                    min="1"
                    max="15"
                    step="0.1"
                    bind:value={config.maxSpeed}
                    on:input={emit}
                />
            </div>
        </div>
    </details>
</div>

<style>
    .panel {
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        padding: 10px;
        border-radius: 8px;
        font:
            12px/1.4 system-ui,
            -apple-system,
            Segoe UI,
            Roboto,
            sans-serif;
        width: 280px;
    }
    .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
        position: relative;
    }
    .panel-title {
        font-weight: 600;
    }
    .panel-toggle {
        background: transparent;
        border: none;
        color: inherit;
        font-size: 14px;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
    }
    .panel-toggle:hover {
        background: rgba(255, 255, 255, 0.05);
    }
    /* sliding drawer */
    .panel {
        position: fixed;
        top: 10px;
        left: 10px;
        transform-origin: left top;
        transition:
            transform 240ms ease,
            opacity 240ms ease;
        z-index: 1000;
    }
    .panel.closed {
        transform: translateX(calc(-100% + 20px));
        opacity: 0.95;
    }
    /* ensure a visible handle remains when closed */
    .panel.closed .panel-header {
        padding-right: 6px;
    }
    /* keep the panel-toggle always attached to the right center of the panel */
    .panel-toggle {
        position: absolute;
        right: -16px; /* stick out a bit beyond the right edge */
        top: 50%;
        transform: translateY(-50%);
        z-index: 1002;
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-left: none;
        border-radius: 0 8px 8px 0;
        padding: 8px 10px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    }
    .row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 6px 0;
    }
    label {
        flex: 1;
    }
    input[type="range"] {
        width: 130px;
    }
    
    /* Grid layout for controls */
    .control-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .control-row {
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: center;
        gap: 8px;
    }
    .control-label {
        font-size: 12px;
        color: #fff;
        min-width: 0;
    }
    .control-value {
        font-size: 11px;
        color: #aaa;
        min-width: 36px;
        text-align: right;
        font-family: monospace;
    }
    .control-toggle {
        grid-column: 2 / 4;
        justify-self: end;
    }
    input[type="range"] {
        width: 100px;
        grid-column: 3;
    }
    summary {
        cursor: pointer;
        margin-top: 6px;
    }
    details > div {
        margin-top: 6px;
    }
    .panel :global(input) {
        accent-color: #66e;
    }
    .panel :global(details) {
        user-select: none;
    }

    /* Custom toggle switch */
    .custom-toggle {
        width: 36px;
        height: 20px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 10px;
        position: relative;
        transition: background-color 0.2s ease;
        border: 1px solid rgba(255, 255, 255, 0.3);
        cursor: pointer;
    }
    .custom-toggle:focus {
        outline: 2px solid #66e;
        outline-offset: 2px;
    }
    .custom-toggle.active {
        background: #66e;
    }
    .toggle-slider {
        width: 16px;
        height: 16px;
        background: white;
        border-radius: 50%;
        position: absolute;
        top: 1px;
        left: 1px;
        transition: transform 0.2s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }
    .custom-toggle.active .toggle-slider {
        transform: translateX(16px);
    }
</style>
