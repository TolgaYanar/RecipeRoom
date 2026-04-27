#!/usr/bin/env bash
set -e

if [ -z "$MYSQL_USER" ]; then
  MYSQL_USER=root
else
  MYSQL_USER="$MYSQL_USER"
fi

if [ -z "$MYSQL_DB" ]; then
  MYSQL_DB=reciperoom
else
  MYSQL_DB="$MYSQL_DB"
fi

if [ -z "$MYSQL_PWD" ]; then
  echo "Run with MYSQL_PWD=yourpassword ./db/reset.sh or set the environment variable."
  echo "Falling back to interactive password prompt."
  mysql -u "$MYSQL_USER" -p "$MYSQL_DB" < db/init.sql
  mysql -u "$MYSQL_USER" -p "$MYSQL_DB" < db/seed.sql
else
  mysql -u "$MYSQL_USER" -p"$MYSQL_PWD" "$MYSQL_DB" < db/init.sql
  mysql -u "$MYSQL_USER" -p"$MYSQL_PWD" "$MYSQL_DB" < db/seed.sql
fi

echo "Database reset complete."
