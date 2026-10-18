# paseo-thinking

A Paseo plugin that shows the latest bold thinking summary for Codex and an estimate of visible thinking tokens for Claude. Codex blocks start collapsed; Claude blocks start expanded. Successful turns collapse their thinking blocks. Blocks remain manually toggleable.

## Compatibility

Requires Paseo 0.11.4 or later, with plugins enabled. No core changes are needed. The plugin supplies its own thinking renderer and does not read Paseo's built-in thinking expansion preference.

## Install

Once this repository is public, enable plugins in Paseo and install it from GitHub:

```sh
paseo plugin install github:dmeledon/paseo-thinking
```

For local development:

```sh
npm ci
npm run typecheck
npm test
npm run lint
paseo plugin install /absolute/path/to/paseo-thinking
```

After editing source, run `paseo plugin reload thinking`. Do not restart the daemon to reload a plugin.

This repository is the distribution channel. The package is marked private because it is not published to npm.

## Behavior and limits

- Counts are explicitly approximate: displayed JavaScript string length divided by four, rounded up. They are not billable usage or hidden reasoning tokens.
- While a turn is active, mounted thinking rows poll outcomes once per second, sharing a query cache and in-flight requests. A successful outcome triggers a paginated read of its recorded thinking rows before they collapse.
- Turn IDs and recorded row timestamps identify the thinking belonging to a successful turn. Missing outcomes are never assumed to mean success.
- Providers must distinguish adjacent turns with different IDs; the plugin reads the latest contiguous group with the completed turn's ID.
- Outcome tracking is in memory. Reloads and daemon restarts leave unknown history at each provider's default expansion state. Manual toggles survive scrolling during the client session.
- A temporary timeline read error is retried before giving up. Success keys for the 100 most recently closed agents remain available to history views; older ones return to their provider's default expansion state.
- The plugin replaces thinking rows. Disable another plugin that claims reasoning rows, such as `inline-thinking`, before enabling this one.
- Client UI uses React Native primitives, theme colors, keyboard-accessible buttons, selectable text, and the host's streamed-text reveal hook.
- Styling follows Paseo's built-in thinking badge: compact header, brain/disclosure icon, attached bordered details, and normal body typography. Codex shows the latest text inside `**` beside Thinking; Claude shows the approximate token count there.
- Expanded thinking text is plain selectable text. The detail area grows with its text up to the default 400-pixel maximum, then scrolls inside that height. The plugin uses Paseo's default platform font stack; custom app typography settings are not exposed by the plugin API.

See [OVERVIEW.md](OVERVIEW.md) for the in-app description.
