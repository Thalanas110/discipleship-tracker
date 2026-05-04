import { useCallback, useEffect, useMemo, useState } from "react";
import { habitService } from "@/integrations/supabase/services/habitService";
import {
  guildService,
  type GuildLeaderboardModerationRow,
  type GuildState,
} from "@/integrations/supabase/services/guildService";
import { roleService } from "@/integrations/supabase/services/roleService";
import type {
  AppRole,
  DailyCallingCard,
  GuildLeaderboardEntry,
  Habit,
  HabitCheckin,
  HabitFrequency,
  PracticeType,
} from "@/types";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Check,
  CircleDot,
  Flame,
  Loader2,
  Plus,
  Sparkles,
  Sprout,
  TreePine,
  Trophy,
  Trash2,
  Users,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { buildGamificationSnapshot, normalizePracticeType, type PracticeEvent } from "@/lib/gamification";
import { deriveAchievementUnlocks } from "@/lib/achievements";

const PRACTICE_LABEL: Record<PracticeType, string> = {
  scripture: "Scripture",
  prayer: "Prayer",
  service: "Service",
  fellowship: "Fellowship",
  witness: "Witness",
  other: "Practice",
};

const PRACTICE_PROMPT: Record<PracticeType, string> = {
  scripture: "What did God show you through Scripture today?",
  prayer: "What did you pray for, and what changed in your heart?",
  service: "Who did you serve today, and how did love show up?",
  fellowship: "How did you strengthen someone in faith today?",
  witness: "Where did you share your story or your faith this week?",
  other: "What spiritual practice helped you stay close to Jesus today?",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function titleCase(input: string) {
  return input.charAt(0).toUpperCase() + input.slice(1);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function GardenMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <Progress value={value} className="h-2.5" />
    </div>
  );
}

