import { z } from "zod";

export const AutonomySchema = z.object({
  /**
   * `yolo` (default): ALLOW is the baseline for external, destructive, and
   * production actions; the agent asks only when a user-registered guardrail
   * matches. `guarded`: the legacy opt-in behavior (ask before external,
   * destructive, or outside-slice actions).
   */
  mode: z.enum(["yolo", "guarded"]).default("yolo"),
  /**
   * User-declared guardrails: plain substrings or regular expressions matched
   * case-insensitively against `"<action> <resources>"`. A match elevates the
   * action to ASK. Empty by default — nothing is asked.
   */
  askBefore: z.array(z.string()).default([]),
});

export const LindoOptionsSchema = z.object({
  profile: z.enum(["public", "private"]).default("public"),
  strictEvidence: z.boolean().default(true),
  projectState: z.string().default(".lindo"),
  model: z
    .object({
      providerID: z.string().default("opencode"),
      modelID: z.string().default("muse-spark-1.3"),
      defaultVariant: z.string().default("high"),
    })
    .default({ providerID: "opencode", modelID: "muse-spark-1.3", defaultVariant: "high" }),
  telemetry: z.boolean().default(false),
  allowVariantFallback: z.boolean().default(false),
  autonomy: AutonomySchema.default({ mode: "yolo", askBefore: [] }),
});
export type LindoOptions = z.infer<typeof LindoOptionsSchema>;
export type AutonomyOptions = z.infer<typeof AutonomySchema>;

export function parseOptions(raw: unknown): LindoOptions {
  const parsed = LindoOptionsSchema.safeParse(raw ?? {});
  if (!parsed.success) throw new Error(`invalid lindo options: ${parsed.error.message}`);
  if (parsed.data.telemetry === true) {
    throw new Error("telemetry must remain false in v0.1");
  }
  return parsed.data;
}
