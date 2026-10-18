import {
  type PluginTimelineItemProps,
  useAgent,
  useRpc,
} from "@getpaseo/plugin/client";
import {
  Icon,
  ScrollView,
  useRevealedText,
} from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type ScrollView as NativeScrollView,
  Pressable,
  Text,
  View,
} from "react-native";
import { z } from "zod";
import {
  estimateTokens,
  expansionState,
  lastBoldText,
  type ManualExpansion,
  thinkingKey,
} from "../shared/thinking";
import { getTurns } from "../shared/turns";
import { manualExpansions } from "./expansion";

export const thinkingSchema = z.object({
  text: z.string(),
  phase: z.enum(["streaming", "complete"]),
});

type Props = PluginTimelineItemProps<z.output<typeof thinkingSchema>>;

export function Thinking({
  agentId,
  host,
  item,
  theme,
  timestamp,
  layout,
}: Props) {
  const readTurns = useRpc(getTurns);
  const status = useAgent(agentId, (agent) => agent.status);
  const provider = useAgent(agentId, (agent) => agent.provider);
  const turns = useQuery({
    queryKey: ["thinking.turns", host.id, agentId],
    queryFn: () => readTurns({ agentId }),
    refetchInterval: (query) => (query.state.data?.active ? 1000 : false),
  });
  const { refetch } = turns;
  useEffect(() => {
    if (status) void refetch({ cancelRefetch: false });
  }, [status, refetch]);
  const key = useMemo(
    () => thinkingKey(timestamp.getTime(), item.data.text),
    [timestamp, item.data.text],
  );
  const completion = turns.data?.successes.includes(key) ? key : null;
  const stateKey = JSON.stringify([host.id, agentId, timestamp.getTime()]);
  const [manualOverride, setManualOverride] = useState<{
    stateKey: string;
    value: ManualExpansion;
  } | null>(null);
  const manual =
    manualOverride?.stateKey === stateKey
      ? manualOverride.value
      : (manualExpansions.get(stateKey) ?? null);
  const expanded = expansionState(completion, manual, provider !== "codex");
  const [hovered, setHovered] = useState(false);
  const scrollRef = useRef<NativeScrollView>(null);
  const scrollPosition = useRef({
    row: stateKey,
    following: true,
    offset: 0,
    target: null as number | null,
    viewport: 400,
    streamed: false,
  });
  useEffect(() => {
    if (scrollPosition.current.row !== stateKey)
      scrollPosition.current = {
        row: stateKey,
        following: true,
        offset: 0,
        target: null,
        viewport: 400,
        streamed: false,
      };
    else if (expanded) {
      scrollPosition.current.offset = 0;
      scrollPosition.current.target = null;
    }
  }, [stateKey, expanded]);
  const text = useRevealedText(item.data.text, item.data.phase);
  const tokens = estimateTokens(item.data.text);
  const color = theme.colors.foregroundMuted;
  const activeColor = expanded || hovered ? theme.colors.foreground : color;
  const count = `~${tokens.toLocaleString()} visible tokens`;
  const summary = provider === "codex" ? lastBoldText(item.data.text) : count;
  const fontFamily =
    layout.platform === "web"
      ? "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      : layout.platform === "ios"
        ? "system-ui"
        : "normal";
  return (
    <View style={{ marginHorizontal: -13, marginBottom: 4 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? "Collapse" : "Expand"} thinking${summary ? `, ${summary}` : ""}`}
        accessibilityState={{ expanded }}
        onPress={() => {
          const value = { completion, expanded: !expanded };
          manualExpansions.set(stateKey, value);
          setManualOverride({ stateKey, value });
        }}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        hitSlop={{ top: 7, bottom: 7 }}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: expanded ? theme.colors.border : "transparent",
          borderBottomLeftRadius: expanded ? 0 : 8,
          borderBottomRightRadius: expanded ? 0 : 8,
          backgroundColor: expanded ? theme.colors.surface1 : "transparent",
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <View
          style={{
            width: 22,
            height: 22,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 4,
          }}
        >
          <View
            style={
              expanded || hovered
                ? {
                    marginLeft: -4,
                    transform: [
                      { scale: 1.3 },
                      { rotate: expanded ? "90deg" : "0deg" },
                    ],
                  }
                : { marginLeft: -1 }
            }
          >
            <Icon
              name={expanded || hovered ? "ChevronRight" : "Brain"}
              size={12}
              color={activeColor}
            />
          </View>
        </View>
        <Text
          style={{
            color: activeColor,
            fontFamily,
            fontSize: 14,
            opacity: item.data.phase === "streaming" ? 0.72 : 1,
          }}
        >
          Thinking
        </Text>
        {summary ? (
          <Text
            testID="thinking-header-summary"
            numberOfLines={1}
            style={{
              color,
              fontFamily,
              fontSize: 14,
              marginLeft: 8,
              flexShrink: 1,
              ...(provider === "codex"
                ? {}
                : { fontVariant: ["tabular-nums"] }),
            }}
          >
            {provider === "codex" ? "· " : ""}
            {summary}
          </Text>
        ) : null}
      </Pressable>
      {expanded ? (
        <View
          style={{
            borderWidth: 1,
            borderTopWidth: 0,
            borderColor: theme.colors.border,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            overflow: "hidden",
            backgroundColor: theme.colors.surface2,
          }}
        >
          <ScrollView
            ref={scrollRef}
            testID="thinking-text-scroll"
            style={{ maxHeight: 400 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            scrollEventThrottle={16}
            onLayout={(event) => {
              scrollPosition.current.viewport = event.nativeEvent.layout.height;
            }}
            onScroll={(event) => {
              const { contentOffset, contentSize, layoutMeasurement } =
                event.nativeEvent;
              const position = scrollPosition.current;
              const offset = contentOffset.y;
              const remaining =
                contentSize.height - layoutMeasurement.height - offset;
              position.viewport = layoutMeasurement.height;
              if (remaining <= 16) {
                position.following = true;
                position.target = null;
              } else if (
                offset < position.offset - 0.5 ||
                (position.target !== null &&
                  offset < position.target - 0.5 &&
                  offset > position.offset + 0.5)
              )
                position.following = false;
              position.offset = offset;
            }}
            onContentSizeChange={(_width, height) => {
              const position = scrollPosition.current;
              if (item.data.phase === "streaming") position.streamed = true;
              const followFinal =
                item.data.phase === "complete" && position.streamed;
              if (followFinal && height > 400) position.streamed = false;
              if (
                (item.data.phase === "streaming" || followFinal) &&
                height > 400 &&
                position.following
              ) {
                position.target = Math.max(0, height - position.viewport);
                scrollRef.current?.scrollToEnd({ animated: false });
              }
            }}
          >
            <Text
              selectable
              style={{
                color: theme.colors.foreground,
                fontFamily,
                fontSize: 14,
                lineHeight: 22,
                padding: 12,
              }}
            >
              {text}
            </Text>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
