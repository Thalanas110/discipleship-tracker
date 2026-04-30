import { handle, HttpError, hasAnyRole } from "../_shared/util.ts";

type RelationshipRow = {
  id: string;
  status: string;
  stage: string;
  leader_id: string;
};

type MeetingRow = {
  meeting_date: string;
  relationship_id: string;
};

type FollowupRow = {
  status: string;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
  relationship_id: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

const STAGES = [
  "new_believer",
  "foundations",
  "growing",
  "serving",
  "mentoring",
  "multiplying",
] as const;

const FOLLOWUP_STATUSES = ["pending", "completed", "missed", "cancelled"] as const;

function getMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function makeMonthBuckets(now: Date, months: number) {
  const buckets: Array<{ month_key: string; month_label: string; month_start_iso: string }> = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.push({
      month_key: getMonthKey(monthStart),
      month_label: getMonthLabel(monthStart),
      month_start_iso: monthStart.toISOString(),
    });
  }

  return buckets;
}

Deno.serve((req) =>
  handle(req, async (ctx) => {
    const isAdmin = await hasAnyRole(ctx.supabaseAdmin, ctx.userId, ["admin", "pastor", "viewer"]);
    if (!isAdmin) throw new HttpError("Forbidden", 403);

    const admin = ctx.supabaseAdmin;
    const now = new Date();
    const monthBuckets = makeMonthBuckets(now, 6);
    const firstMonthStartIso = monthBuckets[0]?.month_start_iso ?? new Date(0).toISOString();
    const thirtyDaysAgoIso = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

    const [profilesResult, relationshipsResult, meetingsCountResult, meetingsTrendResult, followupsResult] =
      await Promise.all([
        admin.from("profiles").select("*", { count: "exact", head: true }),
        admin.from("discipleship_relationships").select("id, status, stage, leader_id"),
        admin
          .from("meetings")
          .select("*", { count: "exact", head: true })
          .gte("meeting_date", thirtyDaysAgoIso),
        admin
          .from("meetings")
          .select("meeting_date, relationship_id")
          .gte("meeting_date", firstMonthStartIso),
        admin.from("follow_ups").select("status, due_date, created_at, completed_at, relationship_id"),
      ]);

    if (profilesResult.error) throw new HttpError(profilesResult.error.message, 500);
    if (relationshipsResult.error) throw new HttpError(relationshipsResult.error.message, 500);
    if (meetingsCountResult.error) throw new HttpError(meetingsCountResult.error.message, 500);
    if (meetingsTrendResult.error) throw new HttpError(meetingsTrendResult.error.message, 500);
    if (followupsResult.error) throw new HttpError(followupsResult.error.message, 500);

    const relationships = (relationshipsResult.data ?? []) as RelationshipRow[];
    const meetingsTrend = (meetingsTrendResult.data ?? []) as MeetingRow[];
    const followups = (followupsResult.data ?? []) as FollowupRow[];

    const activeRelationships = relationships.filter((relationship) => relationship.status === "active");

    const by_stage: Record<string, number> = Object.fromEntries(STAGES.map((stage) => [stage, 0]));
    for (const relationship of activeRelationships) {
      by_stage[relationship.stage] = (by_stage[relationship.stage] ?? 0) + 1;
    }

    const relationshipToLeader = new Map<string, string>();
    for (const relationship of relationships) {
      relationshipToLeader.set(relationship.id, relationship.leader_id);
    }

    const followupCounts: Record<string, number> = Object.fromEntries(FOLLOWUP_STATUSES.map((status) => [status, 0]));
    const todayIso = now.toISOString().slice(0, 10);
    let at_risk = 0;

    for (const followup of followups) {
      followupCounts[followup.status] = (followupCounts[followup.status] ?? 0) + 1;
      if (followup.status === "pending" && followup.due_date && followup.due_date < todayIso) {
        at_risk += 1;
      }
    }

    const monthlyActivityMap = new Map(
      monthBuckets.map((bucket) => [
        bucket.month_key,
        {
          month_key: bucket.month_key,
          month_label: bucket.month_label,
          meetings: 0,
          followups_created: 0,
          followups_completed: 0,
        },
      ]),
    );

    for (const meeting of meetingsTrend) {
      const key = getMonthKey(new Date(meeting.meeting_date));
      const bucket = monthlyActivityMap.get(key);
      if (bucket) bucket.meetings += 1;
    }

    for (const followup of followups) {
      if (followup.created_at) {
        const createdKey = getMonthKey(new Date(followup.created_at));
        const createdBucket = monthlyActivityMap.get(createdKey);
        if (createdBucket) createdBucket.followups_created += 1;
      }

      if (followup.completed_at) {
        const completedKey = getMonthKey(new Date(followup.completed_at));
        const completedBucket = monthlyActivityMap.get(completedKey);
        if (completedBucket) completedBucket.followups_completed += 1;
      }
    }

    const activeByLeader = new Map<string, number>();
    for (const relationship of activeRelationships) {
      activeByLeader.set(relationship.leader_id, (activeByLeader.get(relationship.leader_id) ?? 0) + 1);
    }

    const leaderStats = new Map<
      string,
      { active_disciples: number; meetings_last_30d: number; followups_pending: number; at_risk_followups: number }
    >();

    const ensureLeader = (leaderId: string) => {
      if (!leaderStats.has(leaderId)) {
        leaderStats.set(leaderId, {
          active_disciples: activeByLeader.get(leaderId) ?? 0,
          meetings_last_30d: 0,
          followups_pending: 0,
          at_risk_followups: 0,
        });
      }
      return leaderStats.get(leaderId)!;
    };

    for (const [leaderId, activeDisciples] of activeByLeader.entries()) {
      leaderStats.set(leaderId, {
        active_disciples: activeDisciples,
        meetings_last_30d: 0,
        followups_pending: 0,
        at_risk_followups: 0,
      });
    }

    for (const meeting of meetingsTrend) {
      if (meeting.meeting_date < thirtyDaysAgoIso) continue;
      const leaderId = relationshipToLeader.get(meeting.relationship_id);
      if (!leaderId) continue;
      const current = ensureLeader(leaderId);
      current.meetings_last_30d += 1;
    }

    for (const followup of followups) {
      if (followup.status !== "pending") continue;
      const leaderId = relationshipToLeader.get(followup.relationship_id);
      if (!leaderId) continue;
      const current = ensureLeader(leaderId);
      current.followups_pending += 1;
      if (followup.due_date && followup.due_date < todayIso) {
        current.at_risk_followups += 1;
      }
    }

    const leaderIds = Array.from(leaderStats.keys());
    const leaderProfiles = new Map<string, ProfileRow>();

    if (leaderIds.length > 0) {
      const profilesLookup = await admin.from("profiles").select("id, display_name, email").in("id", leaderIds);
      if (profilesLookup.error) throw new HttpError(profilesLookup.error.message, 500);

      for (const profile of (profilesLookup.data ?? []) as ProfileRow[]) {
        leaderProfiles.set(profile.id, profile);
      }
    }

    const followups_pending = followupCounts.pending ?? 0;
    const followups_completed = followupCounts.completed ?? 0;
    const followupCompletionRate = followups.length > 0 ? (followups_completed / followups.length) * 100 : 0;

    const leader_performance = leaderIds
      .map((leaderId) => {
        const leader = leaderStats.get(leaderId)!;
        const profile = leaderProfiles.get(leaderId);
        return {
          leader_id: leaderId,
          leader_name: profile?.display_name ?? profile?.email ?? "Leader",
          active_disciples: leader.active_disciples,
          meetings_last_30d: leader.meetings_last_30d,
          followups_pending: leader.followups_pending,
          at_risk_followups: leader.at_risk_followups,
        };
      })
      .sort((a, b) => {
        if (b.at_risk_followups !== a.at_risk_followups) return b.at_risk_followups - a.at_risk_followups;
        if (b.active_disciples !== a.active_disciples) return b.active_disciples - a.active_disciples;
        return b.meetings_last_30d - a.meetings_last_30d;
      });

    const activeLeaderCount = Array.from(activeByLeader.keys()).length;

    return {
      generated_at: now.toISOString(),
      total_users: profilesResult.count ?? 0,
      active_relationships: activeRelationships.length,
      meetings_last_30d: meetingsCountResult.count ?? 0,
      followups_pending,
      followups_completed,
      at_risk,
      followup_completion_rate: Number(followupCompletionRate.toFixed(2)),
      active_disciples_per_leader:
        activeLeaderCount > 0 ? Number((activeRelationships.length / activeLeaderCount).toFixed(2)) : 0,
      by_stage,
      followup_status_breakdown: FOLLOWUP_STATUSES.map((status) => ({
        status,
        count: followupCounts[status] ?? 0,
      })),
      monthly_activity: Array.from(monthlyActivityMap.values()),
      leader_performance,
    };
  }),
);
