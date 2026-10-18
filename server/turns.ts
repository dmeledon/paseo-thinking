type AgentTurns = {
  active: boolean;
  pending: number;
  successes: Set<string>;
};

export class TurnTracker {
  private agents = new Map<string, AgentTurns>();
  private closed = new Set<string>();

  private state(agentId: string): AgentTurns {
    let state = this.agents.get(agentId);
    if (!state) {
      state = { active: false, pending: 0, successes: new Set() };
      this.agents.set(agentId, state);
    }
    return state;
  }

  start(agentId: string) {
    this.closed.delete(agentId);
    this.state(agentId).active = true;
  }

  async end(
    agentId: string,
    outcome: "completed" | "failed" | "canceled",
    readKeys: () => Promise<string[]>,
  ) {
    const state = this.state(agentId);
    state.active = false;
    if (outcome !== "completed") return;
    state.pending++;
    try {
      const keys = await readKeys();
      // An evicted agent's late history read must not restore its result.
      if (this.agents.get(agentId) === state)
        for (const key of keys) state.successes.add(key);
    } finally {
      state.pending--;
    }
  }

  read(agentId: string) {
    const state = this.agents.get(agentId);
    return {
      active: Boolean(state?.active || state?.pending),
      successes: [...(state?.successes ?? [])],
    };
  }

  close(agentId: string) {
    const state = this.agents.get(agentId);
    if (!state) return;
    state.active = false;
    this.closed.delete(agentId);
    this.closed.add(agentId);
    if (this.closed.size > 100) {
      const oldest = this.closed.values().next().value;
      if (oldest !== undefined) {
        this.closed.delete(oldest);
        this.agents.delete(oldest);
      }
    }
  }
}
