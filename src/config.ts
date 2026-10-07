import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Configuração do projeto, versionada em `.dev/config.json`. O arquivo é opcional. */
export interface Config {
  /** O hook `Stop` roda o `verify` da fase ativa quando os arquivos dela mudam. */
  verifyOnStop: boolean;
}

export const CONFIG_FILE = '.dev/config.json';

export const DEFAULT_CONFIG: Readonly<Config> = { verifyOnStop: true };

/**
 * Lê `.dev/config.json` sobre os padrões. Arquivo ausente, JSON inválido ou campo de tipo errado
 * caem no padrão: uma configuração quebrada nunca desliga a verificação em silêncio.
 */
export function readConfig(root: string): Config {
  const config: Config = { ...DEFAULT_CONFIG };
  const file = join(root, CONFIG_FILE);
  if (!existsSync(file)) return config;
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return config;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return config;
  const { verifyOnStop } = data as Record<string, unknown>;
  if (typeof verifyOnStop === 'boolean') config.verifyOnStop = verifyOnStop;
  return config;
}
