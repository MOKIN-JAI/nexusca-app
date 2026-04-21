-- Restrict avatars bucket: only allow reading specific objects, not listing.
-- Public bucket already lets clients fetch a known URL; we just remove the
-- broad SELECT policy so anonymous LIST calls fail.
drop policy if exists "avatars public read" on storage.objects;
update storage.buckets set public = true where id = 'avatars';