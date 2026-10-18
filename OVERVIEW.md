# Thinking

Thinking shows Codex's latest bold summary beside a collapsed thinking row. Claude rows start expanded and show an approximate count of visible thinking tokens. Successful turns collapse their thinking rows; you can open or close any row yourself.

Expanded text is plain and selectable. The row grows to Paseo's default maximum height, then scrolls within that space. It follows new text while you stay at the bottom and lets you read earlier text without snapping back.

## Setup

Requires Paseo 0.11.4 or later with plugins enabled. No account, token, external tool, or operating-system-specific setup is required. See the README for installation instructions. Disable another plugin that replaces reasoning rows before enabling this one.

## Data access and limits

The plugin reads thinking rows, agent status, provider type, and turn outcomes through Paseo. Its daemon component keeps recent successful-turn results in memory. It makes no external requests, reads no local files, and does not send thinking text to another service. Reloading the plugin or restarting the daemon clears remembered outcomes.

Claude's token count is an estimate based on displayed text length, not the model's reasoning-token usage. It may count a summary rather than full reasoning. The plugin does not use Paseo's built-in thinking expansion preference.
