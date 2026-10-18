# Thinking

Codex thinking blocks start collapsed and show the latest text inside `**` beside Thinking. Claude blocks start expanded and show a running estimate of visible tokens beside Thinking. When a turn succeeds, its thinking blocks collapse. You can toggle each block afterward.

The rows follow Paseo's standard thinking layout. Expanded text is plain selectable text and grows up to the default maximum height, then scrolls inside the block.

The Claude estimate uses one token per four text characters. It measures displayed text, which can be a summary, and is not the model's actual reasoning-token usage. Accuracy varies by language and content.

Requires Paseo 0.11.4 or later. The plugin provides its own thinking rows and does not read Paseo's built-in thinking expansion preference.

The daemon component observes turn outcomes and reads thinking rows from Paseo's timeline to identify successful turns. It keeps that information in memory, makes no external requests, and reads no files. Older turns whose completion the plugin did not observe use their provider's default expansion state. Reloading the plugin or restarting the daemon clears remembered outcomes.
