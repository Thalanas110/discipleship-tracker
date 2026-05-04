# Discipleship Gamification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a discipleship-first gamified habits experience with journey progression, garden feedback, and guild missions using existing habits/checkins data.

**Architecture:** Add a pure TypeScript gameplay engine (`lib/gamification`) and test it thoroughly, then refactor `Habits.tsx` to consume this derived state and present a new journey-centric UI. Keep V1 schema-free; if later DB persistence is needed, create only new migrations.

**Tech Stack:** React 18, TypeScript, Tailwind/shadcn, Vitest, Supabase.

---

## Chunk 1: Domain Engine + Tests

### Task 1: Add shared gamification types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add failing type-level usage test via compile references in new test file**
- [ ] **Step 2: Introduce `PracticeType`, `JourneyState`, `GardenState`, `GuildMissionState`, `GamificationSnapshot` types**
- [ ] **Step 3: Run tests to confirm no regressions**

### Task 2: Build TDD coverage for gameplay rules

**Files:**
- Create: `src/lib/gamification.test.ts`

- [ ] **Step 1: Write failing tests for XP cap, diversity bonus, repetition decay, streak, level, stage mapping, and garden mapping**
- [ ] **Step 2: Run `npm test -- src/lib/gamification.test.ts` and confirm RED**
- [ ] **Step 3: Implement minimal logic to satisfy tests**
- [ ] **Step 4: Re-run `npm test -- src/lib/gamification.test.ts` for GREEN**
- [ ] **Step 5: Refactor for clarity while staying GREEN**

### Task 3: Implement gameplay module

**Files:**
- Create: `src/lib/gamification.ts`

- [ ] **Step 1: Add pure helpers for date windows and unique-day calculations**
- [ ] **Step 2: Implement XP/streak/level/stage functions**
- [ ] **Step 3: Implement garden metric derivation**
- [ ] **Step 4: Implement high-level `buildGamificationSnapshot` aggregator**
- [ ] **Step 5: Verify against tests**

## Chunk 2: Habits UI Refactor

### Task 4: Extend habit service helpers

**Files:**
- Modify: `src/integrations/supabase/services/habitService.ts`

- [ ] **Step 1: Add `listRecentCheckinsForHabits(habitIds: string[])` helper**
- [ ] **Step 2: Ensure query is bounded and sorted**
- [ ] **Step 3: Add/adjust service-level tests if needed**

### Task 5: Rebuild `Habits.tsx` as journey page

**Files:**
- Modify: `src/pages/Habits.tsx`

- [ ] **Step 1: Add gamification state calculation pipeline**
- [ ] **Step 2: Add Journey Hero card (stage, level, XP progress, streak)**
- [ ] **Step 3: Add Today’s Calling section with reflective check-in UX**
- [ ] **Step 4: Add Garden growth panel tied to practice mix**
- [ ] **Step 5: Add Guild mission panel with weekly challenge**
- [ ] **Step 6: Keep legacy create/delete behavior functional**

## Chunk 3: Verification

### Task 6: Run full project verification

**Files:**
- No file changes

- [ ] **Step 1: Run targeted tests**
Run: `npm test -- src/lib/gamification.test.ts`

- [ ] **Step 2: Run full test suite**
Run: `npm test`

- [ ] **Step 3: Run type/build verification**
Run: `npm run build:node`

- [ ] **Step 4: Document any known gaps**

## Constraints
- Discipleship outcomes are primary; checklist behavior is secondary.
- Avoid punitive mechanics.
- For any database change: create a new migration only; never edit existing migrations/schema history.
