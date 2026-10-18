export function estimateTokens(text: string): number {
  // A display estimate, not a tokenizer or a measure of hidden reasoning.
  return Math.ceil(text.length / 4);
}

export function thinkingKey(timestamp: number, text: string): string {
  let first = 2166136261;
  let second = 5381;
  for (const character of text.replace(/\r/g, "").trimStart()) {
    const code = character.codePointAt(0) ?? 0;
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second, 33) ^ code;
  }
  return `${timestamp}:${first >>> 0}:${second >>> 0}`;
}

export type ManualExpansion = { completion: string | null; expanded: boolean };

export function expansionState(
  completion: string | null,
  manual: ManualExpansion | null,
  defaultExpanded: boolean,
): boolean {
  if (manual && manual.completion === completion) return manual.expanded;
  return completion === null && defaultExpanded;
}
