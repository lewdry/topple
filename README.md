# Topple

A Vite-powered web game.

## Development

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

## Deploy

This project uses GitHub Actions to deploy to GitHub Pages automatically on every push to `main`.

- The workflow builds the app and publishes the `dist` folder to the `gh-pages` branch.
- Make sure your repository's GitHub Pages settings are set to deploy from the `gh-pages` branch.

## Project Structure

- `src/` — Main source code
- `index.html` — Entry HTML
- `vite.config.js` — Vite configuration

## License

MIT
