import { describe, expect, it } from "vitest";
import { deriveAchievementUnlocks } from "@/lib/achievements";

describe("deriveAchievementUnlocks", () => {
  it("unlocks first journey step when total xp reaches 20", () => {
    const unlocked = deriveAchievementUnlocks({
      totalXp: 20,
      streakDays: 0,
      weeklyMissionProgress: 0,
    });

    expect(unlocked.map((item) => item.code)).toContain("first_journey_step");
  });

  it("unlocks steady flame for a 7 day streak", () => {
    const unlocked = deriveAchievementUnlocks({
      totalXp: 0,
      streakDays: 7,
      weeklyMissionProgress: 0,
    });

    expect(unlocked.map((item) => item.code)).toContain("steady_flame");
  });

  it("unlocks guild builder when weekly mission progress reaches target", () => {
    const unlocked = deriveAchievementUnlocks({
      totalXp: 0,
      streakDays: 0,
      weeklyMissionProgress: 3,
    });

    expect(unlocked.map((item) => item.code)).toContain("guild_builder");
  });

  it("returns unique achievements even when all conditions are met", () => {
    const unlocked = deriveAchievementUnlocks({
      totalXp: 450,
      streakDays: 14,
      weeklyMissionProgress: 5,
    });

    const codes = unlocked.map((item) => item.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toEqual(["first_journey_step", "steady_flame", "guild_builder"]);
  });
});
