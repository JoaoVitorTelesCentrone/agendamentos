#!/bin/sh
set -eu
umask 077
mkdir -p deploy/secrets
for name in pg_password app_password auth_secret cron_secret; do
  if [ ! -e "deploy/secrets/$name" ]; then
    openssl rand -hex 32 > "deploy/secrets/$name"
  fi
done
if [ ! -e deploy/secrets/twilio_auth_token ]; then
  : > deploy/secrets/twilio_auth_token
fi
chmod 700 deploy/secrets
chmod 600 deploy/secrets/*
echo 'Secrets ready in deploy/secrets (files are ignored by Git).'
