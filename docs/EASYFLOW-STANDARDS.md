# EasyFlow Project Standards (Extracted)

These standards are extracted from EasyFlow's repository (`.husky/pre-push`, branch-protection scripts, and docs validation scripts). Copy and paste into new projects to enforce the same rules.

## Branching & Push Rules
- Direct pushes to `main` are strictly forbidden. All changes must reach `main` via pull requests and passing CI.
- `dev` branch: pushing requires running a full local CI gate before push (unless `FAST_PUSH=true` is intentionally set).
- Feature branches (`feat/*`, `fix/*`, etc.): run light pre-push checks locally (build verification). Full CI runs on PRs and is the merge gate.
- Enforce branch protection for `main` (required status checks, PR reviews, and protected settings) — automated setup script exists (`scripts/setup-branch-protection.sh`).

## Local Pre-push Checks
- For `dev` pushes, run the project's full local CI script (e.g., `./scripts/local-ci-full.sh`) and block push on failure.
- For feature branches, verify that the frontend (or any top-level buildable subproject) builds locally before allowing push.
- Provide an explicit opt-out (`FAST_PUSH=true`) for `dev` only; document its use and risks.

## CI & PR Workflow
- All non-trivial changes must be delivered via PRs to `main` with passing CI status checks before merge.
- CI must run unit tests, linters, and any integration or observability smoke tests appropriate for the repo.
- PRs are the canonical place for full test runs; pre-push is a developer convenience / early feedback loop.

## Documentation & Release Notes
- Changes that modify APIs, docs, or user-visible behavior must update `README.md` and `docs/` as required.
- A docs-sync validation script exists and should be included in CI to fail if `docs/` or `README.md` are not updated when relevant files change (`scripts/validate-docs-sync.sh`).

## Observability & SLOs (repo conventions)
- The repo contains observability tooling (OTel collector in compose files). Projects should ship with basic observability configuration and smoke tests that validate telemetry ingestion after deployment.

## Automation & Safety
- Provide scripts to configure branch protection automatically (`scripts/setup-branch-protection.sh`). Use these scripts during repository setup.
- Include pre-push hooks via Husky to prevent unsafe actions and to provide quick local verification.

## Copy-Paste Checklist (standards to enforce in every new project)
- [ ] Block direct pushes to `main` (enforce via pre-push and GitHub branch protection).
- [ ] Require PRs + passing CI for merges to `main`.
- [ ] `dev` branch must run a full local CI gate before push (allow documented opt-out `FAST_PUSH=true`).
- [ ] Feature branches must at least locally build before push.
- [ ] Provide `scripts/setup-branch-protection.sh` or equivalent for automated branch protection setup.
- [ ] Include `scripts/validate-docs-sync.sh` or CI step to ensure docs/ and README.md are updated when needed.
- [ ] Add a clear `pre-push` hook that enforces the above logic and explains the workflow to contributors.
- [ ] Add observability smoke test(s) that run after deployments and, when practical, as part of CI.
- [ ] Document exceptions (e.g., `FAST_PUSH`) and audit their usage.

---

# EasyFlow Project Standards — Repeatable Observability & Delivery Framework

This file is a distilled, repeatable checklist, template and framework based on EasyFlow's standards. Use it as a copy/paste starter for every new project to raise the observability and safety bar consistently.

## 1 — Core Principles (apply to every repo)
- Observability first: instrumentation is product-quality code. Ship telemetry with features, not after.
- Fail fast, learn fast: instrument BEFORE business logic so incidents teach us and create follow-up tasks.
- High-cardinality exploration: logs/metrics/traces must support ad-hoc filtering by arbitrary attributes.
- Safety-by-default: protect `main`, require PRs + passing CI, and prefer non-destructive automation (dry-run first).

