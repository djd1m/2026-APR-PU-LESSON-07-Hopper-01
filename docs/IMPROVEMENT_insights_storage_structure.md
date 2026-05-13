# Improvement Proposal: Insights Storage Structure

**Package:** `@dzhechkov/p-replicator`
**Version:** 1.5.x
**Severity:** Low (UX improvement, not a bug)
**Component:** `/myinsights` command + `.claude/rules/insights-capture.md`
**Date:** 2026-05-13
**Reporter:** Claude Code session (HopperRU project)

---

## Summary

Current insights storage uses a **single `index.md` file** for up to 50 entries before splitting into monthly archives. In practice, a single file with 50 structured entries (each 8-12 lines) becomes **400-600 lines** — difficult to scan, slow to parse by `session-insights.cjs`, and violates the principle of atomic, discoverable knowledge units.

**Proposed change:** Lower the split threshold and/or adopt per-insight file structure from the start.

---

## Current Behavior (per `insights-capture.md`)

```
Storage Lifecycle:
- <= 50 entries: single index.md
- > 50 entries: split into archive files <YYYY-MM>.md with index.md as TOC
- Never delete entries unless factually wrong; mark superseded entries instead
```

### Problems with this design

| Problem | Impact | Severity |
|---------|--------|----------|
| **50 entries = 400-600 lines in one file** | Hard to scan, grep, and navigate | Medium |
| **SessionStart hook reads ALL insights** | `session-insights.cjs` loads entire `index.md` into context on every session start. At 50 entries this is ~3-5K tokens of context consumed before the user says anything | High |
| **No per-insight addressability** | Can't link to a specific insight from code comments, ADRs, or feature docs. Only `index.md#section-heading` which is fragile | Medium |
| **Merge conflicts** | Multiple sessions appending to same `index.md` → git conflicts | Low |
| **No metadata for filtering** | Tags are in markdown text, not structured. `session-insights.cjs` can't filter by relevance — it dumps everything | High |
| **Split at 50 is arbitrary** | Why 50? No rationale documented. Monthly archives assume consistent insight rate, but projects burst (10 insights in one day, then none for weeks) | Low |

---

## Observed in This Project

