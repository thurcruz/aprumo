-- Free = diagnóstico e plano inicial; Aprumo+ = acompanhamento contínuo.
--
-- A Pri deixa de ser exclusiva do Aprumo+: toda carteira nasce com 20 créditos
-- de boas-vindas, uma única vez por pessoa — o bastante para o diagnóstico, o
-- plano inicial e algumas conversas. Depois disso, quem é Free é convidado a
-- assinar; quem é Plus segue com os créditos do ciclo, como antes.
--
-- A chave (provider 'aprumo', 'welcome:<user_id>') no credit_ledger garante a
-- concessão única, inclusive com pedidos simultâneos.

-- 1) Quem já tem carteira recebe agora. Vem antes do gatilho: BEFORE INSERT
--    dispara mesmo quando o `on conflict do nothing` descarta a linha, e uma
--    carteira antiga perderia a chave sem ganhar o saldo.
with granted as (
  insert into public.credit_ledger(user_id, amount, kind, provider, provider_reference, description)
  select w.user_id, 20, 'grant', 'aprumo', 'welcome:' || w.user_id, 'Boas-vindas: diagnóstico e plano inicial'
  from public.credit_wallets as w
  on conflict (provider, provider_reference) do nothing
  returning user_id
)
update public.credit_wallets as w set balance = w.balance + 20, updated_at = now()
from granted where granted.user_id = w.user_id;

-- 2) Carteiras novas nascem com os créditos. As carteiras são criadas sob
--    demanda (spend_credits, get_my_credit_account), então isto cobre todo mundo.
create or replace function public.grant_welcome_credits()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.credit_ledger(user_id, amount, kind, provider, provider_reference, description)
  values (new.user_id, 20, 'grant', 'aprumo', 'welcome:' || new.user_id, 'Boas-vindas: diagnóstico e plano inicial')
  on conflict (provider, provider_reference) do nothing;
  if found then new.balance := new.balance + 20; end if;
  return new;
end;
$$;
revoke all on function public.grant_welcome_credits() from public, anon, authenticated;

drop trigger if exists credit_wallets_welcome on public.credit_wallets;
create trigger credit_wallets_welcome before insert on public.credit_wallets
  for each row execute function public.grant_welcome_credits();
