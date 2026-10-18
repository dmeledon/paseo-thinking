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
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { z } from "zod";
import {
  estimateTokens,
  expansionState,
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

export function Thinking({ agentId, host, item, theme, timestamp }: Props) {
  const readTurns = useRpc(getTurns);
  const status = useAgent(agentId, (agent) => agent.status);
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
  const stateKey = JSON.stringify([host.id, agentId, key]);
  const [manual, setManual] = useState<ManualExpansion | null>(
    () => manualExpansions.get(stateKey) ?? null,
  );
  useEffect(() => {
    if (manual) manualExpansions.set(stateKey, manual);
  }, [stateKey, manual]);
  const expanded = expansionState(completion, manual, true);
  const [hovered, setHovered] = useState(false);
  const text = useRevealedText(item.data.text, item.data.phase);
  const tokens = useMemo(
    () => estimateTokens(item.data.text),
    [item.data.text],
  );
  const color = theme.colors.foregroundMuted;
  const activeColor = expanded || hovered ? theme.colors.foreground : color;
  const count = `~${tokens.toLocaleString()} visible tokens`;

  return (
    <View style={{ marginHorizontal: -13, marginBottom: 4 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? "Collapse" : "Expand"} thinking, approximately ${tokens.toLocaleString()} visible tokens`}
        accessibilityState={{ expanded }}
        onPress={() => setManual({ completion, expanded: !expanded })}
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
          <Icon
            name={expanded ? "ChevronDown" : hovered ? "ChevronRight" : "Brain"}
            size={14}
            color={activeColor}
          />
        </View>
        <Text
          style={{
            color: activeColor,
            fontSize: 14,
            opacity: item.data.phase === "streaming" ? 0.72 : 1,
          }}
        >
          Thinking
        </Text>
        {!expanded ? (
          <Text
            testID="thinking-counter-summary"
            numberOfLines={1}
            style={{ color, fontSize: 14, marginLeft: 8, flexShrink: 1 }}
          >
            {count}
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
          }}
        >
          <ScrollView
            testID="thinking-text-scroll"
            style={{ maxHeight: 400 }}
            contentContainerStyle={{ padding: 16 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            <Text
              selectable
              style={{
                color: theme.colors.foreground,
                fontSize: 14,
                lineHeight: 22,
              }}
            >
              {text}
            </Text>
          </ScrollView>
          <Text
            testID="thinking-counter-footer"
            style={{
              color,
              fontSize: 12,
              textAlign: "right",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.surface1,
            }}
          >
            {count}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
