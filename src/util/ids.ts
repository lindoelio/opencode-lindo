import { randomUUID } from "node:crypto";

const counters = new Map<string, number>();

export function nextSequenceKey(scope: string): number {
  const current = counters.get(scope) ?? 0;
  counters.set(scope, current + 1);
  return current + 1;
}

export function engagementId(): string {
  return `ENG-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export function eventId(): string {
  return `EVT-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export function decisionId(n: number): string {
  return `DEC-${String(n).padStart(4, "0")}`;
}

export function sliceId(n: number): string {
  return `SLICE-${String(n).padStart(3, "0")}`;
}

export function evidenceId(n: number): string {
  return `EVD-${String(n).padStart(4, "0")}`;
}

export function approvalId(n: number): string {
  return `APR-${String(n).padStart(4, "0")}`;
}

export function handoffId(n: number): string {
  return `HND-${String(n).padStart(4, "0")}`;
}
