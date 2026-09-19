---
name: Lindo Domain Discovery
description: Map a new domain into glossary, invariants, and unknowns
slash: false
metadata:
  lindo/version: "1"
  opencode/autoinvoke: false
---

## Use when
New domain or unknown business rules.

## Do not use when
Code path is already mapped and verified.

## Inputs
- domain sources, primary files

## Workflow
1. Prefer primary sources and runtime over docs.
2. Build glossary + invariants + unknowns with source refs.
3. Classify each item epistemologically.

## Output contract
Domain map + glossary + invariants[] + unknowns[].

## Evidence requirements
Every invariant cites a primary source or execution.

## Failure modes
- Treating docs as runtime proof: refuse.
