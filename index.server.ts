import type { PluginServerContext } from "@getpaseo/plugin/server";
import { readTurnKeys } from "./server/read-turn";
import { TurnTracker } from "./server/turns";
import { getTurns } from "./shared/turns";

export default function contribute(server: PluginServerContext) {
  const turns = new TurnTracker();
  server.on("agent.turn_started", ({ agent }) => turns.start(agent.id));
  server.on(
    "agent.turn_ended",
    async ({ agent, turnId, outcome }, { paseo }) => {
      await turns.end(agent.id, outcome.kind, () =>
        turnId
          ? readTurnKeys(paseo.agents.ref(agent.id).timeline, turnId)
          : Promise.resolve([]),
      );
    },
  );
  server.on("agent.closed", ({ agent }) => turns.close(agent.id));
  server.handle(getTurns, ({ agentId }) => turns.read(agentId));
  return () => {};
}
