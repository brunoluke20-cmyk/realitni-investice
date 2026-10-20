create table if not exists public.app_login_sessions (
  token_hash text primary key,
  username text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.app_login_sessions enable row level security;
revoke all on public.app_login_sessions from anon, authenticated;
grant all on public.app_login_sessions to service_role;
