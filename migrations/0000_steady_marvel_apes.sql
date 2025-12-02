CREATE TABLE "bales" (
	"id" text PRIMARY KEY NOT NULL,
	"safra" text NOT NULL,
	"talhao" text NOT NULL,
	"numero" integer NOT NULL,
	"tipo" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'campo' NOT NULL,
	"status_history" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text,
	"transported_at" timestamp,
	"transported_by" text,
	"processed_at" timestamp,
	"processed_by" text
);
--> statement-breakpoint
CREATE TABLE "carregamentos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"safra" text NOT NULL,
	"talhao" text NOT NULL,
	"peso_kg" text NOT NULL,
	"data_carregamento" timestamp DEFAULT now() NOT NULL,
	"observacao" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "classificacoes_lote" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"peso_kg" text NOT NULL,
	"descricao" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "classificacoes_lote_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE "fardinhos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"safra" text NOT NULL,
	"lote_id" varchar,
	"quantidade" integer NOT NULL,
	"peso_unitario" text DEFAULT '0' NOT NULL,
	"data_registro" timestamp DEFAULT now() NOT NULL,
	"observacao" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "lotes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"safra" text NOT NULL,
	"numero_lote" integer NOT NULL,
	"classificacao_id" varchar,
	"peso_pluma" text NOT NULL,
	"qtd_fardinhos" integer DEFAULT 0 NOT NULL,
	"data_processamento" timestamp DEFAULT now() NOT NULL,
	"observacao" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"is_active" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perdas" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"safra" text NOT NULL,
	"talhao" text NOT NULL,
	"arrobas_ha" text NOT NULL,
	"motivo" text NOT NULL,
	"data_perda" timestamp DEFAULT now() NOT NULL,
	"observacao" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "producao_talhao" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"safra" text NOT NULL,
	"talhao" text NOT NULL,
	"peso_bruto_total" text NOT NULL,
	"peso_pluma_total" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "rendimento_talhao" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"safra" text NOT NULL,
	"talhao" text NOT NULL,
	"rendimento_pluma" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "safras" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"is_ativa" integer DEFAULT 1 NOT NULL,
	"meta_produtividade" text DEFAULT '350' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "safras_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "talhao_counters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"safra" text NOT NULL,
	"talhao" text NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "talhoes_info" (
	"id" varchar PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"hectares" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "talhoes_info_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE "talhoes_safra" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"safra_id" varchar NOT NULL,
	"nome" text NOT NULL,
	"hectares" text NOT NULL,
	"geometry" text NOT NULL,
	"centroid" text,
	"cultura" text DEFAULT 'algodao' NOT NULL,
	"colheita_status" text DEFAULT 'planejado' NOT NULL,
	"area_colhida" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"password" text NOT NULL,
	"roles" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "fardinhos" ADD CONSTRAINT "fardinhos_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_classificacao_id_classificacoes_lote_id_fk" FOREIGN KEY ("classificacao_id") REFERENCES "public"."classificacoes_lote"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talhoes_safra" ADD CONSTRAINT "talhoes_safra_safra_id_safras_id_fk" FOREIGN KEY ("safra_id") REFERENCES "public"."safras"("id") ON DELETE cascade ON UPDATE no action;