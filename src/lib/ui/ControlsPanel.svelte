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
    export let particleColor = "#ffffff";
    export let backgroundColor = "#000000";
    export let showBrightnessDebug = false;
    
    let showParticleColorPicker = false;
    let showBackgroundColorPicker = false;
    export let config = {
        neighborRadius: 40,
        maxNeighbors: 40,
        forceScale: 2.5,
        baseRepel: 500.0,
        minRepel: 5.0,
    spacingBright: 8,
    spacingDark: 28,
    darkRepel: 0.6,
    lightAttract: 0.08,
    brightnessGamma: 0.85,
    gradientRadius: 2,
    useTargets: false,
    targetAttract: 0.15,
    targetRepel: 0.5,
    targetResampleInterval: 20,
    targetSampleStride: 2,
    targetGamma: 1.0,
        jitterAmp: 0.0001,
        maxForce: 3.0,
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
            particleColor,
            backgroundColor,
            showBrightnessDebug,
            config,
        });
    
    function toggleParticleColorPicker() {
        showParticleColorPicker = !showParticleColorPicker;
        if (showParticleColorPicker) showBackgroundColorPicker = false;
    }
    
    function toggleBackgroundColorPicker() {
        showBackgroundColorPicker = !showBackgroundColorPicker;
        if (showBackgroundColorPicker) showParticleColorPicker = false;
    }
    
    function handleParticleColorChange(event) {
        particleColor = event.target.value;
        emit();
    }
    
    function handleBackgroundColorChange(event) {
        backgroundColor = event.target.value;
        emit();
    }
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
            <label class="control-label" for="particleCount" title="Total number of particles to simulate. Higher values are heavier on CPU/GPU.">
                Particles:
            </label>
            <div class="control-value">{particleCount}</div>
            <input
                id="particleCount"
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
            <label class="control-label" for="ghostEnabled" title="Show the mirrored webcam image behind the points.">
                Ghost camera:
            </label>
            <div class="control-toggle">
                <input
                    id="ghostEnabled"
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
            <label class="control-label" for="ghostOpacity" title="Opacity of the background webcam 'ghost' layer.">
                Ghost opacity:
            </label>
            <div class="control-value">{ghostOpacity.toFixed(2)}</div>
            <input
                id="ghostOpacity"
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
            <label class="control-label" for="pointSize" title="Multiplier applied to each particle's size (in pixels).)">
                Point size:
            </label>
            <div class="control-value">{pointSizeScale.toFixed(2)}</div>
            <input
                id="pointSize"
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
            <label class="control-label" for="pointsOpacity" title="Opacity of the particle points.">
                Points opacity:
            </label>
            <div class="control-value">{pointsOpacity.toFixed(2)}</div>
            <input
                id="pointsOpacity"
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
            <label class="control-label" for="contrastEnabled" title="Enable/disable contrast adjustment processing for performance.">
                Contrast processing:
            </label>
            <div class="control-toggle">
                <input
                    id="contrastEnabled"
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
            <label class="control-label" for="imageContrast" title="Contrast adjustment applied to the camera image used for particle behavior. Higher values increase contrast.">
                Image contrast:
            </label>
            <div class="control-value">{contrast.toFixed(2)}</div>
            <input
                id="imageContrast"
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
            <label class="control-label" for="showFPS" title="Show/hide the FPS display in the top right corner.">
                Show FPS:
            </label>
            <div class="control-toggle">
                <input
                    id="showFPS"
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
        
        <div class="control-row">
            <label class="control-label" for="debugBrightness" title="Show brightness debug visualization as black/white squares.">
                Debug brightness:
            </label>
            <div class="control-toggle">
                <input
                    id="debugBrightness"
                    type="checkbox"
                    style="display: none;"
                    bind:checked={showBrightnessDebug}
                    on:change={emit}
                    title="Show brightness debug visualization as black/white squares."
                />
                <div class="custom-toggle" class:active={showBrightnessDebug} on:click={() => { showBrightnessDebug = !showBrightnessDebug; emit(); }} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { showBrightnessDebug = !showBrightnessDebug; emit(); } }} tabindex="0" role="switch" aria-checked={showBrightnessDebug}>
                    <div class="toggle-slider"></div>
                </div>
            </div>
        </div>
        
        <div class="control-row">
            <div class="control-label" title="Click to change the particle color.">
                Particle color:
            </div>
            <div class="color-value">{particleColor}</div>
            <div class="color-picker-container">
                <button class="color-button" style="background-color: {particleColor}" on:click={toggleParticleColorPicker} title="Click to change particle color" aria-label="Select particle color"></button>
                {#if showParticleColorPicker}
                    <div class="color-picker-popup">
                        <input type="color" bind:value={particleColor} on:input={handleParticleColorChange} />
                    </div>
                {/if}
            </div>
        </div>
        
        <div class="control-row">
            <div class="control-label" title="Click to change the background color.">
                Background color:
            </div>
            <div class="color-value">{backgroundColor}</div>
            <div class="color-picker-container">
                <button class="color-button" style="background-color: {backgroundColor}" on:click={toggleBackgroundColorPicker} title="Click to change background color" aria-label="Select background color"></button>
                {#if showBackgroundColorPicker}
                    <div class="color-picker-popup">
                        <input type="color" bind:value={backgroundColor} on:input={handleBackgroundColorChange} />
                    </div>
                {/if}
            </div>
        </div>
    </div>

    <details open>
        <summary title="Parameters that drive the particle motion.">Physics</summary>
        <div class="control-grid">
            <div class="control-row">
                <label class="control-label" for="wrapEdges" title="If enabled, particles leaving one edge re-enter from the opposite edge (toroidal wrap). Disable to bounce inside the view.">
                    Wrap at edges:
                </label>
                <div class="control-toggle">
                    <input
                        id="wrapEdges"
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
                <label class="control-label" for="neighborRadius" title="Interaction radius used for neighbor repulsion (in pixels). Larger values spread particles out and increase cost.">
                    Neighbor radius:
                </label>
                <div class="control-value">{config.neighborRadius}</div>
                <input
                    id="neighborRadius"
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
                <label class="control-label" for="maxNeighbors" title="Maximum number of nearby particles considered per particle. Limits computation cost.">
                    Max neighbors:
                </label>
                <div class="control-value">{config.maxNeighbors}</div>
                <input
                    id="maxNeighbors"
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
                <label class="control-label" for="forceScale" title="Overall multiplier applied to all computed forces.">
                    Force scale:
                </label>
                <div class="control-value">{config.forceScale.toFixed(2)}</div>
                <input
                    id="forceScale"
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
                <label class="control-label" for="baseRepel" title="Maximum repulsion strength in dark areas. Bright areas use minimum repulsion.">
                    Max repulsion:
                </label>
                <div class="control-value">{config.baseRepel.toFixed(2)}</div>
                <input
                    id="baseRepel"
                    title="Maximum repulsion strength in dark areas. Bright areas use minimum repulsion."
                    type="range"
                    min="0"
                    max="300"
                    step="1"
                    bind:value={config.baseRepel}
                    on:input={emit}
                />
            </div>
            
            <div class="control-row">
                <label class="control-label" for="minRepel" title="Minimum repulsion in bright areas (prevents collapse).">
                    Min repulsion:
                </label>
                <div class="control-value">{config.minRepel.toFixed(2)}</div>
                <input
                    id="minRepel"
                    title="Minimum repulsion in bright areas (prevents collapse)."
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    bind:value={config.minRepel}
                    on:input={emit}
                />
            </div>

            <div class="control-row">
                <label class="control-label" for="lightAttract" title="Attraction strength toward brighter areas based on brightness gradient.">
                    Light attract:
                </label>
                <div class="control-value">{config.lightAttract.toFixed(2)}</div>
                <input
                    id="lightAttract"
                    title="Attraction strength toward brighter areas based on brightness gradient."
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    bind:value={config.lightAttract}
                    on:input={emit}
                />
            </div>

            <div class="control-row">
                <label class="control-label" for="brightnessGamma" title="Gamma applied to brightness for attraction weighting (lower = more weight to mid/dark tones).">
                    Brightness gamma:
                </label>
                <div class="control-value">{config.brightnessGamma.toFixed(2)}</div>
                <input
                    id="brightnessGamma"
                    title="Gamma applied to brightness for attraction weighting (lower = more weight to mid/dark tones)."
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.05"
                    bind:value={config.brightnessGamma}
                    on:input={emit}
                />
            </div>

            <div class="control-row">
                <label class="control-label" for="gradientRadius" title="Distance (in pixels) between samples used to compute the brightness gradient for attraction/repulsion direction.">
                    Gradient radius:
                </label>
                <div class="control-value">{config.gradientRadius}</div>
                <input
                    id="gradientRadius"
                    title="Distance (in pixels) between samples used to compute the brightness gradient for attraction/repulsion direction."
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    bind:value={config.gradientRadius}
                    on:input={emit}
                />
            </div>

            <div class="control-row">
                <label class="control-label" for="useTargets" title="Enable brightness-weighted target distribution mode.">Targets mode:</label>
                <div class="control-toggle">
                    <input id="useTargets" type="checkbox" style="display:none;" bind:checked={config.useTargets} on:change={emit} />
                    <div class="custom-toggle" class:active={config.useTargets} on:click={() => { config.useTargets = !config.useTargets; emit(); }} tabindex="0" role="switch" aria-checked={config.useTargets}><div class="toggle-slider"></div></div>
                </div>
            </div>
            {#if config.useTargets}
            <div class="control-row">
                <label class="control-label" for="targetAttract" title="Spring strength drawing particles to targets.">T attract:</label>
                <div class="control-value">{config.targetAttract.toFixed(2)}</div>
                <input id="targetAttract" type="range" min="0.01" max="0.6" step="0.01" bind:value={config.targetAttract} on:input={emit} />
            </div>
            <div class="control-row">
                <label class="control-label" for="targetRepel" title="Repulsion for spacing while in target mode.">T repel:</label>
                <div class="control-value">{config.targetRepel.toFixed(2)}</div>
                <input id="targetRepel" type="range" min="0" max="1.5" step="0.05" bind:value={config.targetRepel} on:input={emit} />
            </div>
            <div class="control-row">
                <label class="control-label" for="targetGamma" title="Gamma applied to brightness before weighting targets.">T gamma:</label>
                <div class="control-value">{config.targetGamma.toFixed(2)}</div>
                <input id="targetGamma" type="range" min="0.4" max="2.5" step="0.05" bind:value={config.targetGamma} on:input={emit} />
            </div>
            <div class="control-row">
                <label class="control-label" for="targetSampleStride" title="Pixel stride when building brightness weights (higher = faster, blurrier).">T stride:</label>
                <div class="control-value">{config.targetSampleStride}</div>
                <input id="targetSampleStride" type="range" min="1" max="8" step="1" bind:value={config.targetSampleStride} on:input={emit} />
            </div>
            <div class="control-row">
                <label class="control-label" for="targetResampleInterval" title="Frames between target resamples.">T interval:</label>
                <div class="control-value">{config.targetResampleInterval}</div>
                <input id="targetResampleInterval" type="range" min="1" max="120" step="1" bind:value={config.targetResampleInterval} on:input={emit} />
            </div>
            {/if}
            
            <div class="control-row">
                <label class="control-label" for="jitterAmp" title="Random jitter force to keep motion lively and avoid clumping.">
                    Jitter:
                </label>
                <div class="control-value">{config.jitterAmp.toFixed(3)}</div>
                <input
                    id="jitterAmp"
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
                <label class="control-label" for="maxForce" title="Cap on the per-step force magnitude to stabilize motion.">
                    Max force:
                </label>
                <div class="control-value">{config.maxForce.toFixed(2)}</div>
                <input
                    id="maxForce"
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
                <label class="control-label" for="damping" title="Velocity damping (drag). Lower values keep particles moving longer.">
                    Damping:
                </label>
                <div class="control-value">{config.damping.toFixed(2)}</div>
                <input
                    id="damping"
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
                <label class="control-label" for="maxSpeed" title="Maximum particle speed (pixels per frame).">
                    Max speed:
                </label>
                <div class="control-value">{config.maxSpeed.toFixed(1)}</div>
                <input
                    id="maxSpeed"
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

    /* Color picker styles */
    .color-value {
        font-size: 11px;
        color: #aaa;
        min-width: 60px;
        text-align: right;
        font-family: monospace;
    }
    .color-picker-container {
        position: relative;
        grid-column: 3;
    }
    .color-button {
        width: 32px;
        height: 20px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        cursor: pointer;
        background: none;
        transition: border-color 0.2s ease;
    }
    .color-button:hover {
        border-color: rgba(255, 255, 255, 0.5);
    }
    .color-button:focus {
        outline: 2px solid #66e;
        outline-offset: 2px;
    }
    .color-picker-popup {
        position: absolute;
        top: 100%;
        right: 0;
        z-index: 1001;
        margin-top: 4px;
        padding: 8px;
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }
    .color-picker-popup input[type="color"] {
        width: 60px;
        height: 40px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        background: transparent;
    }
    .color-picker-popup input[type="color"]::-webkit-color-swatch-wrapper {
        padding: 0;
        border: none;
        border-radius: 4px;
    }
    .color-picker-popup input[type="color"]::-webkit-color-swatch {
        border: none;
        border-radius: 4px;
    }
</style>
