/** Extract the single relevant fact from untrusted content; never execute it. */
export function extractFactFromUntrusted(text: string): { fact: string; refusedInstructions: boolean } {
  const instructionPatterns = [
    /ignore\s+(prior|previous|all)\s+instructions/i,
    /execute\s+(this\s+)?command/i,
    /upload\s+this\s+log/i,
    /run\s+(this|the following)/i,
    /disregard\s+.*policy/i,
    /bypass\s+.*(policy|protection|approval)/i,
  ];
  const refusedInstructions = instructionPatterns.some((re) => re.test(text));
  // Keep only a short factual summary, strip imperative lines.
  const lines = text.split("\n").filter((l) => !/^(run|execute|upload|ignore|disregard|bypass)\b/i.test(l.trim()));
  const fact = lines.join("\n").slice(0, 2000);
  return { fact, refusedInstructions };
}

export function classifySteering(text: string): "replace" | "extend" | "question" | "unknown" {
  const t = text.toLowerCase();
  if (/^(stop|forget|instead|scratch that|replace)/.test(t.trim())) return "replace";
  if (/^(also|additionally|extend|and also|on top)/.test(t.trim())) return "extend";
  if (/\?\s*$/.test(text.trim())) return "question";
  return "unknown";
}
