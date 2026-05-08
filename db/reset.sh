#!/usr/bin/env bash
set -e

# Drops the database, recreates it from init.sql, then loads seed.sql.
# Required because init.sql is CREATE-only — running it against a stale
# DB leaves old tables in place and silently skips the new ones, which
# is the usual cause of "internal server error" after pulling a schema
# change without a clean reset.

if [ -z "$MYSQL_USER" ]; then
  MYSQL_USER=root
fi

if [ -z "$MYSQL_DB" ]; then
  MYSQL_DB=reciperoom
fi

run_sql() {
  if [ -z "$MYSQL_PWD" ]; then
    mysql -u "$MYSQL_USER" -p "$@"
  else
    mysql -u "$MYSQL_USER" -p"$MYSQL_PWD" "$@"
  fi
}

if [ -z "$MYSQL_PWD" ]; then
  echo "Run with MYSQL_PWD=yourpassword ./db/reset.sh or set the environment variable."
  echo "Falling back to interactive password prompts (mysql will ask three times)."
fi

echo "Dropping and recreating database \"$MYSQL_DB\"…"
run_sql -e "DROP DATABASE IF EXISTS \`$MYSQL_DB\`; CREATE DATABASE \`$MYSQL_DB\`;"

echo "Loading schema from db/init.sql…"
run_sql "$MYSQL_DB" < db/init.sql

echo "Loading seed data from db/seed.sql…"
run_sql "$MYSQL_DB" < db/seed.sql

echo "Database reset complete."
