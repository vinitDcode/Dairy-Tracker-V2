-- ═══════════════════════════════════════════════════════════
-- BHULLAR DAIRY FARM — SUPABASE SCHEMA
-- Run this in your Supabase SQL Editor:
--   https://app.supabase.com → SQL Editor → New Query → Paste → Run
-- ═══════════════════════════════════════════════════════════

-- ── 1. CATTLE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cattle (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_number        TEXT        UNIQUE NOT NULL,
  breed             TEXT,
  sire_id           TEXT,
  calving_due_date  DATE,
  milk_yield_avg    NUMERIC(6,2),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. SEMEN INVENTORY ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.semen_inventory (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bull_name         TEXT        NOT NULL,
  breed             TEXT,
  bull_sire_id      TEXT,
  milk_trait_score  NUMERIC(4,3),
  units_available   INTEGER     DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. HEAT LOGS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.heat_logs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cattle_id             UUID        REFERENCES public.cattle(id) ON DELETE CASCADE,
  logged_at             TIMESTAMPTZ DEFAULT NOW(),
  next_heat_prediction  DATE,
  am_pm_flag            TEXT        CHECK (am_pm_flag IN ('AM','PM')),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. TECHNICIANS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.technicians (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT  NOT NULL,
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. INSEMINATIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inseminations (
  id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  cattle_id        UUID  REFERENCES public.cattle(id) ON DELETE CASCADE,
  technician_id    UUID  REFERENCES public.technicians(id),
  semen_batch_id   TEXT,
  outcome          TEXT  CHECK (outcome IN ('pending','pregnant','failed')) DEFAULT 'pending',
  ai_date          DATE  DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────
ALTER TABLE public.cattle          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semen_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heat_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inseminations   ENABLE ROW LEVEL SECURITY;

-- anon: full read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cattle' AND policyname='anon_read') THEN
    CREATE POLICY anon_read ON public.cattle          FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='semen_inventory' AND policyname='anon_read') THEN
    CREATE POLICY anon_read ON public.semen_inventory FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='heat_logs' AND policyname='anon_read') THEN
    CREATE POLICY anon_read ON public.heat_logs       FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='technicians' AND policyname='anon_read') THEN
    CREATE POLICY anon_read ON public.technicians     FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inseminations' AND policyname='anon_read') THEN
    CREATE POLICY anon_read ON public.inseminations   FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- anon: write to heat_logs + inseminations (app logs these)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='heat_logs' AND policyname='anon_insert') THEN
    CREATE POLICY anon_insert ON public.heat_logs    FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inseminations' AND policyname='anon_insert') THEN
    CREATE POLICY anon_insert ON public.inseminations FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- ── SAMPLE DATA (remove or adjust for production) ─────────
INSERT INTO public.cattle (tag_number, breed, sire_id, calving_due_date, milk_yield_avg)
VALUES
  ('BHD-001', 'HF Cross', 'SIRE-ALPHA', '2025-05-14', 22.5),
  ('BHD-002', 'Sahiwal',  'SIRE-BETA',  '2025-08-20', 14.8),
  ('BHD-003', 'HF Cross', 'SIRE-GAMMA', '2025-04-03', 24.1)
ON CONFLICT (tag_number) DO NOTHING;

INSERT INTO public.technicians (name, phone)
VALUES
  ('Harpreet Singh', '+91-98765-00001'),
  ('Mandeep Kaur',   '+91-98765-00002'),
  ('Gurjeet Mann',   '+91-98765-00003')
ON CONFLICT DO NOTHING;

INSERT INTO public.semen_inventory (bull_name, breed, bull_sire_id, milk_trait_score, units_available)
VALUES
  ('Bull Vikram',  'HF Cross', 'SIRE-DELTA',  0.87, 12),
  ('Bull Ranjit',  'HF Cross', 'SIRE-ALPHA',  0.72,  8),
  ('Bull Arjuna',  'Sahiwal',  'SIRE-EPSILON',0.91, 15),
  ('Bull Harpreet','HF Cross', 'SIRE-GAMMA',  0.65,  5)
ON CONFLICT DO NOTHING;

WITH c AS (SELECT id FROM public.cattle WHERE tag_number='BHD-001' LIMIT 1)
INSERT INTO public.heat_logs (cattle_id, logged_at, next_heat_prediction, am_pm_flag)
SELECT id,
       NOW() - INTERVAL '3 days',
       (CURRENT_DATE + INTERVAL '18 days')::DATE,
       'AM'
FROM c
WHERE NOT EXISTS (SELECT 1 FROM public.heat_logs h WHERE h.cattle_id = c.id);

WITH c  AS (SELECT id FROM public.cattle     WHERE tag_number='BHD-001' LIMIT 1),
     t1 AS (SELECT id FROM public.technicians WHERE name='Harpreet Singh' LIMIT 1),
     t2 AS (SELECT id FROM public.technicians WHERE name='Mandeep Kaur'   LIMIT 1)
INSERT INTO public.inseminations (cattle_id, technician_id, semen_batch_id, outcome, ai_date)
SELECT c.id, t1.id, 'BATCH-2025-A', 'pregnant', CURRENT_DATE - INTERVAL '60 days' FROM c, t1 WHERE NOT EXISTS (SELECT 1 FROM public.inseminations i WHERE i.cattle_id=c.id AND i.semen_batch_id='BATCH-2025-A')
UNION ALL
SELECT c.id, t2.id, 'BATCH-2025-A', 'failed',   CURRENT_DATE - INTERVAL '40 days' FROM c, t2 WHERE NOT EXISTS (SELECT 1 FROM public.inseminations i WHERE i.cattle_id=c.id AND i.semen_batch_id='BATCH-2025-A' AND i.outcome='failed')
UNION ALL
SELECT c.id, t1.id, 'BATCH-2025-B', 'pregnant', CURRENT_DATE - INTERVAL '20 days' FROM c, t1 WHERE NOT EXISTS (SELECT 1 FROM public.inseminations i WHERE i.cattle_id=c.id AND i.semen_batch_id='BATCH-2025-B');
