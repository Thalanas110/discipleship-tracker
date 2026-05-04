export interface AchievementDefinition {
  code: string;
  title: string;
  description: string;
}

export interface AchievementRuleInput {
  totalXp: number;
  streakDays: number;
  weeklyMissionProgress: number;
}

const ACHIEVEMENT_LIBRARY: Record<string, AchievementDefinition> = {
  first_journey_step: {
    code: "first_journey_step",
    title: "First Journey Step",
    description: "Earn your first 20 XP through meaningful discipleship practice.",
  },
  steady_flame: {
    code: "steady_flame",
    title: "Steady Flame",
    description: "Keep a 7-day discipleship streak.",
  },
  guild_builder: {
    code: "guild_builder",
    title: "Guild Builder",
    description: "Reach the weekly guild mission target.",
  },
};

export function deriveAchievementUnlocks(input: AchievementRuleInput): AchievementDefinition[] {
  const unlocked: AchievementDefinition[] = [];

  if (input.totalXp >= 20) unlocked.push(ACHIEVEMENT_LIBRARY.first_journey_step);
  if (input.streakDays >= 7) unlocked.push(ACHIEVEMENT_LIBRARY.steady_flame);
  if (input.weeklyMissionProgress >= 3) unlocked.push(ACHIEVEMENT_LIBRARY.guild_builder);

  return unlocked;
}
