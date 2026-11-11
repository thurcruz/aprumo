-- Corrige spend_credits e spend_credits_for: "column reference "balance" is ambiguous".
--
-- Mesmo problema de pri_register_attempt (20260916230000): as duas devolvem
-- `returns table(balance bigint)`, e no PL/pgSQL essa coluna de saída vira uma
-- variável. `set balance = balance - p_amount` ficava ambíguo entre a variável e
-- a coluna de credit_wallets, então toda mensagem para a Pri falhava na hora de
-- gastar o crédito — na web (spend_credits) e no WhatsApp (spend_credits_for).
--
-- Mesma lógica e permissões de antes; só as referências à tabela passam a ser qualificadas.

create or replace function public.spend_credits(p_amount bigint, p_description text default null)
returns table(balance bigint)
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  current_balance bigint;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if p_amount <= 0 then raise exception 'Invalid amount'; end if;

  insert into public.credit_wallets as w (user_id) values (me) on conflict (user_id) do nothing;
  -- Trava a linha: duas mensagens simultâneas não podem gastar o mesmo crédito.
  select w.balance into current_balance from public.credit_wallets as w where w.user_id = me for update;
  if current_balance < p_amount then raise exception 'INSUFFICIENT_CREDITS'; end if;

  update public.credit_wallets as w set balance = w.balance - p_amount, updated_at = now() where w.user_id = me;
  insert into public.credit_ledger(user_id, amount, kind, description) values (me, -p_amount, 'usage', p_description);

  return query select w.balance from public.credit_wallets as w where w.user_id = me;
end;
$$;
revoke all on function public.spend_credits(bigint, text) from public, anon;
grant execute on function public.spend_credits(bigint, text) to authenticated;

create or replace function public.spend_credits_for(p_user_id uuid, p_amount bigint, p_description text default null)
returns table(balance bigint)
language plpgsql security definer set search_path = '' as $$
declare
  current_balance bigint;
begin
  if p_user_id is null then raise exception 'Invalid user'; end if;
  if p_amount <= 0 then raise exception 'Invalid amount'; end if;

  insert into public.credit_wallets as w (user_id) values (p_user_id) on conflict (user_id) do nothing;
  select w.balance into current_balance from public.credit_wallets as w where w.user_id = p_user_id for update;
  if current_balance < p_amount then raise exception 'INSUFFICIENT_CREDITS'; end if;

  update public.credit_wallets as w set balance = w.balance - p_amount, updated_at = now() where w.user_id = p_user_id;
  insert into public.credit_ledger(user_id, amount, kind, description) values (p_user_id, -p_amount, 'usage', p_description);

  return query select w.balance from public.credit_wallets as w where w.user_id = p_user_id;
end;
$$;
revoke all on function public.spend_credits_for(uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.spend_credits_for(uuid, bigint, text) to service_role;
