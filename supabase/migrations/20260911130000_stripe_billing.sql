-- Assinatura Aprumo+ via Stripe, substituindo a Cakto.
--
-- Modelo: 1 crédito = 1 mensagem da Pri. A assinatura ativa concede créditos a
-- cada ciclo cobrado (mensal ou, no plano anual, uma vez por ano — sem cron,
-- é uma simplificação da v1: quem assina anual recebe de uma vez o total do
-- ano. Uma renovação mensal automática dentro do ano é uma melhoria futura,
-- não bloqueante para lançar). Esbarrar no limite não cancela o Plus: só
-- impede novas mensagens da Pri até comprar um pacote extra ou renovar.
--
-- Ser "Plus" (acesso a Pri e aos insights avançados) depende do STATUS da
-- assinatura, não do saldo de créditos — as duas coisas são independentes.

-- Cada usuário mapeia para no máximo um Cliente Stripe.
alter table public.profiles add column if not exists stripe_customer_id text unique;

create table if not exists public.subscriptions (
  id text primary key, -- id da subscription no Stripe (sub_...)
  user_id uuid not null references auth.users(id) on delete cascade,
  price_id text not null,
  status text not null check (status in ('trialing','active','past_due','canceled','unpaid','incomplete','incomplete_expired','paused')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions(user_id);

alter table public.subscriptions enable row level security;
grant select on public.subscriptions to authenticated;
-- Sem insert/update/delete para authenticated: só o webhook (service_role) escreve aqui.
create policy "subscriptions_owner_read" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

-- 'grant' = crédito do ciclo da assinatura; 'topup' = pacote avulso comprado.
alter table public.credit_ledger drop constraint if exists credit_ledger_kind_check;
alter table public.credit_ledger add constraint credit_ledger_kind_check
  check (kind in ('purchase','refund','chargeback','usage','adjustment','grant','topup'));

-- Gasta créditos da própria carteira (uso da Pri). Levanta 'INSUFFICIENT_CREDITS'
-- quando não há saldo — a API reconhece essa mensagem e oferece comprar mais.
create or replace function public.spend_credits(p_amount bigint, p_description text default null)
returns table(balance bigint)
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  current_balance bigint;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if p_amount <= 0 then raise exception 'Invalid amount'; end if;

  insert into public.credit_wallets(user_id) values (me) on conflict (user_id) do nothing;
  -- Trava a linha: duas mensagens simultâneas não podem gastar o mesmo crédito.
  select w.balance into current_balance from public.credit_wallets w where w.user_id = me for update;
  if current_balance < p_amount then raise exception 'INSUFFICIENT_CREDITS'; end if;

  update public.credit_wallets set balance = balance - p_amount, updated_at = now() where user_id = me;
  insert into public.credit_ledger(user_id, amount, kind, description) values (me, -p_amount, 'usage', p_description);

  return query select w.balance from public.credit_wallets w where w.user_id = me;
end;
$$;
revoke all on function public.spend_credits(bigint, text) from public, anon;
grant execute on function public.spend_credits(bigint, text) to authenticated;

-- Concede créditos (renovação de ciclo ou pacote comprado). Só o webhook chama
-- isto — nunca o cliente. Idempotente pela mesma chave (provider, provider_reference)
-- do credit_ledger: reenviar o mesmo evento do Stripe não credita duas vezes.
create or replace function public.grant_credits(
  p_user_id uuid, p_amount bigint, p_kind text,
  p_provider text, p_provider_reference text, p_description text default null
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  new_balance bigint;
begin
  if p_kind not in ('grant', 'topup', 'adjustment') then raise exception 'Invalid kind'; end if;
  if p_amount <= 0 then raise exception 'Invalid amount'; end if;

  insert into public.credit_ledger(user_id, amount, kind, provider, provider_reference, description)
  values (p_user_id, p_amount, p_kind, p_provider, p_provider_reference, p_description)
  on conflict (provider, provider_reference) do nothing;
  if not found then
    select balance into new_balance from public.credit_wallets where user_id = p_user_id;
    return jsonb_build_object('duplicate', true, 'balance', coalesce(new_balance, 0));
  end if;

  insert into public.credit_wallets(user_id, balance) values (p_user_id, p_amount)
  on conflict (user_id) do update set balance = public.credit_wallets.balance + excluded.balance, updated_at = now()
  returning balance into new_balance;

  return jsonb_build_object('duplicate', false, 'balance', new_balance);
end;
$$;
revoke all on function public.grant_credits(uuid, bigint, text, text, text, text) from public, anon, authenticated;
grant execute on function public.grant_credits(uuid, bigint, text, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Depreciação da Cakto — substituída pela assinatura via Stripe acima.
-- Não escrever mais nestas tabelas/função; ficam só até a limpeza definitiva.
-- ---------------------------------------------------------------------------
comment on table public.cakto_orders is 'DEPRECATED (billing via Stripe): não escrever. Histórico de pedidos antes da migração para Stripe.';
comment on table public.cakto_webhook_events is 'DEPRECATED (billing via Stripe): não escrever.';
comment on function public.process_cakto_payment(text,text,text,text,text,text,text,numeric,bigint,jsonb) is 'DEPRECATED (billing via Stripe): não chamar mais. Mantida só por histórico.';
