#!/bin/sh
set -eu

: "${PGPASSWORD_FILE:?missing PostgreSQL password secret}"
: "${AUTH_SECRET_FILE:?missing session secret}"
: "${CRON_SECRET_FILE:?missing cron secret}"

export PGPASSWORD="$(cat "$PGPASSWORD_FILE")"
export AUTH_SECRET="$(cat "$AUTH_SECRET_FILE")"
export CRON_SECRET="$(cat "$CRON_SECRET_FILE")"
if [ -s /run/secrets/twilio_auth_token ]; then
  export TWILIO_AUTH_TOKEN="$(cat /run/secrets/twilio_auth_token)"
fi

if [ "${#PGPASSWORD}" -lt 24 ] || [ "${#AUTH_SECRET}" -lt 32 ] || [ "${#CRON_SECRET}" -lt 32 ]; then
  echo 'Secrets are too short.' >&2
  exit 1
fi

if [ "${APP_ENV:-production}" = production ] && [ "${OTP_DEV_MODE:-false}" = true ]; then
  echo 'OTP_DEV_MODE cannot be enabled in production.' >&2
  exit 1
fi

exec node /app/apps/web/server.js
