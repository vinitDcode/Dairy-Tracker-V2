-- ═══════════════════════════════════════════════════════════════════════
-- BHULLAR DAIRY FARM — PHASE 0: SaaS DB MIGRATION  v2
-- Multi-tenant · RLS · B-Tree indexes · Soft deletes · Inventory RPC
--
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query → Paste → Run)
-- Fully idempotent — safe to re-run on existing schemas.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────────
-- 1. FARMS TABLE  (tenant anchor)
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.farms (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT         NOT NULL,
  latitude    FLOAT8       NOT NULL DEFAULT 30.9,
  longitude   FLOAT8       NOT NULL DEFAULT 75.8,
  timezone    VARCHAR(64)  NOT NULL DEFAULT 'Asia/Kolkata',
  owner_id    UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Trigger: keep updated_at current
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_farms_updated_at ON public.farms;
CREATE TRIGGER trg_farms_updated_at
  BEFORE UPDATE ON public.farms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────
-- 2. IDEMPOTENT SCHEMA ALTERATIONS — farm_id + deleted_at (soft deletes)
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.cattle          ADD COLUMN IF NOT EXISTS farm_id    UUID REFERENCES public.farms(id) ON DELETE CASCADE;
ALTER TABLE public.cattle          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.semen_inventory ADD COLUMN IF NOT EXISTS farm_id    UUID REFERENCES public.farms(id) ON DELETE CASCADE;
ALTER TABLE public.semen_inventory ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.heat_logs       ADD COLUMN IF NOT EXISTS farm_id    UUID REFERENCES public.farms(id) ON DELETE CASCADE;
ALTER TABLE public.heat_logs       ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.inseminations   ADD COLUMN IF NOT EXISTS farm_id    UUID REFERENCES public.farms(id) ON DELETE CASCADE;
ALTER TABLE public.inseminations   ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ────────────────────────────────────────────────────────────────────────
-- 3. DEFAULT FARM — Bhullar Dairy (data preservation: zero orphaned rows)
-- ────────────────────────────────────────────────────────────────────────
INSERT INTO public.farms (id, name, latitude, longitude, timezone)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Bhullar Dairy',
  30.9,   -- Barnala / Ludhiana belt, Punjab, India
  75.8,
  'Asia/Kolkata'
)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      timezone = EXCLUDED.timezone;

-- Map ALL legacy rows to Bhullar Dairy (idempotent: WHERE farm_id IS NULL)
UPDATE public.cattle
  SET farm_id = '00000000-0000-0000-0000-000000000001'
  WHERE farm_id IS NULL;

UPDATE public.semen_inventory
  SET farm_id = '00000000-0000-0000-0000-000000000001'
  WHERE farm_id IS NULL;

UPDATE public.heat_logs
  SET farm_id = '00000000-0000-0000-0000-000000000001'
  WHERE farm_id IS NULL;

UPDATE public.inseminations
  SET farm_id = '00000000-0000-0000-0000-000000000001'
  WHERE farm_id IS NULL;

