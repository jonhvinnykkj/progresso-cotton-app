import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles for authentication
export type UserRole = "superadmin" | "admin" | "campo" | "transporte" | "algodoeira";

// Bale status flow: campo -> patio -> beneficiado
export type BaleStatus = "campo" | "patio" | "beneficiado";

// Bale type classification
export type BaleType = "normal" | "bordadura" | "bituca";

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
  tipo: text("tipo").notNull().$type<BaleType>().default("normal"), // Tipo: normal, bordadura, bituca
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

// Carregamentos de caminhão (peso por carregamento)
export const carregamentos = pgTable("carregamentos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  safra: text("safra").notNull(),
  talhao: text("talhao").notNull(),
  pesoKg: text("peso_kg").notNull(), // Peso do carregamento em KG
  dataCarregamento: timestamp("data_carregamento").notNull().defaultNow(),
  observacao: text("observacao"), // Observação opcional
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by"), // Usuário que cadastrou
});

// Rendimento de pluma por talhão (apenas o % - peso bruto vem dos carregamentos)
export const rendimentoTalhao = pgTable("rendimento_talhao", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  safra: text("safra").notNull(),
  talhao: text("talhao").notNull(),
  rendimentoPluma: text("rendimento_pluma").notNull(), // Percentual (ex: "41.50")
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by"), // Usuário que atualizou
});

// Lotes de beneficiamento (batches processadas na algodoeira)
// Lote = quantidade de fardos beneficiados em um dia, independente de talhão
export const lotes = pgTable("lotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  safra: text("safra").notNull(),
  numeroLote: integer("numero_lote").notNull(), // Número sequencial do lote na safra
  pesoPluma: text("peso_pluma").notNull(), // Peso da pluma em KG (manual)
  qtdFardinhos: integer("qtd_fardinhos").notNull().default(0), // Quantidade de fardinhos (opcional, default 0)
  dataProcessamento: timestamp("data_processamento").notNull().defaultNow(),
  observacao: text("observacao"), // Observação opcional
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by"), // Usuário que cadastrou
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by"), // Último usuário que atualizou
});

// Registro de fardinhos (separado dos lotes de pluma)
export const fardinhos = pgTable("fardinhos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  safra: text("safra").notNull(),
  quantidade: integer("quantidade").notNull(), // Quantidade de fardinhos registrados
  dataRegistro: timestamp("data_registro").notNull().defaultNow(),
  observacao: text("observacao"), // Observação opcional
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by"), // Usuário que cadastrou
});

// Perdas de algodão (por talhão e safra)
export const perdas = pgTable("perdas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  safra: text("safra").notNull(),
  talhao: text("talhao").notNull(),
  arrobasHa: text("arrobas_ha").notNull(), // Perda em @/ha
  motivo: text("motivo").notNull(), // Motivo da perda (causa natural, praga, etc.)
  dataPerda: timestamp("data_perda").notNull().defaultNow(),
  observacao: text("observacao"), // Observação opcional
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by"), // Usuário que cadastrou
});

