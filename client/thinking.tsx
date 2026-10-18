import {
  type PluginTimelineItemProps,
  useAgent,
  useRpc,
} from "@getpaseo/plugin/client";
import { Icon, useRevealedText } from "@getpaseo/plugin/client/react-native";
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
  const text = useRevealedText(item.data.text, item.data.phase);
  const tokens = useMemo(
    () => estimateTokens(item.data.text),
    [item.data.text],
  );
  const color = theme.colors.foregroundMuted;

  return (
    <View style={{ paddingVertical: 6, gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? "Collapse" : "Expand"} thinking, approximately ${tokens.toLocaleString()} visible tokens`}
        accessibilityState={{ expanded }}
        onPress={() => setManual({ completion, expanded: !expanded })}
        style={({ pressed }) => ({
          flexDirection: "row",
          flexWrap: "wrap",
          minHeight: 44,
          alignItems: "center",
          gap: 6,
          paddingVertical: 6,
          opacity: pressed ? 0.65 : 1,
        })}
      >
        <Icon
          name={expanded ? "ChevronDown" : "ChevronRight"}
          size={14}
          color={color}
        />
        <Text style={{ color, fontSize: 13 }}>
          Thinking{item.data.phase === "streaming" ? "…" : ""}
        </Text>
        <Text style={{ color, fontSize: 12 }}>
          · ~{tokens.toLocaleString()} visible tokens
        </Text>
      </Pressable>
      {expanded ? (
        <Text
          selectable
          style={{ color, fontSize: 13, lineHeight: 20, paddingLeft: 20 }}
        >
          {text}
        </Text>
      ) : null}
    </View>
  );
}
