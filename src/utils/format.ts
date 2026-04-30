import type { RelationshipStage, FollowupStatus } from "@/types";

export const stageBadgeClass: Record<RelationshipStage, string> = {
  new_believer: "bg-stage-new/15 text-stage-new border-stage-new/30",
  foundations: "bg-stage-foundations/15 text-stage-foundations border-stage-foundations/30",
  growing: "bg-stage-growing/15 text-stage-growing border-stage-growing/30",
  serving: "bg-stage-serving/15 text-stage-serving border-stage-serving/30",
  mentoring: "bg-stage-mentoring/15 text-stage-mentoring border-stage-mentoring/30",
  multiplying: "bg-stage-multiplying/15 text-stage-multiplying border-stage-multiplying/30",
};

export const followupStatusClass: Record<FollowupStatus, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/30",
  completed: "bg-success/15 text-success border-success/30",
  missed: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export function formatDate(d?: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return d; }
}

export function formatDateTime(d?: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
  catch { return d; }
}

export function relativeDays(d?: string | null) {
  if (!d) return null;
  const days = Math.floor((Date.now() - new Date(d).getTime()) / (24*3600*1000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days/30)} months ago`;
  return `${Math.floor(days/365)} years ago`;
}

export function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(/\s+/).slice(0,2).map(p => p[0]?.toUpperCase() ?? "").join("");
}
