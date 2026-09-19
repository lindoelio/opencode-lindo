import { z } from "zod";

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
});
export type LindoOptions = z.infer<typeof LindoOptionsSchema>;

export function parseOptions(raw: unknown): LindoOptions {
  const parsed = LindoOptionsSchema.safeParse(raw ?? {});
  if (!parsed.success) throw new Error(`invalid lindo options: ${parsed.error.message}`);
  if (parsed.data.telemetry === true) {
    throw new Error("telemetry must remain false in v0.1");
  }
  return parsed.data;
}
