# Thinking

See a running estimate of the visible tokens in each thinking block. Blocks start expanded. When a turn succeeds, all its thinking blocks collapse. Interrupted and failed turns keep their current expansion state. You can toggle each block afterward.

The rows follow Paseo's standard thinking layout. When expanded, the counter stays in a footer below the scrollable text. When collapsed, it sits beside the Thinking label.

The estimate uses one token per four text characters. It measures displayed text, which can be a summary, and is not the model's actual reasoning-token usage. Accuracy varies by language and content.

Requires Paseo 0.11.4 or later. The plugin provides its own thinking rows and does not read Paseo's built-in thinking expansion preference.

The daemon component observes turn outcomes and reads thinking rows from Paseo's timeline to identify successful turns. It keeps that information in memory, makes no external requests, and reads no files. Older turns whose completion the plugin did not observe remain expanded. Reloading the plugin or restarting the daemon clears remembered outcomes.
