import type {
  DiscipleshipStageName,
  GamificationSnapshot,
  GardenState,
  GuildMissionState,
  JourneyState,
  PracticeType,
} from "@/types";

export interface PracticeEvent {
  date: string;
  type: PracticeType;
  note?: string | null;
  createdAt?: string | null;
}

export interface DailyXpResult {
  total: number;
  raw: number;
  diversityBonus: number;
  capped: boolean;
}

const BASE_XP = 20;
const DIVERSITY_BONUS = 10;
const DAILY_XP_CAP = 100;
const XP_PER_LEVEL = 100;

function toIsoDate(input: Date) {
  return input.toISOString().slice(0, 10);
}

function minusDays(input: Date, days: number) {
  const next = new Date(input);
  next.setUTCDate(next.getUTCDate() - days);
  return next;
}

function stageForLevel(level: number): DiscipleshipStageName {
  if (level >= 10) return "multiplying";
  if (level >= 7) return "serving";
  if (level >= 4) return "growing";
  return "rooted";
}

function repetitionMultiplier(runLength: number) {
  if (runLength <= 2) return 1;
  if (runLength === 3) return 0.5;
  return 0.25;
}

function scoreToPercent(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function normalizePracticeType(input?: string | null): PracticeType {
  const value = (input ?? "").trim().toLowerCase();
  if (value === "bible_reading" || value === "scripture") return "scripture";
  if (value === "prayer") return "prayer";
  if (value === "service") return "service";
  if (value === "fellowship") return "fellowship";
  if (value === "witness") return "witness";
  return "other";
}

export function calculateReflectionBonus(note?: string | null) {
  const text = (note ?? "").trim();
  const length = text.length;
  if (!length) return 0;
  if (length >= 100) return 10;
  if (length >= 60) return 8;
  if (length >= 30) return 6;
  if (length >= 15) return 4;
  if (length >= 5) return 2;
  return 1;
}

export function calculateDailyXp(events: PracticeEvent[]): DailyXpResult {
  const ordered = [...events].sort((a, b) => {
    const aKey = a.createdAt ?? `${a.date}T00:00:00.000Z`;
    const bKey = b.createdAt ?? `${b.date}T00:00:00.000Z`;
    return aKey.localeCompare(bKey);
  });

  let raw = 0;
  let runLength = 0;
  let prevType: PracticeType | null = null;

  for (const item of ordered) {
    runLength = item.type === prevType ? runLength + 1 : 1;
    prevType = item.type;

    const baseWithReflection = BASE_XP + calculateReflectionBonus(item.note);
    raw += Math.round(baseWithReflection * repetitionMultiplier(runLength));
  }

  const uniqueTypes = new Set(ordered.map((item) => item.type));
  const diversityBonus = uniqueTypes.size >= 3 ? DIVERSITY_BONUS : 0;
  raw += diversityBonus;

  const total = Math.min(DAILY_XP_CAP, raw);
  return {
    total,
    raw,
    diversityBonus,
    capped: raw > DAILY_XP_CAP,
  };
}

export function calculateStreak(dateStrings: string[], today: Date = new Date()) {
  const uniqueDays = new Set(dateStrings);
  let days = 0;
  let graceUsed = false;
  let paused = false;

  for (let offset = 0; offset < 365; offset += 1) {
    const dateKey = toIsoDate(minusDays(today, offset));
    if (uniqueDays.has(dateKey)) {
      days += 1;
      continue;
    }
    if (!graceUsed) {
      graceUsed = true;
      paused = offset === 0;
      continue;
    }
    break;
  }

  if (!days) return { days: 0, paused: false };
  return { days, paused };
}

export function calculateLevelState(totalXp: number) {
  const safeXp = Math.max(0, Math.floor(totalXp));
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const currentLevelXp = safeXp % XP_PER_LEVEL;
  const nextLevelXp = XP_PER_LEVEL;
  const progressPercent = scoreToPercent((currentLevelXp / XP_PER_LEVEL) * 100);

  return {
    level,
    stage: stageForLevel(level),
    currentLevelXp,
    nextLevelXp,
    progressPercent,
  };
}

export function calculateGardenState(events: PracticeEvent[], streakDays: number, today: Date = new Date()): GardenState {
  const cutoff = toIsoDate(minusDays(today, 13));
  const recent = events.filter((item) => item.date >= cutoff);

  const counts: Record<PracticeType, number> = {
    scripture: 0,
    prayer: 0,
    service: 0,
    fellowship: 0,
    witness: 0,
    other: 0,
  };
  for (const item of recent) counts[item.type] += 1;

  const streakLift = streakDays >= 5 ? 8 : 0;
  const score = (count: number) => scoreToPercent(count * 18 + streakLift);

  const roots = score(counts.prayer);
  const branches = score(counts.scripture);
  const fruit = score(counts.service);
  const flowers = score(counts.fellowship);
  const light = score(counts.witness);
  const overallHealth = scoreToPercent((roots + branches + fruit + flowers + light) / 5);

  const activeDays = new Set(recent.map((item) => item.date)).size;
  const seasonBloom = streakDays >= 5 && activeDays >= 4;

  return { roots, branches, fruit, flowers, light, overallHealth, seasonBloom };
}

function defaultGuildState(weeklyWindowStart: string): GuildMissionState {
  return {
    title: "Serve One Person This Week",
    objective: "Complete practices from at least 3 different categories this week.",
    progress: 0,
    target: 3,
    reward: "Guild Lantern +50",
    weeklyWindowStart,
  };
}

function calculateWeeklyConsistency(events: PracticeEvent[], today: Date) {
  const start = toIsoDate(minusDays(today, 6));
  const weekly = events.filter((item) => item.date >= start);
  const activeDays = new Set(weekly.map((item) => item.date)).size;
  return scoreToPercent((activeDays / 7) * 100);
}

export function buildGamificationSnapshot(events: PracticeEvent[], today: Date = new Date()): GamificationSnapshot {
  const byDay = new Map<string, PracticeEvent[]>();
  for (const item of events) {
    const existing = byDay.get(item.date) ?? [];
    existing.push(item);
    byDay.set(item.date, existing);
  }

  let totalXp = 0;
  const dailyXp = new Map<string, number>();
  for (const [day, dayEvents] of byDay) {
    const score = calculateDailyXp(dayEvents);
    dailyXp.set(day, score.total);
    totalXp += score.total;
  }

  const todayKey = toIsoDate(today);
  const streak = calculateStreak([...byDay.keys()], today);
  const levelState = calculateLevelState(totalXp);
  const garden = calculateGardenState(events, streak.days, today);
  const weeklyConsistency = calculateWeeklyConsistency(events, today);

  const weekStart = toIsoDate(minusDays(today, today.getUTCDay()));
  const weeklyEvents = events.filter((item) => item.date >= toIsoDate(minusDays(today, 6)));
  const weeklyTypes = new Set(weeklyEvents.map((item) => item.type));
  const guild = defaultGuildState(weekStart);
  guild.progress = Math.min(guild.target, weeklyTypes.size);

  const journey: JourneyState = {
    ...levelState,
    totalXp,
    streakDays: streak.days,
    streakPaused: streak.paused,
  };

  return {
    journey,
    garden,
    guild,
    todayXp: dailyXp.get(todayKey) ?? 0,
    weeklyConsistency,
    totalXp,
  };
}
