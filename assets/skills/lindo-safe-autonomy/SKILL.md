---
name: Lindo Safe Autonomy
description: Classify a sensitive action and choose the safest path
slash: false
metadata:
  lindo/version: "1"
  opencode/autoinvoke: false
---

## Use when
Potentially sensitive action.

## Do not use when
Pure read inside workspace.

## Inputs
- action, resources, phase, approvals

## Workflow
1. Classify ALLOW / ALLOW_WITH_RECORD / ASK / DENY via Authority Matrix.
2. DENY is final. ALLOW->ASK elevation for external/destructive/outside-slice.
3. Open scoped approval for ASK; propose recoverable alternative for destructive.

## Output contract
Authority classification + safest path + approval id when needed.

## Evidence requirements
Reason string + matching approval scope/expiry on execution.

## Failure modes
- Model-override of DENY: refuse and log.
