-- Reputon Postgres bootstrap.
-- Runs on first container start (mounted into /docker-entrypoint-initdb.d).
-- Idempotent.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Application role separate from the superuser, used by Drizzle migrations.
-- (The container user already exists; this is a no-op the first run.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'reputon_app') THEN
    EXECUTE 'CREATE ROLE reputon_app NOINHERIT LOGIN PASSWORD ''reputon_app''';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE reputon TO reputon_app;
