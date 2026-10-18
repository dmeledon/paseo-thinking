import type { PluginTimelineItemProps } from "@getpaseo/plugin/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualExpansions } from "../client/expansion";
import { Thinking } from "../client/thinking";
import { thinkingKey } from "../shared/thinking";

const state = vi.hoisted(() => ({
  response: { active: true, successes: [] as string[] },
}));

vi.mock("@getpaseo/plugin/client", () => ({
  useAgent: () => "running",
  useRpc: () => async () => state.response,
}));
vi.mock("@getpaseo/plugin/client/react-native", () => ({
  Icon: () => null,
  useRevealedText: (text: string) => text,
}));
vi.mock("react-native", () => ({
  Pressable: "button",
  Text: "text",
  View: "view",
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const theme = {
  colors: {
    surface0: "#111111",
    surface1: "#222222",
    surface2: "#333333",
    border: "#444444",
    foreground: "#ffffff",
    foregroundMuted: "#aaaaaa",
    accent: "#00aaff",
    accentForeground: "#ffffff",
    statusSuccess: "#00ff00",
    statusWarning: "#ffff00",
    statusDanger: "#ff0000",
  },
};

const props: PluginTimelineItemProps<{
  text: string;
  phase: "streaming" | "complete";
}> = {
  agentId: "a",
  host: { id: "host", label: "Local" },
  layout: { compact: true, platform: "ios" },
  theme,
  timestamp: new Date(150),
  item: {
    type: "plugin",
    kind: "thinking",
    version: 1,
    data: { text: "hello world", phase: "streaming" },
  },
};

let renderer: ReactTestRenderer;
let query: QueryClient;

async function render(next = props) {
  await act(async () => {
    const element = (
      <QueryClientProvider client={query}>
        <Thinking {...next} />
      </QueryClientProvider>
    );
    if (renderer) renderer.update(element);
    else renderer = create(element);
  });
}

function button() {
  return renderer.root.findByType("button");
}

async function refresh() {
  await act(async () => {
    await query.invalidateQueries({ queryKey: ["thinking.turns"] });
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
}

beforeEach(() => {
  manualExpansions.clear();
  query = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  state.response = { active: true, successes: [] };
});

afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = undefined as unknown as ReactTestRenderer;
  query.clear();
});

describe("thinking renderer", () => {
  it("starts expanded and updates the visible-token estimate while streaming", async () => {
    await render();
    expect(button().props.accessibilityState.expanded).toBe(true);
    expect(button().props.accessibilityLabel).toContain(
      "approximately 3 visible tokens",
    );
    await render({
      ...props,
      item: {
        ...props.item,
        data: { text: "hello world again", phase: "streaming" },
      },
    });
    expect(button().props.accessibilityLabel).toContain(
      "approximately 5 visible tokens",
    );
  });

  it("stays open when a thinking block ends for a tool call, then collapses on turn success", async () => {
    await render({
      ...props,
      item: { ...props.item, data: { ...props.item.data, phase: "complete" } },
    });
    expect(button().props.accessibilityState.expanded).toBe(true);
    state.response = {
      active: false,
      successes: [thinkingKey(150, "hello world")],
    };
    await refresh();
    expect(button().props.accessibilityState.expanded).toBe(false);
    await act(async () => button().props.onPress());
    expect(button().props.accessibilityState.expanded).toBe(true);
  });

  it("keeps thinking open after a failed or interrupted turn and after an unrelated success", async () => {
    await render();
    state.response = { active: false, successes: [] };
    await refresh();
    expect(button().props.accessibilityState.expanded).toBe(true);
    state.response = {
      active: false,
      successes: [thinkingKey(350, "other thought")],
    };
    await refresh();
    expect(button().props.accessibilityState.expanded).toBe(true);
  });

  it("preserves manual reopening when the host virtualizes a successful row", async () => {
    state.response = {
      active: false,
      successes: [thinkingKey(150, "hello world")],
    };
    await render();
    await refresh();
    expect(button().props.accessibilityState.expanded).toBe(false);
    await act(async () => button().props.onPress());
    await act(async () => renderer.unmount());
    renderer = undefined as unknown as ReactTestRenderer;
    await render();
    expect(button().props.accessibilityState.expanded).toBe(true);
  });
});
