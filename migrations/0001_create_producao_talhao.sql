-- Migration: Create producao_talhao table
-- Description: Stores real production data per talhão (entered by algodoeira)
-- Date: 2025-01-25

CREATE TABLE IF NOT EXISTS "producao_talhao" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "safra" text NOT NULL,
  "talhao" text NOT NULL,
  "peso_bruto_total" text NOT NULL,
  "peso_pluma_total" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "updated_by" text
);

-- Create unique index for safra + talhao combination
CREATE UNIQUE INDEX IF NOT EXISTS "producao_talhao_safra_talhao_idx"
  ON "producao_talhao" ("safra", "talhao");

-- Create index for faster queries by safra
CREATE INDEX IF NOT EXISTS "producao_talhao_safra_idx"
  ON "producao_talhao" ("safra");
