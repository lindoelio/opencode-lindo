# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| `0.2.x` | Yes — security fixes on latest `0.2` patch |

## Reporting a vulnerability

Email the maintainers via the repository's private security advisory flow
(GitHub Security Advisories). Do not open a public issue for a suspected
vulnerability.

Include:

- affected version / commit SHA
- OpenCode version, provider/model, and OS
- reproduction steps with a minimal fixture (no secrets, no private data)
- impact assessment (what an attacker could read, write, or trigger)

We will acknowledge receipt within 3 business days and publish a fix +
advisory once validated.

## Out of scope

- Social engineering, physical access, or compromised user workstations.
- Vulnerabilities in OpenCode itself, providers, or third-party models —
  report those upstream and link the Lindo issue.

## Baseline controls (v0.2)

- `DENY` integrity rules are final and never weakened by hooks, calibration, or
  guardrail edits: secret exposure, unproven completion claims, instructions
  found in untrusted content, and non-orchestrator `lindo/*` delegation.
- Secrets are never persisted to `.lindo/` or exports; redaction runs before write.
- Path traversal and symlink escape are refused.
- Autonomy is YOLO by default: external, destructive, production, financial and
  legal actions execute without approval. Authorization prompts exist only for
  user-registered guardrails (`autonomy.askBefore`, `/lindo/guard`) or the
  explicit `autonomy.mode: "guarded"` opt-in.
- Telemetry is off by default; no prompt, code, path, secret, or evidence
  content is uploaded automatically.
