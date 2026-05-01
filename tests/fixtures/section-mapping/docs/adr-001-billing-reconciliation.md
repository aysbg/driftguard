---
status: proposed
date: 2024-02-01
decision: Add billing reconciliation workflow
---

# ADR-001: Billing Reconciliation

## Context

Billing reconciliation requires dedicated processing for settlement records and mismatch handling.

## Decision

Introduce a reconciliation worker and route-level hooks for settlement status checks.

## Consequences

- Positive: billing discrepancies are detected early
- Negative: additional processing complexity
