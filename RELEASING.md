# Releasing Thinking

The plugin ID is `thinking`. The GitHub source is `dmeledon/paseo-thinking`, and the npm package is `paseo-thinking`. Keep the version in `package.json` aligned between GitHub and npm; increment it for each public update.

## Prepare the release

1. Review the source and Git history before making the repository public.
2. Run `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`, and `npm pack --dry-run --ignore-scripts`.
3. Confirm the package contains `paseo-plugin.json`, both runtime entries, `client/`, `server/`, `shared/`, `OVERVIEW.md`, `LICENSE`, and `images/codex-rows.png`.
4. Commit the release files and push them. Make the GitHub repository public, then tag the released commit `v0.1.0`.
5. Sign in to npm and run `npm publish --access public`. Confirm that npm reports `paseo-thinking@0.1.0` and that its manifest ID is `thinking`.
6. Install that exact npm release on a test Paseo daemon under a temporary installation ID, confirm it is running, and exercise Codex and Claude thinking rows.

## Submit the listings

- [Paseo plugin registry submission](https://github.com/getpaseo/plugins/issues/new?template=submit-plugin.yml): use the public GitHub repository or exact npm release as the source, choose Productivity, and provide the declared interface image if requested.
- [Paseo Café submission](https://paseo.cafe/submit/): registry ID `thinking`, repository `dmeledon/paseo-thinking`, npm package `paseo-thinking`, category Productivity, no platform restriction. Mention that token counts are estimates and that another reasoning-row renderer must be disabled.

The Paseo registry reviews and pins an artifact. Paseo Café is an independent community directory with its own intake checks. Submit only after the GitHub repository and npm package are both public.
