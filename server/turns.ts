export class TurnTracker {
  private active = new Set<string>();
  private pending = new Map<string, number>();
  private successes = new Map<string, Set<string>>();

  start(agentId: string) {
    this.active.add(agentId);
  }

  async end(
    agentId: string,
    outcome: "completed" | "failed" | "canceled",
    readKeys: () => Promise<string[]>,
  ) {
    this.active.delete(agentId);
    if (outcome !== "completed") return;
    this.pending.set(agentId, (this.pending.get(agentId) ?? 0) + 1);
    try {
      const keys = await readKeys();
      const successes = this.successes.get(agentId) ?? new Set<string>();
      for (const key of keys) successes.add(key);
      this.successes.set(agentId, successes);
    } finally {
      const count = (this.pending.get(agentId) ?? 1) - 1;
      if (count) this.pending.set(agentId, count);
      else this.pending.delete(agentId);
    }
  }

  read(agentId: string) {
    return {
      active: this.active.has(agentId) || this.pending.has(agentId),
      successes: [...(this.successes.get(agentId) ?? [])],
    };
  }

  close(agentId: string) {
    this.active.delete(agentId);
  }
}
