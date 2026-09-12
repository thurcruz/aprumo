-- Pri no WhatsApp: vincular o número da pessoa à conta e evitar responder
-- duas vezes à mesma mensagem.
--
-- Fluxo de vínculo (como um bot de Discord): a pessoa manda uma mensagem
-- qualquer para o número do Aprumo; o webhook responde com um código de 6
-- dígitos; ela cola esse código em Configurações, já logada na conta dela.
-- Isso evita SMS e o problema de "para onde mando o código" sem já ter
-- um canal de volta.

-- Código efêmero (expira em minutos). Só o webhook (chave de serviço) lê e
-- escreve aqui — nunca é exposto a authenticated/anon, porque ele é a prova
-- de posse do número.
create table if not exists public.whatsapp_link_codes (
  code text primary key check (code ~ '^[0-9]{6}$'),
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_link_codes_phone_idx on public.whatsapp_link_codes(phone_e164);
alter table public.whatsapp_link_codes enable row level security;
-- Sem policy nenhuma: authenticated e anon não têm nenhum privilégio de tabela
-- aqui (só concedido a service_role, que o Supabase já provisiona por padrão),
-- então RLS habilitado sem policy já barra os dois por completo.

-- Deduplicação de entrega: a Meta reenvia o webhook se a resposta demorar, e
-- sem isso a mesma mensagem gastaria crédito da pessoa duas vezes.
create table if not exists public.whatsapp_processed_messages (
  wamid text primary key,
  created_at timestamptz not null default now()
);
alter table public.whatsapp_processed_messages enable row level security;

-- Mesma regra do spend_credits() (que usa auth.uid()), mas para quando quem
-- chama não tem sessão de usuário — o webhook do WhatsApp roda com a chave de
-- serviço. Por isso o usuário vem explícito, e só service_role pode chamar.
create or replace function public.spend_credits_for(p_user_id uuid, p_amount bigint, p_description text default null)
returns table(balance bigint)
language plpgsql security definer set search_path = '' as $$
declare
  current_balance bigint;
begin
  if p_user_id is null then raise exception 'Invalid user'; end if;
  if p_amount <= 0 then raise exception 'Invalid amount'; end if;

  insert into public.credit_wallets(user_id) values (p_user_id) on conflict (user_id) do nothing;
  select w.balance into current_balance from public.credit_wallets w where w.user_id = p_user_id for update;
  if current_balance < p_amount then raise exception 'INSUFFICIENT_CREDITS'; end if;

  update public.credit_wallets set balance = balance - p_amount, updated_at = now() where user_id = p_user_id;
  insert into public.credit_ledger(user_id, amount, kind, description) values (p_user_id, -p_amount, 'usage', p_description);

  return query select w.balance from public.credit_wallets w where w.user_id = p_user_id;
end;
$$;
revoke all on function public.spend_credits_for(uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.spend_credits_for(uuid, bigint, text) to service_role;
