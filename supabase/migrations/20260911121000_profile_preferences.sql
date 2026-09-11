-- Preferências que os lembretes vão usar: fuso horário e quais avisos a pessoa quer.
--
-- Os envios (WhatsApp) ainda não existem. As escolhas já ficam na conta — e não
-- só no aparelho — para valerem quando chegarem, em qualquer dispositivo.

alter table public.profiles
  add column if not exists timezone text not null default 'America/Sao_Paulo'
    check (char_length(timezone) between 1 and 64),
  add column if not exists notification_prefs jsonb not null
    default '{"reminders": true, "weekly": false, "email": true}'::jsonb;
