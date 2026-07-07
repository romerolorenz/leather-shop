-- Admin allow-list — see PRD §6 (Admin access: Google login restricted to
-- an allow-list, not open to any Google account). A table rather than an
-- env var so adding a second admin later doesn't need a code change,
-- matching CLAUDE.md's "configurable, not hardcoded" rule.

create table admin_users (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table admin_users enable row level security;
-- Default-deny, same reasoning as 0001_init.sql: only the service-role
-- key (server-only) reads this table, e.g. from middleware.

insert into admin_users (email) values ('marcolorenzoromero@gmail.com');
