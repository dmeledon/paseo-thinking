export function estimateTokens(text: string): number {
  // A display estimate, not a tokenizer or a measure of hidden reasoning.
  return Math.ceil(text.length / 4);
}

export function lastBoldText(text: string): string | null {
  let latest: string | null = null;
  let end = 0;
  for (const match of text.matchAll(/\*\*([\s\S]*?)\*\*/g)) {
    const value = match[1]?.trim();
    if (value) latest = value;
    end = (match.index ?? 0) + match[0].length;
  }
  const open = text.indexOf("**", end);
  if (open !== -1) {
    const value = text.slice(open + 2).trim();
    if (value) latest = value;
  }
  return latest;
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
