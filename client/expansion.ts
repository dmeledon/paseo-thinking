import type { ManualExpansion } from "../shared/thinking";

// Rows unmount during scrolling; retain explicit toggles for this client session.
export const manualExpansions = new Map<string, ManualExpansion>();
