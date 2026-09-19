export const MODEL_PROFILE = {
  providerID: "opencode",
  modelID: "muse-spark-1.3",
  contextTokens: 1_048_576,
  maxOutputTokens: 131_072,
  variants: ["minimal", "low", "medium", "high", "xhigh", "max"] as const,
  requiredVariants: ["low", "medium", "high", "xhigh", "max"] as const,
} as const;

export type ReasoningVariant = (typeof MODEL_PROFILE.variants)[number];

export const ROLE_VARIANT: Record<string, ReasoningVariant> = {
  lindo: "high",
  "lindo/explorer": "low",
  "lindo/product": "high",
  "lindo/architect": "xhigh",
  "lindo/designer": "high",
  "lindo/builder": "medium",
  "lindo/verifier": "high",
  "lindo/security": "xhigh",
  "lindo/release": "high",
};

export function modelRef(role = "lindo", variantOverride?: ReasoningVariant): string {
  const variant = variantOverride ?? ROLE_VARIANT[role] ?? "high";
  return `${MODEL_PROFILE.providerID}/${MODEL_PROFILE.modelID}#${variant}`;
}

export function isSupportedVariant(v: string): v is ReasoningVariant {
  return (MODEL_PROFILE.variants as readonly string[]).includes(v);
}
