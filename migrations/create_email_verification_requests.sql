-- Email verification tracking table
begin;

create table if not exists email_verification_requests (
  email text primary key,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  consumed_at timestamptz
);

create index if not exists email_verification_requests_expires_idx
  on email_verification_requests (expires_at);

commit;

