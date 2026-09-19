import { createHash, randomUUID } from "node:crypto";

export function sha256Hex(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hashEventPayload(canonical: string, previousHash: string): string {
  return sha256Hex(`${previousHash}\n${canonical}`);
}

export function newId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export function shortHash(input: string, length = 16): string {
  return sha256Hex(input).slice(0, length);
}
