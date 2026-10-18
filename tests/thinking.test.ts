import { describe, expect, it } from "vitest";
import { TurnTracker } from "../server/turns";
import {
  estimateTokens,
  expansionState,
  lastBoldText,
  thinkingKey,
} from "../shared/thinking";

describe("turn completion", () => {
  it("collapses all recorded thinking blocks only for successful turns", async () => {
    const turns = new TurnTracker();
    turns.start("a");
    await turns.end("a", "completed", async () => ["first", "second"]);
    expect(turns.read("a")).toEqual({
      active: false,
      successes: ["first", "second"],
    });
    expect(turns.read("b").successes).toEqual([]);
  });

  it.each(["failed", "canceled"] as const)(
    "does not record %s thinking, even after a later success",
    async (outcome) => {
      const turns = new TurnTracker();
      turns.start("a");
      await turns.end("a", outcome, async () => {
        throw new Error("must not fetch failed thinking");
      });
      turns.start("a");
      await turns.end("a", "completed", async () => ["later"]);
      expect(turns.read("a").successes).toEqual(["later"]);
    },
  );

  it("keeps polling during the history read and does not stop a newer running turn", async () => {
    const turns = new TurnTracker();
    let resolve: (value: string[]) => void = () => {};
    const pending = turns.end(
      "a",
      "completed",
      () =>
        new Promise<string[]>((done) => {
          resolve = done;
        }),
    );
    expect(turns.read("a").active).toBe(true);
    turns.start("a");
    resolve(["early"]);
    await pending;
    expect(turns.read("a")).toEqual({ active: true, successes: ["early"] });
    turns.close("a");
    expect(turns.read("a").active).toBe(false);
  });

  it("does not assume success when history cannot be read", async () => {
    const turns = new TurnTracker();
    await expect(
      turns.end("a", "completed", async () => {
        throw new Error("offline");
      }),
    ).rejects.toThrow("offline");
    expect(turns.read("a")).toEqual({ active: false, successes: [] });
  });
});

describe("thinking display", () => {
  it("uses the latest bold span as a Codex summary, including text still arriving", () => {
    expect(lastBoldText("plain text")).toBeNull();
    expect(lastBoldText("**First****Second**")).toBe("Second");
    expect(lastBoldText("**First** then **Second in progress")).toBe(
      "Second in progress",
    );
  });

  it("collapses on success even if opened while streaming, then permits reopening", () => {
    expect(expansionState(null, null, true)).toBe(true);
    expect(
      expansionState("done", { completion: null, expanded: true }, true),
    ).toBe(false);
    expect(
      expansionState("done", { completion: "done", expanded: true }, true),
    ).toBe(true);
    expect(
      expansionState(null, { completion: null, expanded: false }, true),
    ).toBe(false);
  });

  it("estimates accumulated visible text and handles empty text", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("hello world")).toBe(3);
    expect(estimateTokens("hello world again")).toBeGreaterThan(
      estimateTokens("hello world"),
    );
  });

  it("matches app-normalized text without confusing identical text in different rows", () => {
    expect(thinkingKey(100, "a\r\nb")).toBe(thinkingKey(100, "a\nb"));
    expect(thinkingKey(100, "\n   thinking")).toBe(
      thinkingKey(100, "thinking"),
    );
    expect(thinkingKey(100, "hello")).not.toBe(thinkingKey(200, "hello"));
    expect(thinkingKey(100, "hello")).not.toBe(thinkingKey(100, "world"));
  });
});
