-- ============================================================
-- 006 PHASE 3 LEADERBOARD + MODERATION
-- ============================================================

CREATE TABLE public.guild_leaderboard_group_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.guild_seasons(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  adjusted_points INTEGER NOT NULL DEFAULT 0 CHECK (adjusted_points BETWEEN -100 AND 100),
  moderation_note TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT guild_leaderboard_group_settings_unique UNIQUE (season_id, group_id)
);
CREATE TRIGGER trg_guild_leaderboard_group_settings_updated
  BEFORE UPDATE ON public.guild_leaderboard_group_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.guild_leaderboard_group_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guild_leaderboard_settings_select_auth" ON public.guild_leaderboard_group_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "guild_leaderboard_settings_manage_privileged" ON public.guild_leaderboard_group_settings
  FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','pastor']::app_role[]));

CREATE OR REPLACE VIEW public.guild_leaderboard_entries AS
WITH contributions AS (
  SELECT
    gm.season_id,
    gmc.group_id,
    COUNT(*)::INT AS contribution_count,
    COUNT(*) FILTER (
      WHERE COALESCE(length(trim(gmc.story)), 0) >= 15
    )::INT AS story_count,
    COUNT(DISTINCT gmc.contribution_date)::INT AS active_days,
    COUNT(DISTINCT gmc.mission_id)::INT AS mission_diversity
  FROM public.guild_mission_contributions gmc
  JOIN public.guild_missions gm ON gm.id = gmc.mission_id
  WHERE gmc.group_id IS NOT NULL
  GROUP BY gm.season_id, gmc.group_id
),
base_scores AS (
  SELECT
    c.season_id,
    c.group_id,
    c.contribution_count,
    c.story_count,
    c.active_days,
    c.mission_diversity,
    LEAST(
      500,
      c.contribution_count * 20
      + c.story_count * 10
      + c.active_days * 5
      + c.mission_diversity * 15
    )::INT AS base_points
  FROM contributions c
),
scored AS (
  SELECT
    b.season_id,
    b.group_id,
    b.contribution_count,
    b.story_count,
    b.active_days,
    b.mission_diversity,
    b.base_points,
    COALESCE(s.adjusted_points, 0) AS adjusted_points,
    COALESCE(s.is_visible, true) AS is_visible,
    GREATEST(0, b.base_points + COALESCE(s.adjusted_points, 0))::INT AS final_points
  FROM base_scores b
  LEFT JOIN public.guild_leaderboard_group_settings s
    ON s.season_id = b.season_id AND s.group_id = b.group_id
)
SELECT
  s.season_id,
  s.group_id,
  g.name AS group_name,
  s.contribution_count,
  s.story_count,
  s.active_days,
  s.mission_diversity,
  s.base_points,
  s.adjusted_points,
  s.final_points,
  ROW_NUMBER() OVER (
    PARTITION BY s.season_id
    ORDER BY s.final_points DESC, s.story_count DESC, g.name ASC
  )::INT AS rank
FROM scored s
JOIN public.groups g ON g.id = s.group_id
WHERE s.is_visible = true;

GRANT SELECT ON public.guild_leaderboard_entries TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_guild_leaderboard(
  _season_id UUID,
  _limit INTEGER DEFAULT 8
)
RETURNS TABLE (
  season_id UUID,
  group_id UUID,
  group_name TEXT,
  contribution_count INTEGER,
  story_count INTEGER,
  active_days INTEGER,
  mission_diversity INTEGER,
  base_points INTEGER,
  adjusted_points INTEGER,
  final_points INTEGER,
  rank INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.season_id,
    e.group_id,
    e.group_name,
    e.contribution_count,
    e.story_count,
    e.active_days,
    e.mission_diversity,
    e.base_points,
    e.adjusted_points,
    e.final_points,
    e.rank
  FROM public.guild_leaderboard_entries e
  WHERE e.season_id = _season_id
  ORDER BY e.rank ASC
  LIMIT GREATEST(COALESCE(_limit, 8), 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_guild_leaderboard(UUID, INTEGER) TO authenticated;
