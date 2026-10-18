-- Runs once at first Postgres startup (as the postgres superuser, inside church_erp DB).
-- Creates a dedicated NON-SUPERUSER application role. This is essential: superusers
-- (and BYPASSRLS roles) ignore Row-Level Security, so the app MUST connect as a
-- non-privileged role for tenant isolation to actually be enforced.

CREATE ROLE church_app WITH LOGIN PASSWORD 'church_app_pw'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

GRANT ALL PRIVILEGES ON DATABASE church_erp TO church_app;

-- Let the app role own the public schema so Alembic (run as church_app) can create
-- tables. Combined with FORCE ROW LEVEL SECURITY in the migration, RLS applies even
-- to the table owner.
ALTER SCHEMA public OWNER TO church_app;
GRANT ALL ON SCHEMA public TO church_app;
