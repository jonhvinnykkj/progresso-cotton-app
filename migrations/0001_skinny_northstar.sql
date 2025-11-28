CREATE TABLE "fardinhos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"safra" text NOT NULL,
	"quantidade" integer NOT NULL,
	"data_registro" timestamp DEFAULT now() NOT NULL,
	"observacao" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "safras" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"is_ativa" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "safras_nome_unique" UNIQUE("nome")
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
ALTER TABLE "lotes" ALTER COLUMN "qtd_fardinhos" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "talhoes_safra" ADD CONSTRAINT "talhoes_safra_safra_id_safras_id_fk" FOREIGN KEY ("safra_id") REFERENCES "public"."safras"("id") ON DELETE cascade ON UPDATE no action;