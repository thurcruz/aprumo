-- Mural da comunidade: publicações de sessões de foco.
--
-- Segunda superfície compartilhada do projeto (depois da votação). Regras:
-- - qualquer pessoa autenticada lê o mural;
-- - só o autor apaga a própria publicação; ninguém edita;
-- - ninguém insere direto na tabela: a publicação passa por
--   publish_focus_session, que lê a sessão real no banco. Assim não dá para
--   publicar uma sessão inventada nem a de outra pessoa, e o que os outros
--   veem nunca é texto montado pelo cliente;
-- - nome e foto do autor são copiados no momento da publicação: o RLS de
--   profiles só deixa cada um ler a própria linha, e o mural não abre isso.

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'focus_session' check (kind in ('focus_session')),
  -- Uma publicação por sessão: publicar de novo atualiza, não duplica.
  focus_session_id uuid unique references public.focus_sessions(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 60),
  author_avatar_url text check (author_avatar_url is null or char_length(author_avatar_url) <= 500),
  body jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists community_posts_created_idx on public.community_posts(created_at desc);
create index if not exists community_posts_user_idx on public.community_posts(user_id);

alter table public.community_posts enable row level security;
-- Sem insert/update para authenticated: escrever só pela função abaixo.
grant select, delete on public.community_posts to authenticated;

drop policy if exists "community_posts_read_all" on public.community_posts;
create policy "community_posts_read_all" on public.community_posts
  for select to authenticated using (true);

drop policy if exists "community_posts_author_delete" on public.community_posts;
create policy "community_posts_author_delete" on public.community_posts
  for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.publish_focus_session(target_session uuid, show_name boolean default false)
returns public.community_posts
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  s public.focus_sessions;
  author public.profiles;
  post public.community_posts;
begin
  if me is null then
    raise exception 'não autenticado' using errcode = '28000';
  end if;

  -- security definer ignora o RLS: a posse da sessão é conferida aqui.
  select * into s from public.focus_sessions where id = target_session and user_id = me;
  if not found then
    raise exception 'sessão não encontrada' using errcode = 'P0002';
  end if;

  -- Mesmo mínimo do app (lib/share.ts): 5 minutos. Interromper não desqualifica.
  if s.status not in ('completed', 'abandoned') or s.actual_seconds < 300 then
    raise exception 'sessão curta demais para publicar' using errcode = '22023';
  end if;

  select * into author from public.profiles where id = me;

  insert into public.community_posts (user_id, kind, focus_session_id, author_name, author_avatar_url, body)
  values (
    me,
    'focus_session',
    s.id,
    left(coalesce(nullif(btrim(author.display_name), ''), 'Alguém do Aprumo'), 60),
    author.avatar_url,
    jsonb_build_object(
      'minutes', s.actual_seconds / 60,
      'planned_minutes', s.planned_minutes,
      'status', s.status,
      -- O nome da sessão é opcional: pode ser algo que a pessoa não quer mostrar.
      'name', case when show_name and btrim(s.name) <> '' then btrim(s.name) end
    )
  )
  on conflict (focus_session_id) do update
    set author_name = excluded.author_name,
        author_avatar_url = excluded.author_avatar_url,
        body = excluded.body
  returning * into post;

  return post;
end;
$$;

-- Regra do projeto (ver 20260905120000): revogar de anon e public antes de conceder.
revoke execute on function public.publish_focus_session(uuid, boolean) from anon;
revoke execute on function public.publish_focus_session(uuid, boolean) from public;
grant execute on function public.publish_focus_session(uuid, boolean) to authenticated;
