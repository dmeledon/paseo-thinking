# paseo-thinking

A Paseo plugin that estimates visible thinking tokens as they stream and collapses every thinking block after a successful turn. Blocks start expanded. Failed and interrupted turns do not auto-collapse. Blocks remain manually toggleable.

## Compatibility

Requires Paseo 0.11.4 or later, with plugins enabled. No core changes are needed. The plugin supplies its own thinking renderer and does not read Paseo's built-in thinking expansion preference.

## Install

Enable plugins in Paseo, then install this private Git repository using credentials available on the daemon machine:

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

## Behavior and limits

- Counts are explicitly approximate: displayed JavaScript string length divided by four, rounded up. They are not billable usage or hidden reasoning tokens.
- While a turn is active, mounted thinking rows poll outcomes once per second, sharing a query cache and in-flight requests. A successful outcome triggers a paginated read of its recorded thinking rows before they collapse.
- Turn IDs and recorded row timestamps identify the thinking belonging to a successful turn. Missing outcomes are never assumed to mean success.
- Providers must distinguish adjacent turns with different IDs; the plugin reads the latest contiguous group with the completed turn's ID.
- Outcome tracking is in memory, so reloads and daemon restarts leave unknown history expanded. Manual toggles survive scrolling during the client session.
- The plugin replaces thinking rows. Disable another plugin that claims reasoning rows, such as `inline-thinking`, before enabling this one.
- Client UI uses React Native primitives, theme colors, keyboard-accessible buttons, selectable text, and the host's streamed-text reveal hook.
- Styling follows Paseo's built-in thinking badge: compact header, brain/disclosure icon, attached bordered details, and normal body typography. Expanded text scrolls above a fixed counter footer; collapsed rows show the count in the header.
- During streaming, the detail area reserves the default 400-pixel maximum (368 pixels of scrollable text plus a 32-pixel counter footer), keeping the counter still as new lines arrive. Finished blocks shrink to their content. The plugin uses Paseo's default platform font stack; custom app typography settings are not exposed by the plugin API.

See [OVERVIEW.md](OVERVIEW.md) for the in-app description.