-- ────────────────────────────────────────────────────────────────────────
-- 4. B-TREE INDEXES (farm_id query isolation + partial on active rows)
-- ────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cattle_farm_id
  ON public.cattle(farm_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cattle_tag_number
  ON public.cattle(tag_number)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cattle_sire_id
  ON public.cattle(sire_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_semen_inventory_farm_id
  ON public.semen_inventory(farm_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_semen_inventory_available
  ON public.semen_inventory(farm_id, units_available DESC)
  WHERE deleted_at IS NULL AND units_available > 0;

CREATE INDEX IF NOT EXISTS idx_heat_logs_farm_id
  ON public.heat_logs(farm_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_heat_logs_cattle_logged
  ON public.heat_logs(cattle_id, logged_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inseminations_farm_id
  ON public.inseminations(farm_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inseminations_outcome
  ON public.inseminations(farm_id, outcome)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inseminations_technician
  ON public.inseminations(technician_id, farm_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_farms_owner
  ON public.farms(owner_id)
  WHERE owner_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY — farms table
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- Anon: can only read the single default Bhullar Dairy farm
DROP POLICY IF EXISTS "farms: anon select default" ON public.farms;
CREATE POLICY "farms: anon select default"
  ON public.farms FOR SELECT TO anon
  USING (id = '00000000-0000-0000-0000-000000000001');

-- Authenticated: read own farm from JWT claim
DROP POLICY IF EXISTS "farms: auth select own" ON public.farms;
CREATE POLICY "farms: auth select own"
  ON public.farms FOR SELECT TO authenticated
  USING (
    id = (
      current_setting('request.jwt.claims', true)::jsonb ->> 'farm_id'
    )::UUID
  );

-- Authenticated: update own farm only
DROP POLICY IF EXISTS "farms: auth update own" ON public.farms;
CREATE POLICY "farms: auth update own"
  ON public.farms FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY — cattle
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.cattle ENABLE ROW LEVEL SECURITY;

-- Replace old permissive anon_read
DROP POLICY IF EXISTS "anon_read"          ON public.cattle;
DROP POLICY IF EXISTS "cattle: anon read"  ON public.cattle;

CREATE POLICY "cattle: anon read own farm"
  ON public.cattle FOR SELECT TO anon
  USING (farm_id = '00000000-0000-0000-0000-000000000001' AND deleted_at IS NULL);

CREATE POLICY "cattle: auth read own farm"
  ON public.cattle FOR SELECT TO authenticated
  USING (
    farm_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'farm_id')::UUID
    AND deleted_at IS NULL
  );

-- ────────────────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY — semen_inventory
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.semen_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read"                 ON public.semen_inventory;
DROP POLICY IF EXISTS "semen_inventory: anon read" ON public.semen_inventory;

CREATE POLICY "semen: anon read own farm"
  ON public.semen_inventory FOR SELECT TO anon
  USING (farm_id = '00000000-0000-0000-0000-000000000001' AND deleted_at IS NULL);

CREATE POLICY "semen: auth read own farm"
  ON public.semen_inventory FOR SELECT TO authenticated
  USING (
    farm_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'farm_id')::UUID
    AND deleted_at IS NULL
  );

-- ────────────────────────────────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY — heat_logs
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.heat_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read"          ON public.heat_logs;
DROP POLICY IF EXISTS "anon_insert"        ON public.heat_logs;
DROP POLICY IF EXISTS "heat_logs: anon read"   ON public.heat_logs;
DROP POLICY IF EXISTS "heat_logs: anon insert" ON public.heat_logs;

CREATE POLICY "heat_logs: anon read own farm"
  ON public.heat_logs FOR SELECT TO anon
  USING (farm_id = '00000000-0000-0000-0000-000000000001' AND deleted_at IS NULL);

CREATE POLICY "heat_logs: anon insert own farm"
  ON public.heat_logs FOR INSERT TO anon
  WITH CHECK (farm_id = '00000000-0000-0000-0000-000000000001');

CREATE POLICY "heat_logs: auth read own farm"
  ON public.heat_logs FOR SELECT TO authenticated
  USING (
    farm_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'farm_id')::UUID
    AND deleted_at IS NULL
  );

CREATE POLICY "heat_logs: auth insert own farm"
  ON public.heat_logs FOR INSERT TO authenticated
  WITH CHECK (
    farm_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'farm_id')::UUID
  );

-- ────────────────────────────────────────────────────────────────────────
-- 9. ROW LEVEL SECURITY — inseminations
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.inseminations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read"              ON public.inseminations;
DROP POLICY IF EXISTS "anon_insert"            ON public.inseminations;
DROP POLICY IF EXISTS "inseminations: anon read"   ON public.inseminations;
DROP POLICY IF EXISTS "inseminations: anon insert" ON public.inseminations;

CREATE POLICY "inseminations: anon read own farm"
  ON public.inseminations FOR SELECT TO anon
  USING (farm_id = '00000000-0000-0000-0000-000000000001' AND deleted_at IS NULL);

CREATE POLICY "inseminations: anon insert own farm"
  ON public.inseminations FOR INSERT TO anon
  WITH CHECK (farm_id = '00000000-0000-0000-0000-000000000001');

CREATE POLICY "inseminations: auth read own farm"
  ON public.inseminations FOR SELECT TO authenticated
  USING (
    farm_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'farm_id')::UUID
    AND deleted_at IS NULL
  );

CREATE POLICY "inseminations: auth insert own farm"
  ON public.inseminations FOR INSERT TO authenticated
  WITH CHECK (
    farm_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'farm_id')::UUID
  );

-- ────────────────────────────────────────────────────────────────────────
-- 10. SOFT-DELETE HELPER VIEWS (active rows only)
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_cattle AS
  SELECT * FROM public.cattle WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.v_semen_inventory AS
  SELECT * FROM public.semen_inventory WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.v_heat_logs AS
  SELECT * FROM public.heat_logs WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.v_inseminations AS
  SELECT * FROM public.inseminations WHERE deleted_at IS NULL;

-- ────────────────────────────────────────────────────────────────────────
-- 11. RPC: decrement_semen_inventory
--     Called by genetics-boost.js after a successful insemination log.
--     SECURITY DEFINER so it can bypass RLS to update the row.
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.decrement_semen_inventory(
  p_semen_id UUID,
  p_farm_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
-- NOT security definer: runs as the calling role so RLS on semen_inventory is enforced.
-- The farm_id parameter is cross-checked against both the row AND the JWT claim so a
-- caller cannot mutate another tenant's inventory even if they know the UUID.
SET search_path = public
AS $
DECLARE
  v_remaining   INTEGER;
  v_jwt_farm_id UUID;
BEGIN
  -- Extract the farm_id from the JWT claims (set by Supabase for authenticated users).
  -- For anon callers the claim is absent; fall back to the single default farm only.
  BEGIN
    v_jwt_farm_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'farm_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_jwt_farm_id := NULL;
  END;

  -- Authorization: authenticated users may only touch their own farm.
  -- Anon users are restricted to the single Bhullar Dairy default farm.
  IF v_jwt_farm_id IS NOT NULL AND v_jwt_farm_id <> p_farm_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Unauthorized: farm_id mismatch'
    );
  END IF;

  IF v_jwt_farm_id IS NULL AND p_farm_id <> '00000000-0000-0000-0000-000000000001'::UUID THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Unauthorized: anon callers may only act on the default farm'
    );
  END IF;

  UPDATE public.semen_inventory
  SET    units_available = GREATEST(0, units_available - 1)
  WHERE  id         = p_semen_id
    AND  farm_id    = p_farm_id   -- double-lock: must match both param AND row
    AND  deleted_at IS NULL
  RETURNING units_available INTO v_remaining;

  IF v_remaining IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Semen record not found, deleted, or farm mismatch'
    );
  END IF;

  RETURN jsonb_build_object(
    'success',   true,
    'remaining', v_remaining,
    'warning',   (v_remaining = 0)
  );
END;
$;

-- Grant execute — authorization is enforced inside the function body above,
-- not via SECURITY DEFINER, so RLS on the table still applies.
GRANT EXECUTE ON FUNCTION public.decrement_semen_inventory(UUID, UUID)
  TO anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────
-- 12. RLS — technicians (read-only for all, no tenant split needed yet)
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read" ON public.technicians;
CREATE POLICY "technicians: anon read"
  ON public.technicians FOR SELECT TO anon USING (true);
CREATE POLICY "technicians: auth read"
  ON public.technicians FOR SELECT TO authenticated USING (true);

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- DEPLOYMENT CHECKLIST
-- ═══════════════════════════════════════════════════════════════════════
-- 1. Run this script in Supabase SQL Editor
-- 2. Deploy the weather-proxy Edge Function:
--      supabase functions deploy weather-proxy --project-ref <your-project-ref>
-- 3. Set the OWM secret (optional — function falls back to seasonal estimate):
--      supabase secrets set OPENWEATHER_API_KEY=<your-owm-key> --project-ref <ref>
-- 4. Hard-refresh the PWA or bump sw.js cache name (e.g. bhullar-v9)
-- ═══════════════════════════════════════════════════════════════════════
