# particle-cam

A particle physics visualization using webcam input, built with Svelte and p5.js.

## Features

- Real-time webcam input
- Particle physics simulation with brightness-based repulsion
- WebGL rendering for performance
- Color customization for particles and background

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

## Deployment

This project is configured to deploy automatically to GitHub Pages. When changes are pushed to the `main` branch, GitHub Actions will build and deploy the site.

The deployed site will be available at: `https://quantumwaffles.github.io/particle-cam/`

### Manual Deployment

To deploy manually, ensure you have the GitHub Pages settings configured:
1. Go to repository Settings > Pages
2. Set Source to "GitHub Actions"
3. Push to the `main` branch or manually trigger the workflow
