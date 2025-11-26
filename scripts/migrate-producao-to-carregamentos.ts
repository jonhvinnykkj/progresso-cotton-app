import { db } from "../server/db";
import { producaoTalhao, carregamentos } from "../shared/schema";
import { eq } from "drizzle-orm";

async function migrateProducaoToCarregamentos() {
  console.log("🚀 Iniciando migração de producao_talhao para carregamentos...\n");

  try {
    // 1. Buscar todos os registros da tabela antiga
    const producaoRecords = await db.select().from(producaoTalhao);
    console.log(`📊 Encontrados ${producaoRecords.length} registros na tabela producao_talhao\n`);

    if (producaoRecords.length === 0) {
      console.log("⚠️ Nenhum registro para migrar.");
      return;
    }

    // 2. Verificar se já existem carregamentos para não duplicar
    const existingCarregamentos = await db.select().from(carregamentos);
    console.log(`📋 Já existem ${existingCarregamentos.length} carregamentos na tabela nova\n`);

    // 3. Criar mapa de carregamentos existentes por safra+talhao
    const existingMap = new Map<string, boolean>();
    for (const c of existingCarregamentos) {
      existingMap.set(`${c.safra}-${c.talhao}`, true);
    }

    // 4. Migrar cada registro
    let migrated = 0;
    let skipped = 0;

    for (const record of producaoRecords) {
      const key = `${record.safra}-${record.talhao}`;

      // Pular se já existe carregamento para este talhão/safra
      if (existingMap.has(key)) {
        console.log(`⏭️  Pulando ${record.talhao} (safra ${record.safra}) - já existe carregamento`);
        skipped++;
        continue;
      }

      // Criar carregamento com os dados da tabela antiga
      const now = new Date();
      await db.insert(carregamentos).values({
        safra: record.safra,
        talhao: record.talhao,
        pesoKg: record.pesoBrutoTotal, // Peso bruto total vira o peso do carregamento
        dataCarregamento: record.createdAt || now,
        observacao: `Migrado de producao_talhao em ${now.toLocaleDateString("pt-BR")}`,
        createdAt: now,
        createdBy: "migration-script",
      });

      console.log(`✅ Migrado: ${record.talhao} (safra ${record.safra}) - ${record.pesoBrutoTotal} KG`);
      migrated++;
    }

    console.log("\n" + "=".repeat(50));
    console.log(`✅ Migração concluída!`);
    console.log(`   - Registros migrados: ${migrated}`);
    console.log(`   - Registros pulados: ${skipped}`);
    console.log("=".repeat(50));

  } catch (error) {
    console.error("❌ Erro durante a migração:", error);
    throw error;
  }
}

// Executar
migrateProducaoToCarregamentos()
  .then(() => {
    console.log("\n🎉 Script finalizado com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script falhou:", error);
    process.exit(1);
  });
