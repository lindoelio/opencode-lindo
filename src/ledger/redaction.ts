const KEY_NAME_PATTERNS: RegExp[] = [
  /api[_-]?key/i,
  /secret/i,
  /token/i,
  /password/i,
  /passwd/i,
  /authorization/i,
  /bearer/i,
  /private[_-]?key/i,
  /client[_-]?secret/i,
  /aws[_-]?secret/i,
  /github[_-]?token/i,
  /openai[_-]?key/i,
  /anthropic[_-]?key/i,
];

const VALUE_PATTERNS: RegExp[] = [
  /bearer\s+[A-Za-z0-9\-._~+/=]{10,}/gi,
  /sk-[A-Za-z0-9]{10,}/g,
  /gh[pousr]_[A-Za-z0-9]{10,}/g,
  /xox[bpas]-[A-Za-z0-9-]{8,}/gi,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
];

const HIGH_ENTROPY = /["']([A-Za-z0-9+/=]{32,})["']/g;

export const REDACTED = "[REDACTED]";

export function redactText(input: string): string {
  let out = input;
  for (const re of VALUE_PATTERNS) {
    out = out.replace(re, REDACTED);
  }
  out = out.replace(HIGH_ENTROPY, `"${REDACTED}"`);
  return out;
}

/** Redact key names in objects (deep) and string values. */
export function redactUnknown(value: unknown): unknown {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map(redactUnknown);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (KEY_NAME_PATTERNS.some((re) => re.test(k))) out[k] = REDACTED;
      else out[k] = redactUnknown(v);
    }
    return out;
  }
  return value;
}

export function containsSecret(value: unknown): boolean {
  const text = JSON.stringify(value ?? "");
  if (VALUE_PATTERNS.some((re) => { re.lastIndex = 0; return re.test(text); })) return true;
  return KEY_NAME_PATTERNS.some((re) => re.test(text));
}
