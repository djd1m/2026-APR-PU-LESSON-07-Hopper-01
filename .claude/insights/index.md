# Development Insights: HopperRU

---

## 2026-05-12 — Parallel agent execution speeds up SPARC generation 3x

**Tags:** sparc-generation, parallel-agents, performance

**Problem:**
Generating 11 SPARC documents sequentially takes 20+ minutes. Each document requires reading Phase 0 context and writing 200-500 lines.

**Solution:**
Split into 2 parallel batches (Batch 1: 5 docs, Batch 2: 6 docs) using Agent tool with `run_in_background: true`. Both batches read the same Phase 0 files without conflict since they write to different output files. Total time: ~7 minutes instead of ~20.

**References:** Phase 1 execution in this session

---

## 2026-05-12 — Auto-push hook must run AFTER autocommit hooks

**Tags:** hooks, git-workflow, ordering

**Problem:**
If autopush.cjs runs before autocommit-insights.cjs finishes, the insight commits won't be pushed until next Stop event.

**Solution:**
Place autopush.cjs LAST in the Stop hooks array in settings.json. Claude Code executes Stop hooks sequentially in order, so last position guarantees all autocommits complete first.

**References:** .claude/settings.json, .claude/hooks/autopush.cjs

---

## 2026-05-12 — Russian travel market has ZERO fintech protection competitors

**Tags:** market-research, competitive-advantage, russia

**Problem:**
Initial assumption was that Russian OTAs (Aviasales, Yandex Travel, OneTwoTrip) might have similar fintech products to Hopper.

**Solution:**
After thorough research (6 competitors analyzed), confirmed that NO Russian travel platform offers Price Freeze, Cancel For Any Reason, or Price Drop Protection. This is a genuine Blue Ocean — validated through competitive matrix in Phase0_Discovery_Brief.md.

**References:** docs/Phase0_Discovery_Brief.md (Competitive Matrix section)

---

## 2026-05-12 — Insurance partner is critical path for CFAR

**Tags:** regulatory, insurance, cfar, blocker

**Problem:**
Cancel For Any Reason (CFAR) product requires licensed insurer (ЦБ regulation). Building this in-house requires ₽300M+ capital and 6-12 month licensing process.

**Solution:**
ADR-5: Partner with licensed Russian insurer (АльфаСтрахование, Ингосстрах, etc.) for CFAR underwriting. Price Freeze and Price Drop Protection can be self-insured (lower risk profile). Insurance partner API integration is estimated at 2-4 weeks after contract signing.

**References:** docs/ADR.md (ADR-5), docs/Phase0_Discovery_Brief.md (Risk Matrix)

---

## 2026-05-12 — Monorepo scaffold benefits from 3-agent parallelism

**Tags:** scaffolding, parallel-agents, monorepo

**Problem:**
Generating 6 packages with 87 files sequentially would take 30+ minutes. Packages have cross-dependencies (shared types → api → bot) but initial scaffolding can be parallelized.

**Solution:**
Split into 3 agents: (1) shared + db (foundation types), (2) api (backend), (3) bot + web + ml (clients + ML). Agents don't write to overlapping paths. Cross-package imports use @hopperru/shared which is generated first. Total time: ~12 minutes. Commit per logical group for safe recovery.

**References:** /start Phase 2 execution

---

## 2026-05-12 — Rule-based prediction as cold start solution (TRIZ #15 Dynamism)

**Tags:** ml, cold-start, triz, price-prediction

**Problem:**
Hopper uses 30B+ daily price points for 95% accuracy. We have zero historical data for Russian domestic routes.

**Solution:**
TRIZ Principle #15 (Dynamism): Phase 1 uses rule-based prediction with seasonal factors, day-of-week patterns, advance purchase curves, and Russian holiday calendar. Expected accuracy ~70%. As data accumulates, Phase 2 ML model (scikit-learn gradient boosting) trains on real data. Phase 3 deep learning (TensorFlow LSTM) when data volume sufficient. Each phase can be deployed independently.

**References:** docs/ADR.md (ADR-3), packages/ml/models/predictor.py, packages/ml/models/rules.py

---
