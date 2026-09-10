# Workflow — the stage lifecycle

The delivery moves through an ordered sequence of stages, each with a defined remit, and each forward stage may only run once every earlier stage has completed (been signed off).

**Sequence:** discovery -> design -> build -> test -> release.
**Off-sequence:** retro (post-hoc root-cause / lessons) may follow any delivery and never blocks the forward chain.

Stage remits:
- discovery — frame the problem; operator-gated.
- design — commit the approach; operator-gated.
- build — author the build PLAN (operator-gated) then implement it.
- test — verify against the plan; the operator gates the RESULTS.
- release — prepare and land; operator-gated at pre-flight.

The stage sequence is enforced: a stage out of order is refused.
