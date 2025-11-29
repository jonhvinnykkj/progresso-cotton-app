-- Migration: Create perdas table
-- Description: Table to track cotton losses per talhao

CREATE TABLE IF NOT EXISTS perdas (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  safra TEXT NOT NULL,
  talhao TEXT NOT NULL,
  arrobas_ha TEXT NOT NULL,
  motivo TEXT NOT NULL,
  data_perda TIMESTAMP NOT NULL DEFAULT NOW(),
  observacao TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by TEXT
);

-- Create index for faster queries by safra
CREATE INDEX IF NOT EXISTS idx_perdas_safra ON perdas(safra);

-- Create index for faster queries by talhao
CREATE INDEX IF NOT EXISTS idx_perdas_talhao ON perdas(talhao);

-- Create composite index for safra + talhao
CREATE INDEX IF NOT EXISTS idx_perdas_safra_talhao ON perdas(safra, talhao);
