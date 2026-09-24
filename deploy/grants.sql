-- The web process can read and change application rows, but cannot manage schema
-- or extensions. Keep the administrator password out of the web container.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vivio_app') THEN
    CREATE ROLE vivio_app LOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO vivio_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vivio_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vivio_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vivio_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO vivio_app;
