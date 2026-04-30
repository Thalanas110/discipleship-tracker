
-- ============================================================
-- 001 INITIAL SCHEMA
-- ============================================================

-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'pastor', 'leader', 'disciple', 'viewer', 'developer');
CREATE TYPE public.relationship_status AS ENUM ('active', 'paused', 'completed');
CREATE TYPE public.relationship_stage AS ENUM ('new_believer', 'foundations', 'growing', 'serving', 'mentoring', 'multiplying');
CREATE TYPE public.followup_status AS ENUM ('pending', 'completed', 'missed', 'cancelled');
CREATE TYPE public.note_visibility AS ENUM ('private', 'leader_only', 'pastor_visible');
CREATE TYPE public.prayer_visibility AS ENUM ('private', 'leader_only', 'public');
CREATE TYPE public.habit_frequency AS ENUM ('daily', 'weekly', 'monthly');

-- Updated-at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Ministries
CREATE TABLE public.ministries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_ministries_updated BEFORE UPDATE ON public.ministries FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  phone TEXT,
  ministry_id UUID REFERENCES public.ministries(id) ON DELETE SET NULL,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_profiles_ministry ON public.profiles(ministry_id);

-- Roles & Permissions
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name app_role NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE (role, permission_id)
);

-- Security definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _perm TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id AND p.name = _perm
  )
$$;

CREATE OR REPLACE FUNCTION public.user_ministry(_user_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ministry_id FROM public.profiles WHERE id = _user_id
$$;

-- Groups
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  ministry_id UUID REFERENCES public.ministries(id) ON DELETE CASCADE,
  leader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_groups_updated BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_in_group TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, member_id)
);

-- Discipleship relationships (FIRST-CLASS)
CREATE TABLE public.discipleship_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  disciple_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status relationship_status NOT NULL DEFAULT 'active',
  stage relationship_stage NOT NULL DEFAULT 'new_believer',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  ministry_id UUID REFERENCES public.ministries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (leader_id, disciple_id)
);
CREATE TRIGGER trg_rel_updated BEFORE UPDATE ON public.discipleship_relationships FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_rel_leader ON public.discipleship_relationships(leader_id);
CREATE INDEX idx_rel_disciple ON public.discipleship_relationships(disciple_id);

-- Helper: is user the leader for a given disciple?
CREATE OR REPLACE FUNCTION public.is_leader_of(_leader UUID, _disciple UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.discipleship_relationships
    WHERE leader_id = _leader AND disciple_id = _disciple AND status = 'active'
  )
$$;

-- Meetings
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.discipleship_relationships(id) ON DELETE CASCADE,
  meeting_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  summary TEXT,
  spiritual_notes TEXT,
  next_steps TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_meetings_updated BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_meetings_rel ON public.meetings(relationship_id);

-- Follow-ups
CREATE TABLE public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.discipleship_relationships(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  due_date DATE,
  status followup_status NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_fu_updated BEFORE UPDATE ON public.follow_ups FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_fu_rel ON public.follow_ups(relationship_id);
CREATE INDEX idx_fu_status ON public.follow_ups(status);

-- Habits
CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  frequency habit_frequency NOT NULL DEFAULT 'daily',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_habits_updated BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_habits_user ON public.habits(user_id);

CREATE TABLE public.habit_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, checkin_date)
);
CREATE INDEX idx_checkins_user ON public.habit_checkins(user_id);

-- Prayer requests
CREATE TABLE public.prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  visibility prayer_visibility NOT NULL DEFAULT 'private',
  answered BOOLEAN NOT NULL DEFAULT false,
  answered_at TIMESTAMPTZ,
  answered_note TEXT,
  ministry_id UUID REFERENCES public.ministries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_pr_updated BEFORE UPDATE ON public.prayer_requests FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_pr_user ON public.prayer_requests(user_id);

-- Milestones
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disciple_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  achieved_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_ms_updated BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_ms_disciple ON public.milestones(disciple_id);

-- Notes
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  about_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  visibility note_visibility NOT NULL DEFAULT 'private',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_notes_updated BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_notes_about ON public.notes(about_user_id);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user ON public.notifications(user_id);

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 002 RLS POLICIES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipleship_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_self_or_privileged" ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.has_any_role(auth.uid(), ARRAY['admin','pastor','viewer','developer']::app_role[])
    OR EXISTS (SELECT 1 FROM public.discipleship_relationships r WHERE r.disciple_id = profiles.id AND r.leader_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.discipleship_relationships r WHERE r.leader_id = profiles.id AND r.disciple_id = auth.uid())
  );
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[]));
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- ministries
CREATE POLICY "ministries_select_all_auth" ON public.ministries FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ministries_admin_all" ON public.ministries FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[]));

-- roles & permissions (read-only for auth users; admins manage)
CREATE POLICY "roles_select" ON public.roles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "roles_admin" ON public.roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "perm_select" ON public.permissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "perm_admin" ON public.permissions FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "rp_select" ON public.role_permissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "rp_admin" ON public.role_permissions FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- user_roles
CREATE POLICY "ur_select_self_or_admin" ON public.user_roles FOR SELECT
  USING (user_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[]));
CREATE POLICY "ur_admin_manage" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- groups
CREATE POLICY "groups_select" ON public.groups FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "groups_manage" ON public.groups FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['admin','pastor','leader']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','pastor','leader']::app_role[]));

-- group_members
CREATE POLICY "gm_select" ON public.group_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "gm_manage" ON public.group_members FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['admin','pastor','leader']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','pastor','leader']::app_role[]));

