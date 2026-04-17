-- Dedup clients: keep oldest per lower(trim(company_name)),
-- repoint contacts to the canonical client, then delete the dups.
CREATE OR REPLACE FUNCTION public._dedup_clients_once()
RETURNS TABLE(canonical_kept INT, contacts_repointed INT, clients_deleted INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _kept INT := 0;
  _repointed INT := 0;
  _deleted INT := 0;
BEGIN
  CREATE TEMP TABLE _client_canonical ON COMMIT DROP AS
  SELECT
    id AS dup_id,
    FIRST_VALUE(id) OVER (
      PARTITION BY lower(trim(company_name))
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id
  FROM public.clients
  WHERE trim(company_name) <> '';

  WITH upd AS (
    UPDATE public.contacts c
    SET client_id = cc.canonical_id
    FROM _client_canonical cc
    WHERE c.client_id = cc.dup_id AND cc.dup_id <> cc.canonical_id
    RETURNING 1
  )
  SELECT COUNT(*) INTO _repointed FROM upd;

  WITH del AS (
    DELETE FROM public.clients
    WHERE id IN (SELECT dup_id FROM _client_canonical WHERE dup_id <> canonical_id)
    RETURNING 1
  )
  SELECT COUNT(*) INTO _deleted FROM del;

  SELECT COUNT(DISTINCT canonical_id) INTO _kept FROM _client_canonical;

  RETURN QUERY SELECT _kept, _repointed, _deleted;
END;
$$;

-- Dedup contacts: per (client_id, lower(trim(name)), lower(trim(email))),
-- keep oldest, delete the rest.
CREATE OR REPLACE FUNCTION public._dedup_contacts_once()
RETURNS TABLE(deleted INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted INT := 0;
BEGIN
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY client_id, lower(trim(name)), lower(trim(email))
             ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM public.contacts
  ),
  del AS (
    DELETE FROM public.contacts
    WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
    RETURNING 1
  )
  SELECT COUNT(*) INTO _deleted FROM del;

  RETURN QUERY SELECT _deleted;
END;
$$;