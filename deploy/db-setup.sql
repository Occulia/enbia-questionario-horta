-- Executar 1× na CT 106 (PostgreSQL · 192.168.1.3) como root / postgres:
-- pct enter 106
-- su - postgres -c "psql -f /caminho/db-setup.sql"

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'enbia_forms_app') THEN
    CREATE ROLE enbia_forms_app LOGIN PASSWORD 'Enb_516571516';
  END IF;
END
$$;

SELECT 'CREATE DATABASE enbia_forms OWNER enbia_forms_app ENCODING ''UTF8'' LC_COLLATE ''C.UTF-8'' LC_CTYPE ''C.UTF-8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'enbia_forms')\gexec
