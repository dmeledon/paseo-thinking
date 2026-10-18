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
  provider: "claude",
}));

vi.mock("@getpaseo/plugin/client", () => ({
  useAgent: (_agentId: string, selector: (agent: unknown) => unknown) =>
    selector({ status: "running", provider: state.provider }),
  useRpc: () => async () => state.response,
}));
vi.mock("@getpaseo/plugin/client/react-native", () => ({
  Icon: () => null,
  ScrollView: "scroll",
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
  state.provider = "claude";
});

afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = undefined as unknown as ReactTestRenderer;
  query.clear();
});

describe("thinking renderer", () => {
  it("lets plain text grow up to the default maximum height", async () => {
    await render();
    const scroll = renderer.root.findByProps({
      testID: "thinking-text-scroll",
    });
    expect(scroll.props.style).toEqual({ maxHeight: 400 });
  });

  it("renders the revealed thinking trace as plain selectable text", async () => {
    await render({
      ...props,
      item: {
        ...props.item,
        data: { text: "## Plan\n\n**First step**", phase: "streaming" },
      },
    });
    const scroll = renderer.root.findByProps({
      testID: "thinking-text-scroll",
    });
    const content = scroll.findByType("text");
    expect(content.props.children).toBe("## Plan\n\n**First step**");
    expect(content.props.selectable).toBe(true);
  });

  it("shows Claude's token estimate beside Thinking while expanded or collapsed", async () => {
    await render();
    const header = renderer.root.findByProps({
      testID: "thinking-header-summary",
    });
    expect(header.children.join("")).toBe("~3 visible tokens");
    await act(async () => button().props.onPress());
    expect(
      renderer.root
        .findByProps({ testID: "thinking-header-summary" })
        .children.join(""),
    ).toBe("~3 visible tokens");
    expect(
      renderer.root.findAllByProps({ testID: "thinking-text-scroll" }),
    ).toHaveLength(0);
  });

  it("starts Codex collapsed and updates the latest bold summary as text arrives", async () => {
    state.provider = "codex";
    await render({
      ...props,
      item: {
        ...props.item,
        data: { text: "**Checking source**", phase: "streaming" },
      },
    });
    expect(button().props.accessibilityState.expanded).toBe(false);
    expect(
      renderer.root
        .findByProps({ testID: "thinking-header-summary" })
        .children.join(""),
    ).toBe("· Checking source");
    await render({
      ...props,
      item: {
        ...props.item,
        data: {
          text: "**Checking source****Removing plugin**",
          phase: "streaming",
        },
      },
    });
    expect(
      renderer.root
        .findByProps({ testID: "thinking-header-summary" })
        .children.join(""),
    ).toBe("· Removing plugin");
    await act(async () => button().props.onPress());
    expect(button().props.accessibilityState.expanded).toBe(true);
    expect(
      renderer.root
        .findByProps({ testID: "thinking-header-summary" })
        .children.join(""),
    ).toBe("· Removing plugin");
  });

  it("starts expanded and updates the visible-token estimate while streaming", async () => {
    await render();
    expect(button().props.accessibilityState.expanded).toBe(true);
    expect(button().props.accessibilityLabel).toContain("~3 visible tokens");
    await render({
      ...props,
      item: {
        ...props.item,
        data: { text: "hello world again", phase: "streaming" },
      },
    });
    expect(button().props.accessibilityLabel).toContain("~5 visible tokens");
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
