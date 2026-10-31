-- Operations Closeout race: a closer's bitmoji in three moods. The existing
-- `avatar_path` is the neutral face; these two are the leader and last-place
-- faces. Any missing one falls back to `avatar_path`.
alter table public.profiles add column avatar_happy_path text;
alter table public.profiles add column avatar_sad_path   text;