// DEPRECATED: Mantido para compatibilidade - usar carregamentos + rendimentoTalhao
export const producaoTalhao = pgTable("producao_talhao", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  safra: text("safra").notNull(),
  talhao: text("talhao").notNull(),
  pesoBrutoTotal: text("peso_bruto_total").notNull(),
  pesoPlumaTotal: text("peso_pluma_total").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

// Notifications table (admin broadcast messages)
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().$type<"info" | "warning" | "success" | "error">().default("info"),
  createdBy: text("created_by").notNull(), // Admin que criou
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"), // Notificação expira após essa data
  isActive: integer("is_active").notNull().default(1), // 1 = ativa, 0 = inativa
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
  tipo: z.enum(["normal", "bordadura", "bituca"]).default("normal"),
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

// Notification schemas
export const createNotificationSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(100, "Título muito longo"),
  message: z.string().min(1, "Mensagem é obrigatória").max(500, "Mensagem muito longa"),
  type: z.enum(["info", "warning", "success", "error"]).default("info"),
  expiresAt: z.string().optional(), // ISO date string
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

export type CreateNotification = z.infer<typeof createNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

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
// Talhão info type
export type TalhaoInfo = typeof talhoesInfo.$inferSelect;

// Carregamentos schemas
export const createCarregamentoSchema = z.object({
  safra: z.string().min(1, "Safra é obrigatória"),
  talhao: z.string().min(1, "Talhão é obrigatório"),
  pesoKg: z.string().min(1, "Peso é obrigatório"),
  dataCarregamento: z.string().optional(),
  observacao: z.string().optional(),
});

export type CreateCarregamento = z.infer<typeof createCarregamentoSchema>;
export type Carregamento = typeof carregamentos.$inferSelect;

// Rendimento Talhão schemas
export const upsertRendimentoTalhaoSchema = z.object({
  safra: z.string().min(1, "Safra é obrigatória"),
  talhao: z.string().min(1, "Talhão é obrigatório"),
  rendimentoPluma: z.string().min(1, "Rendimento é obrigatório"),
});

export type UpsertRendimentoTalhao = z.infer<typeof upsertRendimentoTalhaoSchema>;
export type RendimentoTalhao = typeof rendimentoTalhao.$inferSelect;

// Lotes schemas (apenas peso da pluma)
export const createLoteSchema = z.object({
  safra: z.string().min(1, "Safra é obrigatória"),
  pesoPluma: z.string().min(1, "Peso da pluma é obrigatório"),
  qtdFardinhos: z.number().optional().default(0), // Opcional, agora fardinhos são registrados separadamente
  dataProcessamento: z.string().optional(),
  observacao: z.string().optional(),
});

export const updateLoteSchema = z.object({
  pesoPluma: z.string().min(1, "Peso da pluma é obrigatório").optional(),
  qtdFardinhos: z.number().optional(),
  dataProcessamento: z.string().optional(),
  observacao: z.string().optional(),
});

export type CreateLote = z.infer<typeof createLoteSchema>;
export type UpdateLote = z.infer<typeof updateLoteSchema>;
export type Lote = typeof lotes.$inferSelect;

// Fardinhos schemas
export const createFardinhoSchema = z.object({
  safra: z.string().min(1, "Safra é obrigatória"),
  quantidade: z.number().min(1, "Quantidade deve ser maior que 0"),
  dataRegistro: z.string().optional(),
  observacao: z.string().optional(),
});

export const updateFardinhoSchema = z.object({
  quantidade: z.number().min(1, "Quantidade deve ser maior que 0").optional(),
  observacao: z.string().optional(),
});

export type CreateFardinho = z.infer<typeof createFardinhoSchema>;
export type UpdateFardinho = z.infer<typeof updateFardinhoSchema>;
export type Fardinho = typeof fardinhos.$inferSelect;

// Perdas schemas
export const createPerdaSchema = z.object({
  safra: z.string().min(1, "Safra é obrigatória"),
  talhao: z.string().min(1, "Talhão é obrigatório"),
  arrobasHa: z.string().min(1, "Perda em @/ha é obrigatória"),
  motivo: z.string().min(1, "Motivo é obrigatório"),
  dataPerda: z.string().optional(),
  observacao: z.string().optional(),
});

export const updatePerdaSchema = z.object({
  arrobasHa: z.string().min(1, "Perda em @/ha é obrigatória").optional(),
  motivo: z.string().min(1, "Motivo é obrigatório").optional(),
  observacao: z.string().optional(),
});

export type CreatePerda = z.infer<typeof createPerdaSchema>;
export type UpdatePerda = z.infer<typeof updatePerdaSchema>;
export type Perda = typeof perdas.$inferSelect;

// Update bale type schema
export const updateBaleTypeSchema = z.object({
  tipo: z.enum(["normal", "bordadura", "bituca"]),
});

// DEPRECATED: Produção Talhão schemas (usar carregamentos + rendimentoTalhao)
export const upsertProducaoTalhaoSchema = z.object({
  safra: z.string().min(1, "Safra é obrigatória"),
  talhao: z.string().min(1, "Talhão é obrigatório"),
  pesoBrutoTotal: z.string().min(1, "Peso bruto é obrigatório"),
  pesoPlumaTotal: z.string().min(1, "Peso da pluma é obrigatório"),
});

export type UpsertProducaoTalhao = z.infer<typeof upsertProducaoTalhaoSchema>;
export type ProducaoTalhao = typeof producaoTalhao.$inferSelect;

// ==================== CONFIGURAÇÃO DE SAFRAS ====================

// Tabela de safras configuradas
export const safras = pgTable("safras", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull().unique(), // Ex: "24/25", "25/26"
  descricao: text("descricao"), // Descrição opcional
  isAtiva: integer("is_ativa").notNull().default(1), // 1 = ativa (safra padrão), 0 = inativa
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Talhões de algodão vinculados a cada safra (importados do shapefile)
export const talhoesSafra = pgTable("talhoes_safra", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  safraId: varchar("safra_id").notNull().references(() => safras.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(), // Nome do talhão (ex: "1A", "2B")
  hectares: text("hectares").notNull(), // Área em hectares (calculada do polígono)
  geometry: text("geometry").notNull(), // GeoJSON do polígono (para renderizar no mapa)
  centroid: text("centroid"), // GeoJSON do centróide (para posicionar labels)
  cultura: text("cultura").notNull().default("algodao"), // Tipo de cultura (sempre algodão neste caso)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by"),
});

// Schemas para safras
export const createSafraSchema = z.object({
  nome: z.string().min(1, "Nome da safra é obrigatório").regex(/^\d{2}\/\d{2}$/, "Formato inválido. Use: XX/XX"),
  descricao: z.string().optional(),
});

export const updateSafraSchema = z.object({
  descricao: z.string().optional(),
  isAtiva: z.number().min(0).max(1).optional(),
});

export type CreateSafra = z.infer<typeof createSafraSchema>;
export type UpdateSafra = z.infer<typeof updateSafraSchema>;
export type Safra = typeof safras.$inferSelect;

// Schemas para talhões da safra
export const createTalhaoSafraSchema = z.object({
  safraId: z.string().min(1, "ID da safra é obrigatório"),
  nome: z.string().min(1, "Nome do talhão é obrigatório"),
  hectares: z.string().min(1, "Hectares é obrigatório"),
  geometry: z.string().min(1, "Geometria é obrigatória"),
  centroid: z.string().optional(),
  cultura: z.string().default("algodao"),
});

export const batchCreateTalhoesSafraSchema = z.object({
  safraId: z.string().min(1, "ID da safra é obrigatório"),
  talhoes: z.array(z.object({
    nome: z.string().min(1),
    hectares: z.string().min(1),
    geometry: z.string().min(1),
    centroid: z.string().optional(),
  })).min(1, "Selecione pelo menos um talhão"),
});

export type CreateTalhaoSafra = z.infer<typeof createTalhaoSafraSchema>;
export type BatchCreateTalhoesSafra = z.infer<typeof batchCreateTalhoesSafraSchema>;
export type TalhaoSafra = typeof talhoesSafra.$inferSelect;
