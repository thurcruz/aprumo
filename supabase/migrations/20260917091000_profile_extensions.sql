-- Extensões opcionais (Finanças, Treino e sono, Repertório, Antivício).
-- Guarda só as escolhas explícitas: {"financas": true, "antivicio": false}.
-- Chave ausente = decide pelo uso (ver lib/extensions.ts).

alter table public.profiles
  add column if not exists extensions jsonb not null default '{}'::jsonb;
