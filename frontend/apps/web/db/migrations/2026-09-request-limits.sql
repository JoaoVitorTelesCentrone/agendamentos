create table if not exists request_limits (
  key        text not null,
  bucket     bigint not null,
  hits       integer not null default 1,
  created_at timestamptz not null default now(),
  primary key (key, bucket)
);
create index if not exists request_limits_created_idx on request_limits(created_at);
