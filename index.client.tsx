import type { PluginClientContext } from "@getpaseo/plugin/client";
import { Thinking, thinkingSchema } from "./client/thinking";

export default function contribute(client: PluginClientContext) {
  client.addTimelineTransformer({
    id: "thinking",
    query: { itemType: "reasoning" },
    transform: ({ item, phase }) => ({
      items: [
        {
          type: "plugin",
          kind: "thinking",
          version: 1,
          data: { text: item.text, phase },
        },
      ],
    }),
  });
  client.addTimelineRenderer({
    kind: "thinking",
    version: 1,
    schema: thinkingSchema,
    Component: Thinking,
  });
  return () => {};
}
