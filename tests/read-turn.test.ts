import { describe, expect, it } from "vitest";
import { readTurnKeys } from "../server/read-turn";
import { thinkingKey } from "../shared/thinking";

type Timeline = Parameters<typeof readTurnKeys>[0];
type Page = Awaited<ReturnType<Timeline["refetch"]>>;
type Entry = Page["entries"][number];

function row(turnId: string, text: string, timestamp: number): Entry {
  return {
    provider: "claude",
    turnId,
    item: { type: "reasoning", text },
    timestamp: new Date(timestamp).toISOString(),
    seqStart: timestamp,
    seqEnd: timestamp,
    sourceSeqRanges: [{ startSeq: timestamp, endSeq: timestamp }],
    collapsed: [],
  };
}

function page(entries: Entry[], hasOlder = false): Page {
  return {
    requestId: "request",
    agentId: "agent",
    agent: null,
    direction: "tail",
    projection: "projected",
    epoch: "epoch",
    reset: false,
    staleCursor: false,
    gap: false,
    window: { minSeq: 0, maxSeq: 100, nextSeq: 101 },
    startCursor: { epoch: "epoch", seq: entries[0]?.seqStart ?? 0 },
    endCursor: null,
    hasOlder,
    hasNewer: false,
    entries,
    error: null,
  };
}

describe("authoritative turn history", () => {
  it("finds early reasoning and excludes a later failed turn regardless of callback arrival time", async () => {
    const history = page([
      row("success", "early", 10),
      row("success", "later", 20),
      row("failed-next", "failed", 30),
    ]);
    const keys = await readTurnKeys(
      { refetch: async () => history },
      "success",
    );
    expect(keys).toEqual([thinkingKey(20, "later"), thinkingKey(10, "early")]);
    expect(keys).not.toContain(thinkingKey(30, "failed"));
  });

  it("reads all thinking blocks across pages without including an earlier turn", async () => {
    const pages = [
      page([row("success", "second", 20)], true),
      page([row("older", "old", 5), row("success", "first", 10)]),
    ];
    const timeline: Timeline = {
      refetch: async () => {
        const next = pages.shift();
        if (!next) throw new Error("unexpected extra page");
        return next;
      },
    };
    expect(await readTurnKeys(timeline, "success")).toEqual([
      thinkingKey(20, "second"),
      thinkingKey(10, "first"),
    ]);
  });

  it("includes thinking before and after a steering prompt in the same turn", async () => {
    const prompt = {
      ...row("repeated", "", 15),
      item: { type: "user_message" as const, text: "new prompt" },
    };
    const history = page([
      row("repeated", "before steering", 10),
      prompt,
      row("repeated", "new successful thinking", 20),
    ]);
    expect(
      await readTurnKeys({ refetch: async () => history }, "repeated"),
    ).toEqual([
      thinkingKey(20, "new successful thinking"),
      thinkingKey(10, "before steering"),
    ]);
  });

  it("refuses incomplete history instead of guessing a successful row", async () => {
    const history = { ...page([row("success", "thought", 10)]), gap: true };
    await expect(
      readTurnKeys({ refetch: async () => history }, "success"),
    ).rejects.toThrow("history changed");
  });
});
