create table if not exists public.gaptrack_contact_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('contact', 'premium', 'support', 'privacy')),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254),
  organization text,
  needs text[] not null default '{}'::text[],
  context text not null check (char_length(context) between 10 and 4000),
  deadline text,
  source text,
  request_fingerprint text not null,
  user_agent text,
  email_sent_at timestamptz,
  email_provider_id text,
  email_error text,
  created_at timestamptz not null default now()
);

create index if not exists gaptrack_contact_requests_created_at_idx
  on public.gaptrack_contact_requests (created_at desc);

create index if not exists gaptrack_contact_requests_fingerprint_created_idx
  on public.gaptrack_contact_requests (request_fingerprint, created_at desc);

alter table public.gaptrack_contact_requests enable row level security;

revoke all on table public.gaptrack_contact_requests from anon, authenticated;
grant all on table public.gaptrack_contact_requests to service_role;

comment on table public.gaptrack_contact_requests is
  'Demandes envoyées depuis le formulaire public GapTrack. Accès réservé aux fonctions serveur.';
