# pkg-health

Check if your npm, PyPI, Cargo, Composer, RubyGems, or NuGet packages are still maintained — using live data pulled directly from the registries. No API key. No cost. No guessing.

**Live:** [gavinbarbatruder.github.io/pkg-health](https://gavinbarbatruder.github.io/pkg-health)

This is an open source project licensed under MIT. Anyone can use it, fork it, modify it, or self-host it — see [LICENSE](./LICENSE) for the full terms.

## What it checks

- Maintenance status (active, minimal, abandoned)
- Days since last release
- Weekly download counts
- Release history
- Deprecation or yanked status
- Links to registry page and repository

## Features

- Batch checking — paste multiple packages, one per line
- Shareable URLs — every result has a link you can send to someone else
- Six ecosystems — npm, PyPI, Cargo, Composer, RubyGems, NuGet
- CLI — `npx pkg-health <package>` from your terminal

## How the score works

The health score (0–100) is calculated from real registry data:

- Starts at 100
- Penalizes for deprecation, long gaps since last release, no repository link
- Reflects actual package activity, not guesses

The full scoring logic is in [`src/score.js`](./src/score.js) — readable, no black box.

## Architecture

```
pkg-health/              the website (vanilla HTML/CSS/JS)
pkg-health-cli/           the npm CLI package
pkg-health-worker/        Cloudflare Worker that proxies registry requests with CORS headers
```

The website calls a small Cloudflare Worker (free tier, see `pkg-health-worker/`) which fetches from the registries server-side and returns the data with proper CORS headers. This avoids relying on third-party CORS proxies.

## Run it yourself

```bash
git clone https://github.com/gavinbarbatruder/pkg-health
cd pkg-health
```

Deploy your own worker (see `pkg-health-worker/README.md`), update `WORKER_URL` in `src/fetch.js`, then push to GitHub Pages or any static host.

## Contributing

Issues and pull requests are welcome. The codebase is plain HTML/CSS/JS with no build step, so it's easy to jump into.

## License

MIT — see [LICENSE](./LICENSE)