## 2 — Quick Project Checklist (apply on repo bootstrap)
- [ ] Add `pre-push` hook that blocks direct pushes to `main` and enforces local gates for `dev`.
- [ ] Enforce PR-only merges to `main` with required status checks (tests, lint, observability gates).
- [ ] Add `scripts/setup-branch-protection.sh` and document required GitHub secrets/permissions.
- [ ] Add `scripts/validate-docs-sync.sh` and run it in CI to ensure docs are updated when APIs change.
- [ ] Add observability smoke test (post-deploy) and a scheduled weekly learning report generator.
- [ ] Add `.cursorrules` (Continuous Learning Architecture) or link to central policy doc for team reference.

## 3 — Observability Framework (repeatable template)
1. Instrumentation pattern
	- Logs: structured JSON, include `request_id`, `user_id`, `workflow_id`, `environment`, `version`.
	- Traces: instrument critical paths with OpenTelemetry; set business attributes on spans.
	- Metrics: emit SLI/SLO metrics and learning metrics (execution_count, avg_duration_ms, error_rate, performance_trend).

2. Learning & adaptation
	- Each long-running automation should extend a `LearnableWorkflow` pattern that records executions, durations, error patterns and exposes `getLearningInsights()`.
	- Emit custom events (e.g., `WorkflowExecution`, `AutomationStep`) to the observability backend for ad-hoc queries.

3. Error pattern recognition
	- Periodically query error events (24h/7d) and create learning tasks when thresholds are exceeded.

4. Deployment verification
	- Post-deploy smoke test must confirm telemetry ingestion (New Relic or equivalent) and fail the deployment if missing.

## 4 — CI Quality Gates (template rules to include in `.github/workflows/`) 
- Verify new automations extend `LearnableWorkflow` or include equivalent instrumentation.
- Verify `newrelic.recordCustomEvent` (or platform-specific emit) exists near business-critical logic.
- Verify catch blocks update error pattern counters or call a tracking helper.
- Verify performance tracking exists (`performance.now()` or `executeStep()` wrappers) for critical flows.
- Verify SLO-related metrics and retention policy are present (historical windows >= 7 days).

## 5 — Feature-level onboarding (checklist for every feature)
1. Define critical user journeys and SLIs/SLOs (document in feature SLO template).
2. Instrument: logs, spans, and metrics before writing complex business logic.
3. Add unit and observability tests that assert logs/spans/metrics are emitted.
4. Add docs: README, telemetry fields, and run `scripts/validate-docs-sync.sh` locally.
5. Create migration and RLS policies (if using Supabase) and test locally.

## 6 — Operational runbooks & weekly work
- Add a `scripts/weekly-learning-report.js` that queries learning metrics and produces an actionable report for the team.
- Schedule a weekly observability review: SLO burn, new error patterns, slowest endpoints, and instrumentation debt.

## 7 — Templates & snippets (copy into new repos)
- `pre-push` hook: (enforce branch rules, run `./scripts/local-ci-full.sh` for `dev`, quick build for feature branches).
- `scripts/observability-smoke-test.js`: run after deployments to validate telemetry ingestion.
- CI workflow snippet: `quality-gates.yml` (PR checks for instrumentation + test + lint).

## 8 — Minimal actionable items to ship today
- Add structured logger and basic OpenTelemetry tracer to the service.
- Add `request_id` propagation middleware and include `request_id` in all logs and spans.
- Add a single automation that extends `LearnableWorkflow` and demonstrates recording an execution event.
- Add a post-deploy smoke test and wire it to the existing deployment workflow.

## 9 — Where this lives & next steps
- Primary doc: `.cursorrules` — contains the Continuous Learning Architecture (already added to repo).
- Next recommended tasks (I can do any of these):
  - Add the `quality-gates.yml` workflow derived from this file (PR gate).
  - Add `scripts/weekly-learning-report.js` and wire a scheduled GitHub Action.
  - Scaffold `scripts/observability-smoke-test.js` and add it to deploy pipeline.

---

This updated standard is focused on repeatability: copy the quick checklist into a new repo, wire the three scripts, and you'll have a minimal, reviewable observability posture that supports ad-hoc investigation and continuous learning.

If you want I will commit this update on `chore/update-easyflow-standards`, add the CI workflow and a smoke-test script, and open a PR.