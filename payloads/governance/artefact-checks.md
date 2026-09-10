# Artefact checks — fail-closed

Before a gate opens, three fail-closed checks run:

- content-contract — the artefact must carry a valid <!-- gate:contract --> block; absence degrades to a flagged raw dump.
- presentation-readiness — a flagged raw dump is a HARD fail unless an operator escape note downgrades it to advisory.
- cx-conformance — every operator DECISION must carry supporting detail (a bare either/or is a defect); and the STRUCTURAL invariant that the panel genuinely ran (branded, unforgeable) and did not veto is NON-escapable.

Any hard fail blocks the gate.
