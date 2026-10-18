export class TurnTracker {
  private active = new Set<string>();
  private pending = new Map<string, number>();
  private successes = new Map<string, Set<string>>();
  private closed = new Set<string>();
  private evictedPending = new Set<string>();

  private pruneClosed() {
    // Keep recent closed agents available to history views, without retaining every session.
    while (this.closed.size > 100) {
      const oldest = this.closed.keys().next().value;
      if (oldest === undefined) break;
      this.closed.delete(oldest);
      this.successes.delete(oldest);
      if (this.pending.has(oldest)) this.evictedPending.add(oldest);
    }
  }

  start(agentId: string) {
    this.closed.delete(agentId);
    this.evictedPending.delete(agentId);
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
      if (keys.length && !this.evictedPending.has(agentId)) {
        const successes = this.successes.get(agentId) ?? new Set<string>();
        for (const key of keys) successes.add(key);
        this.successes.set(agentId, successes);
      }
    } finally {
      const count = (this.pending.get(agentId) ?? 1) - 1;
      if (count) this.pending.set(agentId, count);
      else {
        this.pending.delete(agentId);
        this.evictedPending.delete(agentId);
      }
      this.pruneClosed();
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
    this.closed.delete(agentId);
    this.closed.add(agentId);
    this.pruneClosed();
  }
}
