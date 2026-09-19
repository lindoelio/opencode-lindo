---
name: Lindo Evidence Gate
description: Evaluate a done/readiness/compatibility claim against the ledger
slash: false
metadata:
  lindo/version: "1"
  opencode/autoinvoke: false
---

## Use when
Any claim of done, readiness, or compatibility.

## Do not use when
Drafting proposals.

## Inputs
- gate, claim, criteria, evidence, findings

## Workflow
1. Load criterion-linked evidence from ledger (never shell exit code alone).
2. Apply CLAIM <= EVIDENCE; partial keeps gate open; skipped needs reason+owner but still missing.
3. Return PASS/FAIL/BLOCKED deterministically.

## Output contract
GateResult: result, satisfied[], missing[], failed[], waivers[], nextAction.

## Evidence requirements
pass requires artifactRef/command/digest; reviewer cannot accept own high-risk implementation.

## Failure modes
- Persuasive prose without evidence: FAIL.
