---
name: Lindo Twin Calibration
description: Record a user correction as a contextual proposal
slash: false
metadata:
  lindo/version: "1"
  opencode/autoinvoke: false
---

## Use when
User corrects voice, judgment, or agency.

## Do not use when
User asks for a factual task.

## Inputs
- trigger, response, correction

## Workflow
1. Record trigger/response/correction + context_rule + counterexample + scope (voice|judgment|agency) + privacy.
2. Status PROPOSED; only /lindo/calibrate --accept activates.
3. Agency changes pass safety validation; never remove Constitution or weaken gates.

## Output contract
Calibration Proposal.

## Evidence requirements
Counterexample required; holdout-evaluated before globalizing.

## Failure modes
- Auto-merge without accept: refuse.
