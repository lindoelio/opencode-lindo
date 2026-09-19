---
name: Lindo Product Thesis
description: Produce or refine the Product Thesis for a product or capability
slash: false
metadata:
  lindo/version: "1"
  opencode/autoinvoke: false
---

## Use when
Product/capability without a clear thesis.

## Do not use when
Only a bugfix inside an accepted thesis.

## Inputs
- actor, problem, outcome

## Workflow
1. Fill: For <actor> who <problem>, Lindo proposes <capability> that delivers <outcome>. Unlike <alternative>, it wins through <differentiator>, valid when <evidence>.
2. Add non-goals, riskiest assumptions, first proof.
3. Version the thesis.

## Output contract
Product Thesis vN with statement, actor, problem, outcome, differentiator, validation[].

## Evidence requirements
Validation signals must be observable, not adjectives.

## Failure modes
- Thesis without validation signal: reject.
