// Domain types for Discipleship Tracker
export type AppRole = 'admin' | 'pastor' | 'leader' | 'disciple' | 'viewer' | 'developer';
export type RelationshipStatus = 'active' | 'paused' | 'completed';
export type RelationshipStage = 'new_believer' | 'foundations' | 'growing' | 'serving' | 'mentoring' | 'multiplying';
export type FollowupStatus = 'pending' | 'completed' | 'missed' | 'cancelled';
export type NoteVisibility = 'private' | 'leader_only' | 'pastor_visible';
export type PrayerVisibility = 'private' | 'leader_only' | 'public';
export type HabitFrequency = 'daily' | 'weekly' | 'monthly';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  ministry_id: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ministry {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscipleshipRelationship {
  id: string;
  leader_id: string;
  disciple_id: string;
  status: RelationshipStatus;
  stage: RelationshipStage;
  start_date: string;
  notes: string | null;
  ministry_id: string | null;
  created_at: string;
  updated_at: string;
  // joined
  leader?: Profile;
  disciple?: Profile;
}

export interface Meeting {
  id: string;
  relationship_id: string;
  meeting_date: string;
  summary: string | null;
  spiritual_notes: string | null;
  next_steps: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowUp {
  id: string;
  relationship_id: string;
  task: string;
  due_date: string | null;
  status: FollowupStatus;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  type: string | null;
  frequency: HabitFrequency;
  created_at: string;
  updated_at: string;
}

export interface HabitCheckin {
  id: string;
  habit_id: string;
  user_id: string;
  checkin_date: string;
  note: string | null;
  created_at: string;
}

export interface PrayerRequest {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  visibility: PrayerVisibility;
  answered: boolean;
  answered_at: string | null;
  answered_note: string | null;
  ministry_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  disciple_id: string;
  type: string;
  title: string;
  achieved_on: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  about_user_id: string;
  author_id: string;
  content: string;
  visibility: NoteVisibility;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  ministry_id: string | null;
  leader_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CareAlert {
  type: 'no_recent_meeting' | 'missed_followup' | 'inactive';
  relationship_id: string;
  disciple_id: string;
  disciple_name: string;
  days?: number;
  message: string;
}

export interface DashboardSummary {
  role_view: 'leader' | 'disciple' | 'admin';
  active_disciples: number;
  followups_due: number;
  recent_meetings: number;
  care_alerts: CareAlert[];
  upcoming?: Meeting[];
}

export const STAGE_LABEL: Record<RelationshipStage, string> = {
  new_believer: 'New Believer',
  foundations: 'Foundations',
  growing: 'Growing',
  serving: 'Serving',
  mentoring: 'Mentoring',
  multiplying: 'Multiplying',
};

export const STAGE_ORDER: RelationshipStage[] = [
  'new_believer','foundations','growing','serving','mentoring','multiplying'
];
