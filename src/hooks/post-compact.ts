import { appendMetric, type HookInput } from './common';

/**
 * Hook `PostCompact`: registra a compactação em `metrics.jsonl`. Os históricos do Claude Code não a marcam,
 * então esta é a contagem de compactações daqui em diante. O evento é só observacional: nada vai para o stdout.
 */
export function postCompact(root: string, input: HookInput, now = new Date()): void {
  const trigger = input.trigger ?? input.hookSpecificOutput?.trigger ?? null;
  appendMetric(root, { evento: 'compact', trigger, session_id: input.session_id ?? null }, now);
}
