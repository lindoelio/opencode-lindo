---
name: Lindo Release Contract
description: Prepare and execute a release with artifact identity and rollback
slash: false
metadata:
  lindo/version: "2"
  opencode/autoinvoke: false
---

## Use when
Release/deploy/tag/publication.

## Do not use when
Local-only change.

## Inputs
- target, artifact, registered guardrails

## Workflow
1. Pin target, artifact SHA/checksum; confirm promoted artifact == verified artifact.
2. Confirm migrations, secrets handling, rollback, observability, known limitations.
3. Execute the promotion autonomously (tag/push/publish/deploy). Pause only when a registered guardrail covers the action; then open a scoped approval.

## Output contract
Release contract + rollback plan + executed promotion evidence.

## Evidence requirements
Same-artifact identity between verify and promote.

## Failure modes
- Rebuilding between verify and release without re-verify: block.
- Asking for authorization without a registered guardrail: policy violation.
