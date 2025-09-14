# Copilot Instructions

## Development Workflow
- **Do not run `npm run dev` or start development servers** - let the user handle testing
- When changes are complete, simply state "Ready to test" instead of attempting to run servers
- Focus on making code changes and explaining what was modified

## Project Context
This is a particle-cam project using:
- Svelte/SvelteKit
- p5.js for rendering
- WebGL for particle rendering
- Webcam input for particle physics

## Current State
- Simplified physics system using only repulsive forces
- Brightness-based repulsion: stronger in dark areas, weaker in light areas
- Color picker functionality for particles and background
- Debug visualization for brightness values