function mergeGuildState(previous: GuildState | null, incoming: GuildState) {
  if (!previous) return incoming;
  const seen = new Set<string>();
  const mergedAchievements = [...incoming.achievements, ...previous.achievements].filter((item) => {
    const key = `${item.code}:${item.season_id ?? "none"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { ...incoming, achievements: mergedAchievements.slice(0, 8) };
}

function canModerateLeaderboard(roles: AppRole[]) {
  return roles.includes("admin") || roles.includes("pastor");
}

export default function Habits() {
  const [items, setItems] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<HabitCheckin[]>([]);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [leaderboard, setLeaderboard] = useState<GuildLeaderboardEntry[]>([]);
  const [moderationRows, setModerationRows] = useState<GuildLeaderboardModerationRow[]>([]);
  const [guildState, setGuildState] = useState<GuildState | null>(null);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("bible_reading");
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [saving, setSaving] = useState(false);

  const [checkinOpen, setCheckinOpen] = useState(false);
  const [activeHabit, setActiveHabit] = useState<Habit | null>(null);
  const [reflection, setReflection] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);

  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributionStory, setContributionStory] = useState("");
  const [contributing, setContributing] = useState(false);

  const [moderationOpen, setModerationOpen] = useState(false);
  const [moderationGroupId, setModerationGroupId] = useState("");
  const [moderationVisible, setModerationVisible] = useState<"visible" | "hidden">("visible");
  const [moderationPoints, setModerationPoints] = useState("0");
  const [moderationNote, setModerationNote] = useState("");
  const [savingModeration, setSavingModeration] = useState(false);

  const refreshLeaderboardState = useCallback(async (
    seasonId: string | null,
    shouldLoadModeration: boolean,
  ) => {
    if (!seasonId) {
      setLeaderboard([]);
      setModerationRows([]);
      return;
    }

    const leaderboardPromise = guildService.getLeaderboard(seasonId, 5);
    const moderationPromise = shouldLoadModeration
      ? guildService.getLeaderboardModerationRows(seasonId)
      : Promise.resolve([]);

    const [leaderboardRows, moderation] = await Promise.all([leaderboardPromise, moderationPromise]);
    setLeaderboard(leaderboardRows);
    setModerationRows(moderation);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [habits, persistedGuild, myRoles] = await Promise.all([
        habitService.listMine(),
        guildService.getState(),
        roleService.getMyRoles(),
      ]);
      setItems(habits);
      setRoles(myRoles);
      setGuildState((previous) => mergeGuildState(previous, persistedGuild));
      await refreshLeaderboardState(
        persistedGuild.season?.id ?? null,
        canModerateLeaderboard(myRoles),
      );

      if (!habits.length) {
        setCheckins([]);
      } else {
        const history = await habitService.listRecentCheckinsForHabits(habits.map((habit) => habit.id), 360);
        setCheckins(history);
      }
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [refreshLeaderboardState]);

  useEffect(() => {
    document.title = "Discipleship Journey - Soma";
    load();
  }, [load]);

  const habitById = useMemo(() => {
    const map = new Map<string, Habit>();
    for (const habit of items) map.set(habit.id, habit);
    return map;
  }, [items]);

  const practiceEvents = useMemo<PracticeEvent[]>(() => {
    return checkins.map((checkin) => {
      const habit = habitById.get(checkin.habit_id);
      return {
        date: checkin.checkin_date,
        type: normalizePracticeType(habit?.type),
        note: checkin.note,
        createdAt: checkin.created_at,
      };
    });
  }, [checkins, habitById]);

  const snapshot = useMemo(() => buildGamificationSnapshot(practiceEvents, new Date()), [practiceEvents]);

  useEffect(() => {
    const seasonId = guildState?.season?.id ?? null;
    if (!seasonId) return;

    const metrics = {
      totalXp: snapshot.totalXp,
      streakDays: snapshot.journey.streakDays,
      weeklyMissionProgress: guildState?.contributionsThisWeek ?? 0,
    };
    const unlocked = deriveAchievementUnlocks(metrics);
    if (!unlocked.length) return;

    let cancelled = false;
    guildService
      .syncAchievements({ seasonId, metrics, unlocked })
      .then((saved) => {
        if (cancelled || !saved.length) return;
        setGuildState((previous) => {
          if (!previous) return previous;
          const merged = mergeGuildState(previous, { ...previous, achievements: saved });
          return { ...previous, achievements: merged.achievements };
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    guildState?.season?.id,
    guildState?.contributionsThisWeek,
    snapshot.totalXp,
    snapshot.journey.streakDays,
  ]);

  const todayCheckins = useMemo(() => {
    const set = new Set<string>();
    const today = todayIso();
    for (const checkin of checkins) {
      if (checkin.checkin_date === today) set.add(checkin.habit_id);
    }
    return set;
  }, [checkins]);

  const lastCheckinByHabit = useMemo(() => {
    const map = new Map<string, string>();
    for (const checkin of checkins) {
      if (!map.has(checkin.habit_id)) map.set(checkin.habit_id, checkin.checkin_date);
    }
    return map;
  }, [checkins]);

  const todayCalling = useMemo<DailyCallingCard[]>(() => {
    const sorted = [...items].sort((a, b) => {
      const aDone = todayCheckins.has(a.id) ? 1 : 0;
      const bDone = todayCheckins.has(b.id) ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;

      const aLast = lastCheckinByHabit.get(a.id) ?? "";
      const bLast = lastCheckinByHabit.get(b.id) ?? "";
      if (aLast !== bLast) return aLast.localeCompare(bLast);
      return a.name.localeCompare(b.name);
    });

    return sorted.slice(0, 3).map((habit) => {
      const practiceType = normalizePracticeType(habit.type);
      return {
        habitId: habit.id,
        habitName: habit.name,
        practiceType,
        prompt: PRACTICE_PROMPT[practiceType],
        completedToday: todayCheckins.has(habit.id),
      };
    });
  }, [items, lastCheckinByHabit, todayCheckins]);

  const save = async () => {
    if (!name.trim()) return toast.error("Practice name required");
    setSaving(true);
    try {
      await habitService.create({ name: name.trim(), type, frequency });
      toast.success("Practice added");
      setName("");
      setOpen(false);
      await load();
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this practice?")) return;
    try {
      await habitService.remove(id);
      toast.success("Practice removed");
      await load();
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    }
  };

  const openCheckin = (habit: Habit) => {
    setActiveHabit(habit);
    setReflection("");
    setCheckinOpen(true);
  };

  const completeCheckin = async () => {
    if (!activeHabit) return;
    setCheckingIn(true);
    try {
      await habitService.checkin(activeHabit.id, reflection.trim() || undefined);
      toast.success("Practice completed");
      setCheckinOpen(false);
      setActiveHabit(null);
      setReflection("");
      await load();
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setCheckingIn(false);
    }
  };

  const contributeMission = async () => {
    const mission = guildState?.mission;
    if (!mission) return;
    setContributing(true);
    try {
      await guildService.contribute({ missionId: mission.id, story: contributionStory });
      toast.success("Guild contribution saved");
      setContributeOpen(false);
      setContributionStory("");
      const refreshed = await guildService.getState();
      setGuildState((previous) => mergeGuildState(previous, refreshed));
      await refreshLeaderboardState(
        refreshed.season?.id ?? null,
        canModerate,
      );
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setContributing(false);
    }
  };

  const saveModeration = async () => {
    const seasonId = guildState?.season?.id;
    if (!seasonId || !selectedModerationRow) return;

    const parsedPoints = Number.parseInt(moderationPoints, 10);
    if (Number.isNaN(parsedPoints) || parsedPoints < -100 || parsedPoints > 100) {
      toast.error("Adjusted points must be between -100 and 100");
      return;
    }

    setSavingModeration(true);
    try {
      await guildService.saveLeaderboardModeration({
        seasonId,
        groupId: selectedModerationRow.groupId,
        isVisible: moderationVisible === "visible",
        adjustedPoints: parsedPoints,
        moderationNote,
      });
      toast.success("Leaderboard moderation saved");
      await refreshLeaderboardState(seasonId, true);
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setSavingModeration(false);
    }
  };

  const mission = guildState?.mission ?? null;
  const missionProgress = guildState?.contributionsThisWeek ?? 0;
  const missionTarget = mission?.target_count ?? snapshot.guild.target;
  const missionObjective = mission?.objective ?? snapshot.guild.objective;
  const missionTitle = mission?.title ?? snapshot.guild.title;
  const missionReward = mission?.reward ?? snapshot.guild.reward;
  const missionProgressPercent = Math.min(100, missionTarget ? (missionProgress / missionTarget) * 100 : 0);
  const canModerate = canModerateLeaderboard(roles);
  const highlightedMyGuild = useMemo(() => {
    if (!guildState?.myGroupId) return null;
    return leaderboard.find((row) => row.group_id === guildState.myGroupId) ?? null;
  }, [guildState?.myGroupId, leaderboard]);
  const selectedModerationRow =
    moderationRows.find((row) => row.groupId === moderationGroupId) ?? null;

  useEffect(() => {
    if (!moderationRows.length) return;
    if (!moderationGroupId) {
      setModerationGroupId(moderationRows[0].groupId);
      return;
    }
    const row = moderationRows.find((item) => item.groupId === moderationGroupId);
    if (!row) return;
    setModerationVisible(row.isVisible ? "visible" : "hidden");
    setModerationPoints(String(row.adjustedPoints));
    setModerationNote(row.moderationNote);
  }, [moderationGroupId, moderationRows]);

  return (
    <>
      <PageHeader
        title="Discipleship Journey"
        description="Grow through daily practices, meaningful reflection, and shared mission. This page tracks formation, not just task completion."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New practice
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Add a discipleship practice</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Morning prayer walk"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bible_reading">Scripture</SelectItem>
                      <SelectItem value="prayer">Prayer</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="fellowship">Fellowship</SelectItem>
                      <SelectItem value="witness">Witness</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Frequency</Label>
                  <Select value={frequency} onValueChange={(value) => setFrequency(value as HabitFrequency)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="No practices yet"
          description="Start with 2 to 3 daily practices and turn discipleship into an adventure journey."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add first practice
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <Card className="border-primary/20 bg-gradient-warm p-6 shadow-soft">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Badge variant="secondary" className="mb-2">
                  Stage: {titleCase(snapshot.journey.stage)}
                </Badge>
                <h2 className="font-display text-2xl font-semibold">
                  Level {snapshot.journey.level} Journey
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {snapshot.journey.streakPaused
                    ? "Streak is paused today. Re-engage to continue growth."
                    : "Your discipleship momentum is building steadily."}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-md border bg-card/70 px-3 py-2">
                  <p className="text-muted-foreground">Total XP</p>
                  <p className="font-semibold">{snapshot.totalXp}</p>
                </div>
                <div className="rounded-md border bg-card/70 px-3 py-2">
                  <p className="text-muted-foreground">Today</p>
                  <p className="font-semibold">{snapshot.todayXp} XP</p>
                </div>
                <div className="rounded-md border bg-card/70 px-3 py-2">
                  <p className="text-muted-foreground">Streak</p>
                  <p className="font-semibold">{snapshot.journey.streakDays} days</p>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {snapshot.journey.currentLevelXp}/{snapshot.journey.nextLevelXp} XP to next level
                </span>
                <span>{snapshot.journey.progressPercent}%</span>
              </div>
              <Progress value={snapshot.journey.progressPercent} />
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-xl font-medium">Today&apos;s Calling</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete meaningful practices and add reflection for stronger growth.
                  </p>
                </div>
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-3">
                {todayCalling.map((card) => (
                  <div key={card.habitId} className="rounded-lg border bg-card/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{card.habitName}</p>
                        <p className="text-xs text-muted-foreground">{card.prompt}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline">{PRACTICE_LABEL[card.practiceType]}</Badge>
                          {card.completedToday && <Badge variant="secondary">Completed today</Badge>}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={card.completedToday ? "secondary" : "outline"}
                        disabled={card.completedToday}
                        onClick={() => {
                          const habit = habitById.get(card.habitId);
                          if (habit) openCheckin(habit);
                        }}
                      >
                        <Check className="mr-1 h-3 w-3" />
                        {card.completedToday ? "Done" : "Complete"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-xl font-medium">Soul Garden</h3>
                <TreePine className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-3">
                <GardenMetric label="Roots (Prayer)" value={snapshot.garden.roots} />
                <GardenMetric label="Branches (Scripture)" value={snapshot.garden.branches} />
                <GardenMetric label="Fruit (Service)" value={snapshot.garden.fruit} />
                <GardenMetric label="Flowers (Fellowship)" value={snapshot.garden.flowers} />
                <GardenMetric label="Light (Witness)" value={snapshot.garden.light} />
              </div>
              <div className="mt-4 rounded-md border bg-secondary/40 p-3 text-sm">
                <p className="font-medium">Overall health: {snapshot.garden.overallHealth}%</p>
                <p className="text-muted-foreground">
                  {snapshot.garden.seasonBloom
                    ? "Season bloom active. Keep this rhythm to sustain momentum."
                    : "Keep practicing this week to unlock season bloom."}
                </p>
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-medium">Guild Mission</h3>
                <p className="text-sm text-muted-foreground">{missionObjective}</p>
              </div>
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="rounded-md border bg-card/30 p-4">
              <p className="font-medium">{missionTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">Reward: {missionReward}</p>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Progress: {missionProgress}/{missionTarget}
                  </span>
                  <span>Weekly consistency: {snapshot.weeklyConsistency}%</span>
                </div>
                <Progress value={missionProgressPercent} />
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!mission}
                  onClick={() => setContributeOpen(true)}
                >
                  Share mission story
                </Button>
              </div>
            </div>
            <div className="mt-4 rounded-md border bg-secondary/40 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-warning" />
                <p className="text-sm font-medium">Recent achievements</p>
              </div>
              {guildState?.achievements?.length ? (
                <div className="flex flex-wrap gap-2">
                  {guildState.achievements.map((achievement) => (
                    <Badge key={`${achievement.code}:${achievement.season_id ?? "none"}`} variant="secondary">
                      {achievement.title}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Keep practicing and contributing to unlock your first badge.
                </p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-medium">Season Celebration Board</h3>
                <p className="text-sm text-muted-foreground">
                  We celebrate visible momentum and stories of faithfulness, not public low rankings.
                </p>
              </div>
              {canModerate && (
                <Button size="sm" variant="outline" onClick={() => setModerationOpen(true)}>
                  <ShieldCheck className="mr-1 h-4 w-4" />
                  Moderate
                </Button>
              )}
            </div>
            {leaderboard.length ? (
              <div className="space-y-2">
                {leaderboard.map((row) => (
                  <div
                    key={row.group_id}
                    className="flex items-center justify-between rounded-md border bg-card/30 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">#{row.rank}</Badge>
                      <div>
                        <p className="text-sm font-medium">{row.group_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.story_count} stories · {row.active_days} active days
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold">{row.final_points} pts</p>
                  </div>
                ))}
                {highlightedMyGuild && (
                  <p className="pt-1 text-xs text-muted-foreground">
                    Your guild is in the celebration board this week.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No guild contributions recorded yet this week.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-medium">Practice Library</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your recurring practices. The journey and missions are built from this list.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((habit) => {
                const practiceType = normalizePracticeType(habit.type);
                const doneToday = todayCheckins.has(habit.id);
                return (
                  <div key={habit.id} className="rounded-lg border bg-card/40 p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <p className="font-medium">{habit.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {PRACTICE_LABEL[practiceType]} - {habit.frequency}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => remove(habit.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant={doneToday ? "secondary" : "outline"}>
                        {doneToday ? "Completed" : "Pending"}
                      </Badge>
                      <Button
                        size="sm"
                        variant={doneToday ? "secondary" : "outline"}
                        disabled={doneToday}
                        onClick={() => openCheckin(habit)}
                      >
                        {doneToday ? (
                          <>
                            <CircleDot className="mr-1 h-3 w-3" />
                            Today done
                          </>
                        ) : (
                          <>
                            <Check className="mr-1 h-3 w-3" />
                            Complete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      <Dialog open={checkinOpen} onOpenChange={setCheckinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Complete Practice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <p className="font-medium">{activeHabit?.name}</p>
              <p className="text-xs text-muted-foreground">
                {activeHabit ? PRACTICE_PROMPT[normalizePracticeType(activeHabit.type)] : ""}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Reflection (optional, boosts growth)</Label>
              <Textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Write one or two sentences about what God taught you or how you responded."
                className="min-h-[110px]"
              />
            </div>
            <div className="rounded-md border bg-secondary/40 p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-accent" />
                XP is capped daily and favors diverse, meaningful practice.
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCheckinOpen(false)} disabled={checkingIn}>
              Cancel
            </Button>
            <Button onClick={completeCheckin} disabled={checkingIn}>
              {checkingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contributeOpen} onOpenChange={setContributeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Guild Mission Story</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              Share one short story of how you lived this week&apos;s mission.
            </p>
            <Textarea
              value={contributionStory}
              onChange={(e) => setContributionStory(e.target.value)}
              placeholder="I encouraged a friend who was struggling and prayed with them after school."
              className="min-h-[110px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setContributeOpen(false)} disabled={contributing}>
              Cancel
            </Button>
            <Button onClick={contributeMission} disabled={contributing || !guildState?.mission}>
              {contributing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save contribution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moderationOpen} onOpenChange={setModerationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Leaderboard Moderation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Guild</Label>
              <Select value={moderationGroupId} onValueChange={setModerationGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select guild" />
                </SelectTrigger>
                <SelectContent>
                  {moderationRows.map((row) => (
                    <SelectItem key={row.groupId} value={row.groupId}>
                      {row.groupName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              Current score: {selectedModerationRow?.finalPoints ?? 0} pts
              {selectedModerationRow?.rank ? ` · rank #${selectedModerationRow.rank}` : ""}
            </div>
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <Select
                value={moderationVisible}
                onValueChange={(value) => setModerationVisible(value as "visible" | "hidden")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visible">Visible on board</SelectItem>
                  <SelectItem value="hidden">Hidden from board</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Point adjustment (-100 to 100)</Label>
              <Input
                type="number"
                min={-100}
                max={100}
                value={moderationPoints}
                onChange={(e) => setModerationPoints(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Moderation note</Label>
              <Textarea
                value={moderationNote}
                onChange={(e) => setModerationNote(e.target.value)}
                placeholder="Optional private note for moderation context."
                className="min-h-[90px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModerationOpen(false)} disabled={savingModeration}>
              Cancel
            </Button>
            <Button
              onClick={saveModeration}
              disabled={!selectedModerationRow || savingModeration}
            >
              {savingModeration && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save moderation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
