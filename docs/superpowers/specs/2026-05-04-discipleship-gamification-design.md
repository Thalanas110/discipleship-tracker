# Discipleship Gamification Design

**Date:** 2026-05-04  
**Status:** Approved  
**Owner:** Product + Engineering

## Goal
Transform the current habits experience from a plain checklist into an engaging discipleship journey for kids and adults, while keeping spiritual formation as the center of the product.

## Core Experience
Hybrid model:
- Adventure Journey: stage and level progression.
- Soul Garden: visual growth feedback from daily practices.
- Guild Missions: weekly cooperative discipleship challenges.

The product language shifts from task completion to formation:
- `Habits` become `Practices`.
- `To-do items` become `Today’s Calling`.
- `Checklist` becomes `Journey`.

## Discipleship-First Guardrails
- Reward consistency and reflection quality, not click volume.
- Daily XP cap prevents grinding behavior.
- Repetition decay reduces points from repeating the same practice type.
- Grace-oriented recovery: missed days pause growth, not harsh resets.
- Guild competition is positive and seasonal, with no shame-oriented ranking.

## Practice Taxonomy
- Scripture
- Prayer
- Service
- Fellowship
- Witness

Each practice completion supports a short reflection prompt.

## Progression Model
- Stages: Rooted -> Growing -> Serving -> Multiplying
- XP per practice completion:
  - Base: 20
  - Reflection bonus: 0-10
  - Diversity bonus: +10 when 3 distinct types are completed in one day
  - Daily cap: 100
- Leveling derived from total XP with deterministic thresholds.

## Garden Mapping
- Scripture -> Branches
- Prayer -> Roots
- Service -> Fruit
- Fellowship -> Flowers
- Witness -> Light

Garden state is derived from recent practice mix and streak consistency.

## Guild Missions
- Weekly cooperative mission card.
- Guild score weighted toward:
  - Weekly consistency
  - Mission completion
  - Story/testimony contribution
- Seasonal reset cycle.

## Technical Architecture (V1)
Frontend-derived gameplay (no schema change required for V1):
- Use existing `habits` and `habit_checkins` as source of truth.
- Compute journey, streak, XP, and garden state in a pure TS module.
- Add UI sections in `Habits` page:
  - Journey Hero
  - Today’s Calling
  - Garden Status
  - Guild Mission

## Data and Schema Policy
If backend schema changes are needed in later phases:
- Never edit existing schema or migrations.
- Always add a brand-new migration file for any DB change.

## Rollout
- Phase 1: Derived gamification + new UI on habits page.
- Phase 2: Persisted missions/achievements tables (new migrations only).
- Phase 3: Guild seasons, leaderboard moderation, and richer rewards.

## Success Criteria
- Users describe the page as “journey” rather than “to-do list.”
- Increased daily return rate and check-in consistency.
- Reflection completion rate remains high (not just tap-through behavior).
