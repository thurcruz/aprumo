-- Endurece circle_members antes de ligar a API de Desafios/Círculos ao front.
--
-- A policy original (20260904180000_aprumo_v1_foundation.sql) só checava
-- user_id = auth.uid() no insert de circle_members — sem restringir `role`
-- nem exigir que o círculo fosse público. Na prática, qualquer autenticado
-- podia se auto-inserir como 'owner' em QUALQUER círculo, inclusive privado.
--
-- Fix: quem cria o círculo vira dono via trigger (bypassa RLS, sempre roda);
-- self-write authenticated só entra como 'member' em círculo público.

create or replace function public.circles_add_owner_member()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.circle_members(circle_id, user_id, role) values (new.id, new.owner_id, 'owner')
    on conflict (circle_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists circles_add_owner_member_trigger on public.circles;
create trigger circles_add_owner_member_trigger
  after insert on public.circles
  for each row execute function public.circles_add_owner_member();

drop policy if exists "circle_members_self_write" on public.circle_members;
create policy "circle_members_self_write" on public.circle_members
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and role = 'member'
    and exists (select 1 from public.circles c where c.id = circle_id and c.visibility = 'public')
  );
