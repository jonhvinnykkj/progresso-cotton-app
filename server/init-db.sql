-- Create bales table with tracking
CREATE TABLE IF NOT EXISTS bales (
  id TEXT PRIMARY KEY,
  numero INTEGER NOT NULL,
  talhao TEXT NOT NULL,
  safra TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'campo',
  status_history TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by TEXT,
  transported_at TIMESTAMP,
  transported_by TEXT,
  processed_at TIMESTAMP,
  processed_by TEXT
);

-- Add new columns if they don't exist (migration for existing databases)
ALTER TABLE bales ADD COLUMN IF NOT EXISTS status_history TEXT;
ALTER TABLE bales ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE bales ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE bales ADD COLUMN IF NOT EXISTS transported_at TIMESTAMP;
ALTER TABLE bales ADD COLUMN IF NOT EXISTS transported_by TEXT;
ALTER TABLE bales ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;
ALTER TABLE bales ADD COLUMN IF NOT EXISTS processed_by TEXT;

-- Create talhao_counters table
CREATE TABLE IF NOT EXISTS talhao_counters (
  id SERIAL PRIMARY KEY,
  safra TEXT NOT NULL,
  talhao TEXT NOT NULL DEFAULT '',
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(safra, talhao)
);

-- Create users table with display_name and tracking (UUID ids)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  roles TEXT, -- JSON array de papéis: ["admin", "campo"]
  created_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT
);

-- Add new columns if they don't exist (migration for existing databases)
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT;

-- Update existing users with display_name based on username
UPDATE users SET display_name = username WHERE display_name IS NULL;

-- Migrar role para roles (array) para usuários existentes
UPDATE users SET roles = json_build_array(role)::text WHERE roles IS NULL;

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default users with PLAIN TEXT passwords and display names
INSERT INTO users (username, display_name, password, role) 
VALUES ('superadmin', 'Super Administrador', 'super123', 'superadmin') 
ON CONFLICT (username) DO UPDATE SET display_name = 'Super Administrador';

INSERT INTO users (username, display_name, password, role) 
VALUES ('admin', 'Administrador', 'admin123', 'admin') 
ON CONFLICT (username) DO UPDATE SET display_name = 'Administrador';

INSERT INTO users (username, display_name, password, role) 
VALUES ('campo', 'Operador de Campo', 'campo123', 'campo') 
ON CONFLICT (username) DO UPDATE SET display_name = 'Operador de Campo';

INSERT INTO users (username, display_name, password, role) 
VALUES ('transporte', 'Operador de Transporte', 'trans123', 'transporte') 
ON CONFLICT (username) DO UPDATE SET display_name = 'Operador de Transporte';

INSERT INTO users (username, display_name, password, role) 
VALUES ('algodoeira', 'Operador de Algodoeira', 'algo123', 'algodoeira') 
ON CONFLICT (username) DO UPDATE SET display_name = 'Operador de Algodoeira';

-- Insert default safra setting
INSERT INTO settings (key, value) VALUES ('default-safra', '25/26') ON CONFLICT (key) DO UPDATE SET value = '25/26';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bales_talhao ON bales(talhao);
CREATE INDEX IF NOT EXISTS idx_bales_safra ON bales(safra);
CREATE INDEX IF NOT EXISTS idx_bales_status ON bales(status);
CREATE INDEX IF NOT EXISTS idx_bales_created_by ON bales(created_by);
CREATE INDEX IF NOT EXISTS idx_bales_transported_by ON bales(transported_by);
CREATE INDEX IF NOT EXISTS idx_bales_processed_by ON bales(processed_by);
CREATE INDEX IF NOT EXISTS idx_talhao_counters_safra ON talhao_counters(safra);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);