-- relationships
CREATE POLICY "rel_select" ON public.discipleship_relationships FOR SELECT
  USING (
    leader_id = auth.uid() OR disciple_id = auth.uid()
    OR public.has_any_role(auth.uid(), ARRAY['admin','pastor','viewer']::app_role[])
  );
CREATE POLICY "rel_manage" ON public.discipleship_relationships FOR ALL
  USING (
    leader_id = auth.uid()
    OR public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[])
  )
  WITH CHECK (
    leader_id = auth.uid()
    OR public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[])
  );

-- meetings
CREATE POLICY "meet_select" ON public.meetings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.discipleship_relationships r WHERE r.id = meetings.relationship_id AND (r.leader_id = auth.uid() OR r.disciple_id = auth.uid()))
    OR public.has_any_role(auth.uid(), ARRAY['admin','pastor','viewer']::app_role[])
  );
CREATE POLICY "meet_manage" ON public.meetings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.discipleship_relationships r WHERE r.id = meetings.relationship_id AND r.leader_id = auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[])
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.discipleship_relationships r WHERE r.id = meetings.relationship_id AND r.leader_id = auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[])
  );

-- follow_ups
CREATE POLICY "fu_select" ON public.follow_ups FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.discipleship_relationships r WHERE r.id = follow_ups.relationship_id AND (r.leader_id = auth.uid() OR r.disciple_id = auth.uid()))
    OR public.has_any_role(auth.uid(), ARRAY['admin','pastor','viewer']::app_role[])
  );
CREATE POLICY "fu_manage" ON public.follow_ups FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.discipleship_relationships r WHERE r.id = follow_ups.relationship_id AND r.leader_id = auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[])
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.discipleship_relationships r WHERE r.id = follow_ups.relationship_id AND r.leader_id = auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[])
  );

-- habits (own)
CREATE POLICY "habits_select" ON public.habits FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_leader_of(auth.uid(), user_id)
    OR public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[])
  );
CREATE POLICY "habits_manage_self" ON public.habits FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "checkins_select" ON public.habit_checkins FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_leader_of(auth.uid(), user_id)
    OR public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[])
  );
CREATE POLICY "checkins_manage_self" ON public.habit_checkins FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- prayer_requests
CREATE POLICY "pr_select" ON public.prayer_requests FOR SELECT
  USING (
    user_id = auth.uid()
    OR (visibility = 'public' AND auth.uid() IS NOT NULL)
    OR (visibility = 'leader_only' AND public.is_leader_of(auth.uid(), user_id))
    OR public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[])
  );
CREATE POLICY "pr_manage_self" ON public.prayer_requests FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- milestones
CREATE POLICY "ms_select" ON public.milestones FOR SELECT
  USING (
    disciple_id = auth.uid()
    OR public.is_leader_of(auth.uid(), disciple_id)
    OR public.has_any_role(auth.uid(), ARRAY['admin','pastor','viewer']::app_role[])
  );
CREATE POLICY "ms_manage" ON public.milestones FOR ALL
  USING (
    disciple_id = auth.uid()
    OR public.is_leader_of(auth.uid(), disciple_id)
    OR public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[])
  )
  WITH CHECK (
    disciple_id = auth.uid()
    OR public.is_leader_of(auth.uid(), disciple_id)
    OR public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[])
  );

-- notes (visibility-aware)
CREATE POLICY "notes_select" ON public.notes FOR SELECT
  USING (
    author_id = auth.uid()
    OR (visibility = 'leader_only' AND public.is_leader_of(auth.uid(), about_user_id))
    OR (visibility = 'pastor_visible' AND (public.is_leader_of(auth.uid(), about_user_id) OR public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[])))
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "notes_insert_author" ON public.notes FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "notes_update_author" ON public.notes FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "notes_delete_author" ON public.notes FOR DELETE USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- notifications
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- audit logs
CREATE POLICY "audit_admin_only" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- 003 SEED ROLES & PERMISSIONS
-- ============================================================
INSERT INTO public.roles (name, description) VALUES
  ('admin','Full system access'),
  ('pastor','Ministry-wide oversight'),
  ('leader','Disciples assigned to them'),
  ('disciple','Personal data and meetings'),
  ('viewer','Read-only ministry access'),
  ('developer','Technical access')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.permissions (name, description) VALUES
  ('manage_ministry','Manage ministries'),
  ('manage_users','Manage users and roles'),
  ('manage_groups','Manage groups'),
  ('manage_relationships','Create/modify discipleship relationships'),
  ('view_reports','View reports'),
  ('create_meetings','Create meetings'),
  ('manage_own_habits','Manage own habits'),
  ('manage_prayer_requests','Manage prayer requests'),
  ('view_assigned_disciples','View assigned disciples'),
  ('manage_system_settings','Manage system settings')
ON CONFLICT (name) DO NOTHING;

-- Map permissions to roles
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::app_role, id FROM public.permissions ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'pastor'::app_role, id FROM public.permissions
WHERE name IN ('manage_ministry','manage_users','manage_groups','manage_relationships','view_reports','create_meetings','manage_prayer_requests','view_assigned_disciples')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'leader'::app_role, id FROM public.permissions
WHERE name IN ('create_meetings','view_assigned_disciples','manage_prayer_requests','manage_own_habits')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'disciple'::app_role, id FROM public.permissions
WHERE name IN ('manage_own_habits','manage_prayer_requests')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'viewer'::app_role, id FROM public.permissions
WHERE name IN ('view_reports','view_assigned_disciples')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'developer'::app_role, id FROM public.permissions
ON CONFLICT DO NOTHING;

-- ============================================================
-- 004 NEW USER TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'disciple')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
