-- Corrige pri_register_attempt: a Pri respondia "Pri indisponível" em toda mensagem.
--
-- A função devolve `returns table(allowed boolean, count_in_window integer)`, e
-- no PL/pgSQL as colunas de saída viram variáveis. Por isso
-- `set count_in_window = count_in_window + 1` e `returning count_in_window`
-- ficavam ambíguos entre a variável e a coluna da tabela: o Postgres lança
-- "column reference is ambiguous", a transação inteira é desfeita (nenhuma
-- linha chega a pri_rate_limits) e a rota trata o erro como indisponibilidade.
--
-- Mesma lógica de antes; só as referências à tabela passam a ser qualificadas.

create or replace function public.pri_register_attempt(p_user_id uuid, p_limit int default 20, p_window_seconds int default 3600)
returns table(allowed boolean, count_in_window integer)
language plpgsql security definer set search_path = '' as $$
declare
  current_row public.pri_rate_limits;
begin
  insert into public.pri_rate_limits as r (user_id) values (p_user_id) on conflict (user_id) do nothing;
  select r.* into current_row from public.pri_rate_limits as r where r.user_id = p_user_id for update;

  if now() - current_row.window_started_at > make_interval(secs => p_window_seconds) then
    update public.pri_rate_limits as r set window_started_at = now(), count_in_window = 0
      where r.user_id = p_user_id returning r.* into current_row;
  end if;

  if current_row.count_in_window >= p_limit then
    return query select false, current_row.count_in_window;
    return;
  end if;

  update public.pri_rate_limits as r set count_in_window = r.count_in_window + 1
    where r.user_id = p_user_id returning r.count_in_window into current_row.count_in_window;
  return query select true, current_row.count_in_window;
end;
$$;
revoke all on function public.pri_register_attempt(uuid, int, int) from public, anon;
grant execute on function public.pri_register_attempt(uuid, int, int) to authenticated, service_role;
