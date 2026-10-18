import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import { thinkingKey } from "../shared/thinking";

type Timeline = Pick<
  ReturnType<PluginHandlerContext["paseo"]["agents"]["ref"]>["timeline"],
  "refetch"
>;

export async function readTurnKeys(
  timeline: Timeline,
  turnId: string,
): Promise<string[]> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await readTurnKeysOnce(timeline, turnId);
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }
}

async function readTurnKeysOnce(
  timeline: Timeline,
  turnId: string,
): Promise<string[]> {
  let page = await timeline.refetch({ projection: "projected", limit: 200 });
  const keys: string[] = [];
  let found = false;
  while (true) {
    if (page.error || page.gap || page.staleCursor)
      throw new Error(
        page.error ?? "Thinking history changed while reading turn",
      );
    for (let index = page.entries.length - 1; index >= 0; index--) {
      const entry = page.entries[index];
      if (entry.turnId !== turnId) {
        if (found) return keys;
        continue;
      }
      found = true;
      if (entry.item.type === "reasoning")
        keys.push(thinkingKey(Date.parse(entry.timestamp), entry.item.text));
    }
    if (!page.hasOlder || !page.startCursor) return keys;
    page = await timeline.refetch({
      projection: "projected",
      limit: 200,
      direction: "before",
      cursor: page.startCursor,
    });
  }
}
