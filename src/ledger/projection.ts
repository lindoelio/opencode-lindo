import type { LindoProjectStateV1 } from "../domain/schemas.js";

export interface StateProjection {
  phase: string;
  outcome: string;
  active_slice?: string | undefined;
  material_constraints: string[];
  open_assumptions: string[];
  decisions: string[];
  gate_status: Record<string, string>;
  critical_risks: string[];
  pending_approvals: string[];
  next_action: string;
  revision: number;
}

export function project(state: LindoProjectStateV1): StateProjection {
  return {
    phase: state.engagement.phase,
    outcome: state.outcome,
    active_slice: state.activeSlice?.id,
    material_constraints: state.constraints.slice(0, 8),
    open_assumptions: state.assumptions
      .filter((a) => a.confidence === "low")
      .map((a) => `${a.id}: ${a.statement}`.slice(0, 200)),
    decisions: state.decisions.map((d) => d.id),
    gate_status: Object.fromEntries(state.gates.slice(-6).map((g) => [g.gate.toLowerCase(), g.result])),
    critical_risks: state.risks.filter((r) => r.severity === "critical" || r.severity === "high").map((r) => r.statement.slice(0, 200)),
    pending_approvals: state.approvals.filter((a) => a.status === "pending").map((a) => `${a.id}: ${a.requestedAction}`),
    next_action: state.nextAction.description,
    revision: state.revision,
  };
}

export function renderProjectionYaml(p: StateProjection): string {
  const lines = [
    `phase: ${p.phase}`,
    `outcome: ${JSON.stringify(p.outcome.slice(0, 300))}`,
    ...(p.active_slice ? [`active_slice: ${p.active_slice}`] : []),
    `material_constraints: ${JSON.stringify(p.material_constraints)}`,
    `open_assumptions: ${JSON.stringify(p.open_assumptions)}`,
    `decisions: [${p.decisions.join(", ")}]`,
    `gate_status: ${JSON.stringify(p.gate_status)}`,
    `critical_risks: ${JSON.stringify(p.critical_risks)}`,
    `pending_approvals: ${JSON.stringify(p.pending_approvals)}`,
    `next_action: ${JSON.stringify(p.next_action.slice(0, 300))}`,
    `revision: ${p.revision}`,
  ];
  return lines.join("\n");
}
