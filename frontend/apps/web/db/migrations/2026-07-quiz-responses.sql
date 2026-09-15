-- Migração aditiva (idempotente): cria a tabela do quiz de validação.
-- Segura em prod — não derruba nada. Aplicada por scripts/migrate-quiz.ts.
create table if not exists quiz_responses (
  id         uuid primary key default gen_random_uuid(),
  quiz       text not null default 'agendamento',
  answers    jsonb not null default '{}'::jsonb,
  name       text,
  whatsapp   text,
  referrer   text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists quiz_responses_created_idx on quiz_responses(quiz, created_at desc);
