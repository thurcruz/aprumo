-- Limite de taxa da Pri, de forma atômica.
--
-- Antes: a rota contava linhas de ai_audit_log da última hora com um SELECT e
-- comparava no client (check-then-act não atômico: duas mensagens simultâneas
-- podiam passar pela checagem juntas) — e só contava tentativas que terminavam
-- em resposta de texto, deixando propostas de ação fora da contagem.
--
-- Agora: uma linha por usuário com lock (for update), no mesmo padrão de
-- spend_credits — a segunda chamada concorrente espera a primeira liberar a
-- linha antes de ler o contador, então não há corrida. Registrada logo no
-- início de answerPri, antes de qualquer resposta da IA.

create table if not exists public.pri_rate_limits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  count_in_window integer not null default 0
);

alter table public.pri_rate_limits enable row level security;
-- Sem policy: só a função abaixo (security definer) acessa esta tabela.

create or replace function public.pri_register_attempt(p_user_id uuid, p_limit int default 20, p_window_seconds int default 3600)
returns table(allowed boolean, count_in_window integer)
language plpgsql security definer set search_path = '' as $$
declare
  current_row public.pri_rate_limits;
begin
  insert into public.pri_rate_limits(user_id) values (p_user_id) on conflict (user_id) do nothing;
  select * into current_row from public.pri_rate_limits where user_id = p_user_id for update;

  if now() - current_row.window_started_at > make_interval(secs => p_window_seconds) then
    update public.pri_rate_limits set window_started_at = now(), count_in_window = 0
      where user_id = p_user_id returning * into current_row;
  end if;

  if current_row.count_in_window >= p_limit then
    return query select false, current_row.count_in_window;
    return;
  end if;

  update public.pri_rate_limits set count_in_window = count_in_window + 1
    where user_id = p_user_id returning count_in_window into current_row.count_in_window;
  return query select true, current_row.count_in_window;
end;
$$;
revoke all on function public.pri_register_attempt(uuid, int, int) from public, anon;
grant execute on function public.pri_register_attempt(uuid, int, int) to authenticated, service_role;
