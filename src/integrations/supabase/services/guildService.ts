import { supabase } from "@/integrations/supabase/client";
import type {
  AchievementDefinition,
  AchievementRuleInput,
} from "@/lib/achievements";
import type {
  Group,
  GuildLeaderboardEntry,
  GuildLeaderboardGroupSetting,
  GuildMission,
  GuildMissionContribution,
  GuildSeason,
  UserAchievement,
} from "@/types";

export interface GuildState {
  season: GuildSeason | null;
  mission: GuildMission | null;
  myGroupId: string | null;
  contributionsThisWeek: number;
  achievements: UserAchievement[];
}

export interface GuildLeaderboardModerationRow {
  groupId: string;
  groupName: string;
  finalPoints: number;
  rank: number | null;
  isVisible: boolean;
  adjustedPoints: number;
  moderationNote: string;
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function weekEndIso(startIso: string) {
  const end = new Date(`${startIso}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  return isoDay(end);
}

async function getActiveSeason(todayIso: string) {
  const { data, error } = await supabase
    .from("guild_seasons")
    .select("*")
    .eq("is_active", true)
    .lte("starts_on", todayIso)
    .gte("ends_on", todayIso)
    .order("starts_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as GuildSeason | null) ?? null;
}

async function getMyPrimaryGroupId(userId: string) {
  const { data, error } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("member_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.group_id ?? null;
}

export const guildService = {
  async getState(): Promise<GuildState> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        season: null,
        mission: null,
        myGroupId: null,
        contributionsThisWeek: 0,
        achievements: [],
      };
    }

    const today = isoDay(new Date());
    const [season, myGroupId] = await Promise.all([
      getActiveSeason(today),
      getMyPrimaryGroupId(user.id),
    ]);

    let mission: GuildMission | null = null;
    if (season) {
      const { data: missionData, error: missionError } = await supabase
        .from("guild_missions")
        .select("*")
        .eq("season_id", season.id)
        .eq("is_active", true)
        .lte("week_start", today)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (missionError) throw missionError;
      mission = (missionData as GuildMission | null) ?? null;
    }

    let contributionsThisWeek = 0;
    if (mission) {
      const { count, error: countError } = await supabase
        .from("guild_mission_contributions")
        .select("id", { count: "exact", head: true })
        .eq("mission_id", mission.id)
        .eq("user_id", user.id)
        .gte("contribution_date", mission.week_start)
        .lte("contribution_date", weekEndIso(mission.week_start));
      if (countError) throw countError;
      contributionsThisWeek = count ?? 0;
    }

    const { data: achievementsData, error: achievementError } = await supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", user.id)
      .order("awarded_at", { ascending: false })
      .limit(8);
    if (achievementError) throw achievementError;

    return {
      season,
      mission,
      myGroupId,
      contributionsThisWeek,
      achievements: (achievementsData as UserAchievement[]) ?? [],
    };
  },

  async getLeaderboard(seasonId: string, limit = 8): Promise<GuildLeaderboardEntry[]> {
    const { data, error } = await supabase.rpc("get_guild_leaderboard", {
      _season_id: seasonId,
      _limit: limit,
    });
    if (error) throw error;
    const entries = (data as GuildLeaderboardEntry[]) ?? [];
    return entries.filter(
      (row) =>
        Boolean(row.group_id) &&
        Boolean(row.group_name) &&
        typeof row.final_points === "number",
    );
  },

  async getLeaderboardModerationRows(seasonId: string): Promise<GuildLeaderboardModerationRow[]> {
    const [{ data: groupsData, error: groupsError }, { data: settingsData, error: settingsError }] = await Promise.all([
      supabase.from("groups").select("*").order("name"),
      supabase
        .from("guild_leaderboard_group_settings")
        .select("*")
        .eq("season_id", seasonId),
    ]);
    if (groupsError) throw groupsError;
    if (settingsError) throw settingsError;

    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from("guild_leaderboard_entries")
      .select("*")
      .eq("season_id", seasonId)
      .order("rank", { ascending: true })
      .limit(200);
    if (leaderboardError) throw leaderboardError;

    const groups = (groupsData as Group[]) ?? [];
    const settings = (settingsData as GuildLeaderboardGroupSetting[]) ?? [];
    const leaderboard = (leaderboardData as GuildLeaderboardEntry[]) ?? [];

    const settingByGroup = new Map(settings.map((item) => [item.group_id, item]));
    const rankByGroup = new Map(
      leaderboard
        .filter((row) => row.group_id)
        .map((row) => [
          row.group_id,
          { rank: row.rank, points: row.final_points },
        ]),
    );

    return groups.map((group) => {
      const setting = settingByGroup.get(group.id);
      const rankInfo = rankByGroup.get(group.id);
      return {
        groupId: group.id,
        groupName: group.name,
        finalPoints: rankInfo?.points ?? 0,
        rank: rankInfo?.rank ?? null,
        isVisible: setting?.is_visible ?? true,
        adjustedPoints: setting?.adjusted_points ?? 0,
        moderationNote: setting?.moderation_note ?? "",
      };
    });
  },

  async saveLeaderboardModeration(input: {
    seasonId: string;
    groupId: string;
    isVisible: boolean;
    adjustedPoints: number;
    moderationNote?: string;
  }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const payload = {
      season_id: input.seasonId,
      group_id: input.groupId,
      is_visible: input.isVisible,
      adjusted_points: input.adjustedPoints,
      moderation_note: input.moderationNote?.trim() || null,
      updated_by: user.id,
    };

    const { data, error } = await supabase
      .from("guild_leaderboard_group_settings")
      .upsert(payload, { onConflict: "season_id,group_id" })
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data as GuildLeaderboardGroupSetting;
  },

  async contribute(input: { missionId: string; story?: string }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const myGroupId = await getMyPrimaryGroupId(user.id);
    const payload = {
      mission_id: input.missionId,
      user_id: user.id,
      group_id: myGroupId,
      contribution_date: isoDay(new Date()),
      story: input.story?.trim() || null,
    };

    const { data, error } = await supabase
      .from("guild_mission_contributions")
      .upsert(payload, { onConflict: "mission_id,user_id,contribution_date" })
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data as GuildMissionContribution;
  },

  async syncAchievements(input: {
    seasonId: string | null;
    metrics: AchievementRuleInput;
    unlocked: AchievementDefinition[];
  }): Promise<UserAchievement[]> {
    if (!input.seasonId) return [];
    if (!input.unlocked.length) return [];

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const rows = input.unlocked.map((item) => ({
      user_id: user.id,
      season_id: input.seasonId,
      code: item.code,
      title: item.title,
      description: item.description,
      metadata: {
        total_xp: input.metrics.totalXp,
        streak_days: input.metrics.streakDays,
        weekly_mission_progress: input.metrics.weeklyMissionProgress,
      },
    }));

    const { data, error } = await supabase
      .from("user_achievements")
      .upsert(rows, { onConflict: "user_id,code,season_id" })
      .select("*");
    if (error) throw error;
    return (data as UserAchievement[]) ?? [];
  },
};