In the HopperRU project (2-day session):
- 10 insights captured in `index.md`
- File is already 157 lines
- At current rate, would hit 50 entries in ~10 days of active development
- `session-insights.cjs` injects ALL 10 insights into every session context (~1.5K tokens), even when working on unrelated tasks (e.g., CSS fixes don't need insights about Prisma UUID issues)

---

## Proposed Improvements

### Option A: Per-Insight Files (Recommended)

```
.claude/insights/
├── index.md                           # TOC only (1-line per insight)
├── 2026-05-12-parallel-agents.md      # Individual insight file
├── 2026-05-12-hook-ordering.md
├── 2026-05-12-zero-competition.md
├── 2026-05-13-yookassa-payment-url.md
├── 2026-05-13-booking-route-confusion.md
└── ...
```

**index.md format (TOC):**
```markdown
# Development Insights

| Date | Title | Tags | File |
|------|-------|------|------|
| 2026-05-12 | Parallel agents speed up SPARC 3x | sparc, agents | [link](./2026-05-12-parallel-agents.md) |
| 2026-05-13 | YooKassa payment_url re-fetch | yookassa, payment | [link](./2026-05-13-yookassa-payment-url.md) |
```

**Per-insight file format:**
```markdown
---
date: 2026-05-13
title: YooKassa payment_url must be re-fetched
tags: [yookassa, payment, booking-flow]
severity: medium
---

## Problem
...

## Solution
...

## References
...
```

**Advantages:**
- Atomic, addressable insights
- YAML frontmatter enables structured filtering
- `session-insights.cjs` can filter by tags matching current task
- No merge conflicts (different files)
- Easy to delete/supersede individual insights
- Works at any scale (1 or 1000 insights)

### Option B: Lower Threshold to 15-20

Minimal change — keep current structure but split earlier:

```
Storage Lifecycle:
- <= 15 entries: single index.md
- > 15 entries: split into archive files <YYYY-MM>.md with index.md as TOC
```

**Advantages:** Simple change, backwards compatible.
**Disadvantages:** Doesn't solve addressability, filtering, or context injection problems.

### Option C: Hybrid (frontmatter in index.md)

Keep single file but add YAML frontmatter per entry for structured parsing:

```markdown
## 2026-05-13 — YooKassa payment_url re-fetch
<!-- tags: yookassa, payment, booking-flow -->
<!-- severity: medium -->

**Problem:** ...
**Solution:** ...
```

`session-insights.cjs` parses HTML comments to filter by relevance.

**Advantages:** Single file, backwards compatible, structured.
**Disadvantages:** HTML comments in markdown = awkward, still one big file.

---

## Recommendation

**Option A (Per-Insight Files)** is the best long-term solution because:

1. **Scales infinitely** — no threshold to manage
2. **Enables smart injection** — `session-insights.cjs` reads YAML frontmatter, matches tags to current task context, injects only relevant insights
3. **Git-friendly** — no merge conflicts
4. **Linkable** — code comments can reference `see .claude/insights/2026-05-13-yookassa-payment-url.md`
5. **Discoverable** — `ls .claude/insights/` gives instant overview

---

## Implementation Plan for p-replicator

### Changes needed

| File | Change |
|------|--------|
| `.claude/rules/insights-capture.md` | Update Storage Lifecycle section to per-file structure |
| `.claude/commands/myinsights.md` | Update to create individual `.md` files instead of appending to `index.md` |
| `.claude/hooks/session-insights.cjs` | Update to scan `insights/*.md` files, parse YAML frontmatter, filter by relevance |
| `.claude/hooks/autocommit-insights.cjs` | Update to commit individual files (already works since it does `git add .claude/insights/`) |
| `.claude/skills/cc-toolkit-generator-enhanced/` | Update insight generation template in Phase 3 |

### Migration path

1. Existing `index.md` with entries → split into per-file automatically (one-time migration script)
2. New `index.md` becomes TOC (auto-generated from file list)
3. Both formats supported during transition (read old `index.md` + new per-file)

### session-insights.cjs improvements

```javascript
// Current: dump all insights
const insights = fs.readFileSync('index.md', 'utf8');
process.stdout.write(insights);

// Proposed: filter by relevance
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'index.md');
const relevant = files
  .map(f => parseFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8')))
  .filter(insight => {
    // Match tags against current task context (from CLAUDE.md, recent git diff, etc.)
    return insight.tags.some(tag => currentContext.includes(tag));
  })
  .slice(0, 5); // Max 5 insights per session start

process.stdout.write(relevant.map(i => formatInsight(i)).join('\n---\n'));
```

This reduces context injection from ~1.5K tokens (all insights) to ~300-500 tokens (top 5 relevant).

---

## Test Contract

After implementing Option A:

1. `/myinsights "test insight"` → creates `.claude/insights/YYYY-MM-DD-test-insight.md` with frontmatter
2. `index.md` is auto-regenerated as TOC
3. `session-insights.cjs` on SessionStart → outputs only relevant insights (not all)
4. `autocommit-insights.cjs` on Stop → commits new insight files
5. Existing projects with old `index.md` format → still work (backwards compatible)
6. `npx @dzhechkov/p-replicator verify` → passes

---

## Related

- `.claude/rules/insights-capture.md` — current specification
- `.claude/hooks/session-insights.cjs` — SessionStart hook (reads insights)
- `.claude/hooks/autocommit-insights.cjs` — Stop hook (commits insights)
- `.claude/commands/myinsights.md` — `/myinsights` command
- `docs/BUG_REPORT_run_skips_feature_pipeline.md` — related harness improvement
