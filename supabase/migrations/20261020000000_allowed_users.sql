create table if not exists public.allowed_users (
  email text primary key,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  constraint allowed_users_email_lowercase check (email = lower(email))
);

alter table public.allowed_users enable row level security;
revoke all on public.allowed_users from anon, authenticated;
grant all on public.allowed_users to service_role;
