-- ============================================================
-- 005 PHASE 2 GUILD PERSISTENCE
-- ============================================================

CREATE TABLE public.guild_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT guild_seasons_valid_window CHECK (ends_on >= starts_on),
  CONSTRAINT guild_seasons_name_window_unique UNIQUE (name, starts_on)
);
CREATE TRIGGER trg_guild_seasons_updated
  BEFORE UPDATE ON public.guild_seasons
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_guild_seasons_active_window
  ON public.guild_seasons(is_active, starts_on, ends_on);

CREATE TABLE public.guild_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.guild_seasons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 3 CHECK (target_count > 0),
  reward TEXT NOT NULL DEFAULT 'Guild Lantern +50',
  week_start DATE NOT NULL DEFAULT date_trunc('week', now())::date,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_guild_missions_updated
  BEFORE UPDATE ON public.guild_missions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_guild_missions_season_active
  ON public.guild_missions(season_id, is_active, week_start);

CREATE TABLE public.guild_mission_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.guild_missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  story TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT guild_mission_contrib_daily_unique UNIQUE (mission_id, user_id, contribution_date)
);
CREATE INDEX idx_guild_mission_contrib_mission
  ON public.guild_mission_contributions(mission_id, contribution_date);
CREATE INDEX idx_guild_mission_contrib_user
  ON public.guild_mission_contributions(user_id, contribution_date);

CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.guild_seasons(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT user_achievement_unique UNIQUE (user_id, code, season_id)
);
CREATE INDEX idx_user_achievements_user_awarded
  ON public.user_achievements(user_id, awarded_at DESC);

ALTER TABLE public.guild_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_mission_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guild_seasons_select_auth" ON public.guild_seasons
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "guild_seasons_manage_privileged" ON public.guild_seasons
  FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[]));

CREATE POLICY "guild_missions_select_auth" ON public.guild_missions
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "guild_missions_manage_privileged" ON public.guild_missions
  FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[]));

CREATE POLICY "guild_contributions_select" ON public.guild_mission_contributions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_leader_of(auth.uid(), user_id)
    OR public.has_any_role(auth.uid(), ARRAY['admin','pastor','viewer']::app_role[])
  );
CREATE POLICY "guild_contributions_manage_self" ON public.guild_mission_contributions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_achievements_select" ON public.user_achievements
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_leader_of(auth.uid(), user_id)
    OR public.has_any_role(auth.uid(), ARRAY['admin','pastor','viewer']::app_role[])
  );
CREATE POLICY "user_achievements_manage_self" ON public.user_achievements
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

INSERT INTO public.guild_seasons (name, starts_on, ends_on, is_active)
VALUES ('Season of Growth Q2 2026', DATE '2026-05-04', DATE '2026-07-31', true)
ON CONFLICT (name, starts_on) DO NOTHING;

INSERT INTO public.guild_missions (season_id, title, objective, target_count, reward, week_start, is_active)
SELECT
  s.id,
  'Serve One Person This Week',
  'Complete practices from at least 3 categories and share one short story of service.',
  3,
  'Guild Lantern +50',
  DATE '2026-05-04',
  true
FROM public.guild_seasons s
WHERE s.name = 'Season of Growth Q2 2026'
  AND s.starts_on = DATE '2026-05-04'
  AND NOT EXISTS (
    SELECT 1
    FROM public.guild_missions gm
    WHERE gm.season_id = s.id
      AND gm.week_start = DATE '2026-05-04'
  );
