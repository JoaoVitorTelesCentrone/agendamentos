#!/bin/sh
set -eu
export PGPASSWORD="$(cat "$PGPASSWORD_FILE")"

table_count="$(psql -X -At -v ON_ERROR_STOP=1 -c "select count(*) from pg_tables where schemaname = 'public'")"
if [ "$table_count" -eq 0 ]; then
  echo 'Initializing an empty AgendaFlow database.'
  psql -X -v ON_ERROR_STOP=1 -1 -f /schema.sql
else
  missing="$(psql -X -At -v ON_ERROR_STOP=1 -c "
    select count(*) from unnest(array[
      'tenants', 'auth_users', 'profiles', 'professionals', 'working_hours',
      'time_off', 'services', 'service_professionals', 'clients',
      'appointments', 'leads', 'otp_verifications', 'notifications'
    ]) as name where to_regclass('public.' || name) is null")"
  if [ "$missing" -ne 0 ]; then
    echo 'Existing database is incomplete or uses a different schema; refusing to initialize it.' >&2
    exit 1
  fi
  psql -X -v ON_ERROR_STOP=1 -1 -f /quiz.sql
  echo 'Existing AgendaFlow database verified.'
fi

psql -X -v ON_ERROR_STOP=1 -1 -f /request-limits.sql
psql -X -v ON_ERROR_STOP=1 -1 -f /product-integration.sql

psql -X -v ON_ERROR_STOP=1 -f /grants.sql
app_password="$(cat "$APP_PASSWORD_FILE")"
case "$app_password" in
  *[!0-9a-f]*|'') echo 'Application password must be a generated hex secret.' >&2; exit 1 ;;
esac
printf "ALTER ROLE vivio_app PASSWORD '%s';\n" "$app_password" | psql -X -v ON_ERROR_STOP=1 >/dev/null
echo 'Application database role ready.'
