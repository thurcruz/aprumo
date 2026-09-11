-- Foto de perfil.
--
-- Bucket público: a comunidade vai exibir a foto de outras pessoas, e uma URL
-- pública é o que torna isso possível sem abrir a tabela `profiles` (cujo RLS
-- só deixa cada um ler a própria linha). A escrita fica restrita à pasta do
-- próprio usuário: avatars/<uid>/<arquivo>.
--
-- Limite de 2 MB por arquivo; o app já reduz a foto para 512×512 antes de
-- enviar, então o limite só barra envios feitos por fora da interface.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "avatars_owner_select" on storage.objects;
create policy "avatars_owner_select" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- A URL pública da foto. A API só aceita URLs da pasta do próprio usuário.
alter table public.profiles add column if not exists avatar_url text
  check (avatar_url is null or char_length(avatar_url) <= 500);
