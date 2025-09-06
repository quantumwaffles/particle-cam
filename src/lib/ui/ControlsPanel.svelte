<script>
    import { createEventDispatcher } from "svelte";
    let open = true;
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
    <div class="row">
        <label
            title="Total number of particles to simulate. Higher values are heavier on CPU/GPU."
            >Particles: {particleCount}
            <input
                title="Total number of particles to simulate. Higher values are heavier on CPU/GPU."
                type="range"
                min="100"
                max={maxParticles}
                step="100"
                bind:value={particleCount}
                on:input={emit}
            />
        </label>
    </div>
    <div class="row">
        <label
            class="flex items-center gap-2 cursor-pointer"
            title="Show the mirrored webcam image behind the points."
        >
            <input
                type="checkbox"
                style="display: none;"
                bind:checked={ghostEnabled}
                on:change={emit}
                title="Show the mirrored webcam image behind the points."
            />
            <div class="custom-toggle" class:active={ghostEnabled}>
                <div class="toggle-slider"></div>
            </div>
            Ghost camera
        </label>
    </div>
    <div class="row">
        <label title="Opacity of the background webcam 'ghost' layer."
            >Ghost opacity: {ghostOpacity.toFixed(2)}
            <input
                title="Opacity of the background webcam 'ghost' layer."
                type="range"
                min="0"
                max="1"
                step="0.01"
                bind:value={ghostOpacity}
                on:input={emit}
            />
        </label>
    </div>
    <div class="row">
        <label title="Multiplier applied to each particle's size (in pixels)."
            >Point size: {pointSizeScale.toFixed(2)}
            <input
                title="Multiplier applied to each particle's size (in pixels)."
                type="range"
                min="0.2"
                max="3"
                step="0.05"
                bind:value={pointSizeScale}
                on:input={emit}
            />
        </label>
    </div>
    <div class="row">
        <label title="Opacity of the particle points."
            >Points opacity: {pointsOpacity.toFixed(2)}
            <input
                title="Opacity of the particle points."
                type="range"
                min="0.2"
                max="1"
                step="0.02"
                bind:value={pointsOpacity}
                on:input={emit}
            />
        </label>
    </div>

    <details open>
        <summary title="Parameters that drive the particle motion."
            >Physics</summary
        >
        <div class="row">
            <label
                class="flex items-center gap-2 cursor-pointer"
                title="If enabled, particles leaving one edge re-enter from the opposite edge (toroidal wrap). Disable to bounce inside the view."
            >
                <input
                    type="checkbox"
                    style="display: none;"
                    bind:checked={config.wrapEdges}
                    on:change={emit}
                    title="If enabled, particles leaving one edge re-enter from the opposite edge (toroidal wrap). Disable to bounce inside the view."
                />
                <div class="custom-toggle" class:active={config.wrapEdges}>
                    <div class="toggle-slider"></div>
                </div>
                Wrap at edges
            </label>
        </div>
        <div class="row">
            <label
                title="Interaction radius used for neighbor repulsion (in pixels). Larger values spread particles out and increase cost."
                >Neighbor radius: {config.neighborRadius}
                <input
                    title="Interaction radius used for neighbor repulsion (in pixels). Larger values spread particles out and increase cost."
                    type="range"
                    min="6"
                    max="80"
                    step="1"
                    bind:value={config.neighborRadius}
                    on:input={emit}
                /></label
            >
        </div>
        <div class="row">
            <label
                title="Maximum number of nearby particles considered per particle. Limits computation cost."
                >Max neighbors: {config.maxNeighbors}
                <input
                    title="Maximum number of nearby particles considered per particle. Limits computation cost."
                    type="range"
                    min="4"
                    max="80"
                    step="1"
                    bind:value={config.maxNeighbors}
                    on:input={emit}
                /></label
            >
        </div>
        <div class="row">
            <label title="Overall multiplier applied to all computed forces."
                >Force scale: {config.forceScale.toFixed(2)}
                <input
                    title="Overall multiplier applied to all computed forces."
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.05"
                    bind:value={config.forceScale}
                    on:input={emit}
                /></label
            >
        </div>
        <div class="row">
            <label title="Base strength of repulsion between nearby particles."
                >Repulsion: {config.baseRepel.toFixed(2)}
                <input
                    title="Base strength of repulsion between nearby particles."
                    type="range"
                    min="0"
                    max="300"
                    step="1"
                    bind:value={config.baseRepel}
                    on:input={emit}
                /></label
            >
        </div>
        <div class="row">
            <label
                title="Minimum repulsion even in bright areas (prevents collapse)."
                >Min repulsion: {config.baseRepelMin.toFixed(2)}
                <input
                    title="Minimum repulsion even in bright areas (prevents collapse)."
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    bind:value={config.baseRepelMin}
                    on:input={emit}
                /></label
            >
        </div>
        <div class="row">
            <label
                title="Strength of attraction toward brighter regions of the webcam image."
                >Light attract: {config.lightAttract.toFixed(2)}
                <input
                    title="Strength of attraction toward brighter regions of the webcam image."
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.005"
                    bind:value={config.lightAttract}
                    on:input={emit}
                /></label
            >
        </div>
        <div class="row">
            <label
                title="Gamma applied to brightness before attraction. <1 boosts darker areas; >1 favors highlights."
                >Brightness gamma: {config.brightnessGamma.toFixed(2)}
                <input
                    title="Gamma applied to brightness before attraction. <1 boosts darker areas; >1 favors highlights."
                    type="range"
                    min="0.3"
                    max="2"
                    step="0.05"
                    bind:value={config.brightnessGamma}
                    on:input={emit}
                /></label
            >
        </div>
        <div class="row">
            <label
                title="Random jitter force to keep motion lively and avoid clumping."
                >Jitter: {config.jitterAmp.toFixed(3)}
                <input
                    title="Random jitter force to keep motion lively and avoid clumping."
                    type="range"
                    min="0"
                    max="0.02"
                    step="0.0005"
                    bind:value={config.jitterAmp}
                    on:input={emit}
                /></label
            >
        </div>
        <div class="row">
            <label
                title="Cap on the per-step force magnitude to stabilize motion."
                >Max force: {config.maxForce.toFixed(2)}
                <input
                    title="Cap on the per-step force magnitude to stabilize motion."
                    type="range"
                    min="0.05"
                    max="3"
                    step="0.05"
                    bind:value={config.maxForce}
                    on:input={emit}
                /></label
            >
        </div>
        <div class="row">
            <label
                title="Velocity damping (drag). Lower values keep particles moving longer."
                >Damping: {config.damping.toFixed(2)}
                <input
                    title="Velocity damping (drag). Lower values keep particles moving longer."
                    type="range"
                    min="0.6"
                    max="0.98"
                    step="0.005"
                    bind:value={config.damping}
                    on:input={emit}
                /></label
            >
        </div>
        <div class="row">
            <label title="Maximum particle speed (pixels per frame)."
                >Max speed: {config.maxSpeed.toFixed(1)}
                <input
                    title="Maximum particle speed (pixels per frame)."
                    type="range"
                    min="1"
                    max="15"
                    step="0.1"
                    bind:value={config.maxSpeed}
                    on:input={emit}
                /></label
            >
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
        transform: translateX(calc(-100% + 40px));
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
