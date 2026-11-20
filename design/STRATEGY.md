# MRTT / 仝心圆 — Industry Expansion Plan (draft v0.1)

Status: working draft for team discussion. Items marked **[assumption]** need your confirmation; nothing here is a commitment to customers.

## 1. Thesis

AI can already read drawings. Manufacturing and construction need something stricter: **output that conforms to standards, reflects the company's own practice, is checked for feasibility, is validated by a person, and can actually be built.**

> Protocols & standards → customized practice → feasibility evaluation → user validation → deployment to manufacturing / construction.

Every sector below runs the same five-stage loop (Ingest → Compile → Feasibility → Validate → Deploy). What changes per sector is the **rule pack** (standards + customer practice), the **solvers**, and the **deployment target**.

## 2. What we already have (reuse, don't rebuild)

| Asset | Where | Reuse for |
|---|---|---|
| Angle-steel tower reconstruction (9 modules, evidence + validation state) | `public/explore`, `neube-sr-showcase` | Proof of the loop; the demo that sells the method |
| NeuBE-SR skill base (drawing → observation → hypothesis → semantics → constraints → review) | `public/neube-sr-showcase` | Core of the Compile + Validate stages in every sector |
| G637 digital twin (alignment, 43 curve checks, 79-item hazard register with citations, quantities) | `../playground/g637-digital-twin` | Template for **civil: transport**, and for any "rules over a model → cited findings" product |
| Verification-loop UI patterns (evidence trace, candidate retention) | site + explorer | Validate stage UX |

## 3. Five workstreams (cross-sector platform)

### W1 — Standards & protocol library
- Parse standards into **clause-level, citable, versioned rules** (id, text, applicability, parameters, executable check where possible).
- Three rule tiers: *mandatory standard* · *industry protocol / customer spec* · *company practice*. Tier conflicts are surfaced, never silently resolved.
- Output: a rule schema + 1 pilot pack per sector. Start with the ~20 clauses that drive 80% of rejections, not full coverage.
- Legal note **[assumption]**: confirm licensing for ingesting GB/JTG/API/IEC text; store clause IDs + our own parameterization rather than redistributing text.

### W2 — Customization layer (company practice)
- Capture tacit practice as explicit constraints: preferred dimensions, tolerance habits, welding/machining routes, supplier limits, exceptions.
- Mechanism: expert interview → rule draft → replay on historical drawings → expert correction → versioned "practice pack" per customer.
- This is the moat: each customer's pack improves our evals and is hard to replicate.

### W3 — Feasibility evaluation engine
Layered checks, cheapest first:
1. Geometric closure / topology (we have this from NeuBE-SR).
2. Standard conformance (W1 executable rules).
3. Dimension chains & tolerance stack-up.
4. Manufacturability (DFM): machinability, weldability, assembly access, material availability.
5. Performance screening (strength, clearance, creepage, hydraulics) — **screening only**; hand off to the customer's certified analysis for sign-off. We must not imply certification.
6. Cost & lead-time estimate (BOM × process routes × rates).
Each check returns **pass / risk / blocked + evidence + citation**. Same shape as the G637 hazard register.

### W4 — Validation experience (how users examine and trust models)
- Side-by-side drawing ↔ 3D with every element clickable back to source region and clause.
- Candidate models kept in parallel; engineer picks, we record why.
- **Gates**: sign-off per gate (geometry, standards, tolerance, DFM, cost). No "Deploy" until required gates are signed. Audit log of who signed what.
- Measure it: time-to-validate, % findings accepted, % silent errors found downstream.

### W5 — Deployment bridge (AI output → real manufacturing)
- Outputs by target: parametric CAD / STEP; BOM; process cards; inspection plan; quotation basis; construction quantity lists.
- Integrations in order of customer pull: file export (STEP/DXF/XLSX) → PLM/ERP (BOM) → MES/CAM. Don't build connectors speculatively.
- **Closed loop**: first-article / pilot-build feedback (what shop floor changed and why) flows back into W1/W2 as new rules and eval cases. This is the data flywheel; design the capture form early.

## 4. Sector plans

### 4.1 Manufacturing (pilot priority: valves first) **[assumption]**
Why valves first: standards are mature and explicit (pressure class, face-to-face, flange, sealing), geometry is parametric, and defects have clear cost.

