import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles for authentication
export type UserRole = "superadmin" | "admin" | "campo" | "transporte" | "algodoeira";

// Bale status flow: campo -> patio -> beneficiado
export type BaleStatus = "campo" | "patio" | "beneficiado";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(), // Nome de exibição
  password: text("password").notNull(),
  roles: text("roles").notNull(), // Array de papéis em JSON: ["admin", "campo", "transporte"]
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by"), // ID do usuário que criou
});

// Bales table (ID é o QR Code, com rastreabilidade)
export const bales = pgTable("bales", {
  id: text("id").primaryKey(), // Format: S25/26-T2B-00001
  safra: text("safra").notNull(),
  talhao: text("talhao").notNull(),
  numero: integer("numero").notNull(), // Sequential number: 1, 2, 3...
  status: text("status").notNull().$type<BaleStatus>().default("campo"),
  statusHistory: text("status_history"), // JSON array of status changes with timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by").notNull(), // Usuário que criou o fardo
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by"), // Último usuário que atualizou
  transportedAt: timestamp("transported_at"), // Quando foi transportado
  transportedBy: text("transported_by"), // Quem transportou
  processedAt: timestamp("processed_at"), // Quando foi beneficiado
  processedBy: text("processed_by"), // Quem beneficiou
});

// Contador de numeração por safra + talhão
export const talhaoCounters = pgTable("talhao_counters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  safra: text("safra").notNull(),
  talhao: text("talhao").notNull(),
  lastNumber: integer("last_number").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Settings table (global configuration)
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Talhões table (field information)
export const talhoesInfo = pgTable("talhoes_info", {
  id: varchar("id").primaryKey(),
  nome: text("nome").notNull().unique(),
  hectares: text("hectares").notNull(), // Armazenado como texto para preservar decimais
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schemas with validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  displayName: true,
  password: true,
  roles: true,
});

export const createUserSchema = z.object({
  username: z.string().min(3, "Username deve ter no mínimo 3 caracteres"),
  displayName: z.string().min(3, "Nome de exibição deve ter no mínimo 3 caracteres"),
  password: z.string().min(4, "Senha deve ter no mínimo 4 caracteres"),
  roles: z.array(z.enum(["admin", "campo", "transporte", "algodoeira"])).min(1, "Selecione pelo menos um papel"),
});

// Schema para criação em lote de fardos
export const batchCreateBalesSchema = z.object({
  safra: z.string().min(1, "Safra é obrigatória"),
  talhao: z.string().min(1, "Talhão é obrigatório"),
  quantidade: z.number().min(1, "Quantidade deve ser maior que 0").max(1000, "Máximo 1000 fardos por vez"),
});

// Schema para criação de fardo individual (usado internamente)
export const createBaleSchema = z.object({
  id: z.string(),
  qrCode: z.string(),
  safra: z.string().optional(),
  talhao: z.string().min(1, "Talhão é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório"),
});

export const insertBaleSchema = createInsertSchema(bales).pick({
  id: true,
  safra: true,
  talhao: true,
  numero: true,
});

export const updateBaleStatusSchema = z.object({
  status: z.enum(["patio", "beneficiado"]),
  userId: z.string().optional(), // ID do usuário que está fazendo a atualização
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type User = typeof users.$inferSelect;

export type BatchCreateBales = z.infer<typeof batchCreateBalesSchema>;
export type CreateBale = z.infer<typeof createBaleSchema>;
export type InsertBale = z.infer<typeof insertBaleSchema>;
export type Bale = typeof bales.$inferSelect;
export type TalhaoCounter = typeof talhaoCounters.$inferSelect;

export type UpdateBaleStatus = z.infer<typeof updateBaleStatusSchema>;

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

// Settings schemas
export const insertSettingSchema = createInsertSchema(settings).pick({
  key: true,
  value: true,
});

export const updateDefaultSafraSchema = z.object({
  value: z.string().min(1, "Safra é obrigatória"),
});

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;
export type UpdateDefaultSafra = z.infer<typeof updateDefaultSafraSchema>;
// Talh�o info type
export type TalhaoInfo = typeof talhoesInfo.$inferSelect;
