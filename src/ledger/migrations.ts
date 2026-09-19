/** Forward-only schema migrations with pre-upgrade backup. v0.1 supports v1 only. */
export const CURRENT_SCHEMA_VERSION = 1;

export function needsMigration(schemaVersion: number): boolean {
  return schemaVersion !== CURRENT_SCHEMA_VERSION;
}

export function migrateUnknown(state: unknown): unknown {
  const s = state as { schemaVersion?: number };
  if (!s || typeof s !== "object") throw new Error("unknown state layout");
  if (s.schemaVersion === 1) return state;
  throw new Error(`unsupported state schema: ${String(s.schemaVersion)} (backup required before upgrade)`);
}