| Sub-sector | Typical input | Rule pack focus | Key outputs |
|---|---|---|---|
| Valves | Customer drawing + technical agreement | Pressure class, flange/face-to-face, seat sealing, material, test | Parametric model, deviation list vs agreement, process card, quote basis |
| Electrical equipment | Cabinet/busbar/switchgear drawings | Electrical clearance, creepage, enclosure, busbar sizing | Clearance/creepage report, BOM, layout validation |
| Motor accessories | End shield, shaft, frame drawings | Fits & tolerances, machining routes, balancing | Tolerance-chain check, route sheet, quote basis |

Pilot shape (per sub-sector): 1 customer, 20–50 historical drawings as eval set, 1 practice pack, 1 deployment artifact accepted by their shop floor. **Success = engineer prefers our deviation list to manual review on held-out drawings.**

### 4.2 Civil engineering
| Product | Status | Next step |
|---|---|---|
| Transport design review (G637 template) | Prototype | Generalize pipeline: report+drawings → twin → rule register. Resolve the open items in the demo README (marked 待核对, CAD ground model) |
| Construction cost audit | Not started | Quantity extraction from drawings vs. bill of quantities vs. variation orders; difference register with drawing citations |
| Quotation | Not started | Quantity takeoff + company norms (定额) → traceable quote. Shares engine with audit |

Audit and quotation are the **same engine pointed in opposite directions** (takeoff vs. reconcile) — build once.

### 4.3 Power towers (keep as flagship)
Finish what we claim: legs (塔腿), installation connections, then publish accuracy numbers on a held-out set. This is our credibility asset for all other sectors.

## 5. Phasing **[assumption on dates and team size]**

| Phase | Window | Goal | Exit criteria |
|---|---|---|---|
| 0 Foundation | Months 0–2 | Rule schema, practice-pack format, gate/sign-off model, eval harness; unify tower + G637 under one pipeline | Both existing demos run through the common schema; eval harness reports per-check precision/recall |
| 1 Manufacturing pilots | Months 2–6 | Valve pilot end to end; start electrical and motor discovery | 1 valve customer signs off ≥1 deployed artifact; deviation-list accepted on held-out drawings |
| 2 Civil depth | Months 3–8 | Productize transport review; prototype takeoff engine for audit/quote | 1 transport client uses the register in a real review; takeoff matches manual quantities within agreed tolerance on a sample |
| 3 Scale | Months 8–12 | Second customer per sector; connector for most-requested system (likely PLM/ERP) | Repeat deployments with <50% of pilot onboarding effort |

## 6. Metrics
- **Trust**: % AI findings accepted by engineers; escaped-defect count found downstream.
- **Speed**: time from drawing receipt to signed-off model, vs. customer baseline.
- **Coverage**: clauses executable / clauses in pilot pack.
- **Flywheel**: new rules and eval cases created per deployment.
- **Commercial**: pilots → paid conversions; onboarding effort per new customer.

## 7. Key risks
| Risk | Mitigation |
|---|---|
| Overclaiming ("AI-certified") | Language rule: screening and decision-support only; sign-off stays with licensed engineers. The site already carries "not a construction basis" disclaimers — keep them |
| Standards licensing / version drift | Clause IDs + versioning; legal review before ingestion |
| Customer practice is tacit and inconsistent | Replay on historical drawings; experts correct; don't generalize across customers by default |
| Spreading across 4+ sub-sectors | One pilot per sector, shared platform; gate new sectors on the previous exit criteria |
| Customer data confidentiality (drawings, public-project reports) | Per-customer isolation; get written permission before showing any project externally |

## 8. Decisions needed from you
1. **Pilot order** within manufacturing (valves → electrical → motor)? Do you already have a design partner for any of them?
2. **Civil priority**: deepen transport review first, or start with audit/quotation where the buyer may be closer to paying?
3. **Public disclosure**: the website now shows G637 figures (43 curves, 79 hazards, 17 bridges, 55 culverts) from the internal prototype. Do we have permission to publish them?
4. **Team and timeline** assumptions for the phase table.
5. **Investor narrative**: which traction claims are safe to make beyond the demos?

## 9. Website roadmap (follows the plan)
- Now: audience-addressed home (customers / clients / investors), imagine-scenarios (clearly labelled as illustrative), sector explorer with honest status pills, validation-gate visual.
- Next: replace illustrative scenarios with real pilot stories once permission exists; add a G637 interactive embed (needs the demo moved under `public/` and a go-ahead on disclosure); per-sector pages with downloadable one-pagers; investor page with a data room request flow.
- Keep status pills current (已可演示 / 共创探索 / 规划中) — they are the site's honesty mechanism.
