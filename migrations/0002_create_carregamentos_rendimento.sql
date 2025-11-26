-- Tabela de carregamentos de caminhão (peso por carregamento)
CREATE TABLE IF NOT EXISTS "carregamentos" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "safra" text NOT NULL,
  "talhao" text NOT NULL,
  "peso_kg" text NOT NULL,
  "data_carregamento" timestamp NOT NULL DEFAULT now(),
  "observacao" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "created_by" text
);

-- Tabela de rendimento de pluma por talhão
CREATE TABLE IF NOT EXISTS "rendimento_talhao" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "safra" text NOT NULL,
  "talhao" text NOT NULL,
  "rendimento_pluma" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "updated_by" text
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS "idx_carregamentos_safra" ON "carregamentos" ("safra");
CREATE INDEX IF NOT EXISTS "idx_carregamentos_talhao" ON "carregamentos" ("talhao");
CREATE INDEX IF NOT EXISTS "idx_carregamentos_safra_talhao" ON "carregamentos" ("safra", "talhao");

CREATE INDEX IF NOT EXISTS "idx_rendimento_safra" ON "rendimento_talhao" ("safra");
CREATE INDEX IF NOT EXISTS "idx_rendimento_talhao" ON "rendimento_talhao" ("talhao");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_rendimento_safra_talhao" ON "rendimento_talhao" ("safra", "talhao");
