import { describe, expect, it } from "vitest";
import {
  buildGamificationSnapshot,
  calculateDailyXp,
  calculateLevelState,
  calculateReflectionBonus,
  calculateStreak,
  type PracticeEvent,
} from "@/lib/gamification";

function day(base: Date, delta: number) {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + delta);
  return next.toISOString().slice(0, 10);
}

function event(date: string, type: PracticeEvent["type"], note?: string): PracticeEvent {
  return { date, type, note };
}

describe("gamification", () => {
  it("scores reflection bonus based on note quality", () => {
    expect(calculateReflectionBonus("")).toBe(0);
    expect(calculateReflectionBonus("short")).toBe(2);
    expect(calculateReflectionBonus("This is a clear reflection with detail about what changed today.")).toBe(8);
  });

  it("applies repetition decay for repeated same-type practices", () => {
    const today = "2026-05-04";
    const xp = calculateDailyXp([
      event(today, "scripture"),
      event(today, "scripture"),
      event(today, "scripture"),
    ]);
    expect(xp.total).toBe(50);
    expect(xp.diversityBonus).toBe(0);
  });

  it("adds diversity bonus for three unique practice types", () => {
    const today = "2026-05-04";
    const xp = calculateDailyXp([
      event(today, "scripture"),
      event(today, "prayer"),
      event(today, "service"),
    ]);
    expect(xp.total).toBe(70);
    expect(xp.diversityBonus).toBe(10);
  });

  it("enforces daily xp cap", () => {
    const today = "2026-05-04";
    const xp = calculateDailyXp([
      event(today, "scripture", "A long reflection that earns high bonus points for quality and specificity."),
      event(today, "prayer", "A long reflection that earns high bonus points for quality and specificity."),
      event(today, "service", "A long reflection that earns high bonus points for quality and specificity."),
      event(today, "fellowship", "A long reflection that earns high bonus points for quality and specificity."),
      event(today, "witness", "A long reflection that earns high bonus points for quality and specificity."),
    ]);
    expect(xp.total).toBe(100);
    expect(xp.capped).toBe(true);
  });

  it("calculates streak with one-day grace pause", () => {
    const today = new Date("2026-05-04T00:00:00.000Z");
    const streak = calculateStreak(
      [day(today, -1), day(today, -2), day(today, -3)],
      today,
    );
    expect(streak.days).toBe(3);
    expect(streak.paused).toBe(true);
  });

  it("maps level and stage from total xp", () => {
    expect(calculateLevelState(0).stage).toBe("rooted");
    expect(calculateLevelState(350).stage).toBe("growing");
    expect(calculateLevelState(900).stage).toBe("multiplying");
  });

  it("builds a snapshot from practice events", () => {
    const today = new Date("2026-05-04T00:00:00.000Z");
    const events: PracticeEvent[] = [
      event(day(today, 0), "scripture"),
      event(day(today, 0), "prayer"),
      event(day(today, 0), "service"),
      event(day(today, -1), "prayer"),
      event(day(today, -1), "fellowship"),
    ];

    const snapshot = buildGamificationSnapshot(events, today);
    expect(snapshot.totalXp).toBeGreaterThan(0);
    expect(snapshot.journey.level).toBeGreaterThanOrEqual(1);
    expect(snapshot.garden.roots).toBeGreaterThan(snapshot.garden.light);
  });
});
