-- Add explicit relationships from discipleship relationships to profiles
-- so PostgREST can resolve nested profile joins in schema cache.

-- Backfill any missing profiles for users already present in relationships.
INSERT INTO public.profiles (id, email, display_name)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)) AS display_name
FROM auth.users u
INNER JOIN (
  SELECT leader_id AS user_id FROM public.discipleship_relationships
  UNION
  SELECT disciple_id AS user_id FROM public.discipleship_relationships
) rel_users ON rel_users.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'discipleship_relationships_disciple_profile_id_fkey'
      AND conrelid = 'public.discipleship_relationships'::regclass
  ) THEN
    ALTER TABLE public.discipleship_relationships
      ADD CONSTRAINT discipleship_relationships_disciple_profile_id_fkey
      FOREIGN KEY (disciple_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'discipleship_relationships_leader_profile_id_fkey'
      AND conrelid = 'public.discipleship_relationships'::regclass
  ) THEN
    ALTER TABLE public.discipleship_relationships
      ADD CONSTRAINT discipleship_relationships_leader_profile_id_fkey
      FOREIGN KEY (leader_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;
