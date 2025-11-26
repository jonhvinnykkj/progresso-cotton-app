import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function listTables() {
  console.log("📋 Listando tabelas no banco de dados...\n");

  try {
    const result = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log("Tabelas encontradas:");
    for (const row of result.rows) {
      console.log(`  - ${row.table_name}`);
    }

    // Verificar dados na tabela carregamentos
    console.log("\n📊 Verificando tabela carregamentos...");
    const carregamentosCount = await db.execute(sql`SELECT COUNT(*) as count FROM carregamentos`);
    console.log(`  Registros em carregamentos: ${carregamentosCount.rows[0]?.count || 0}`);

    // Listar carregamentos se existirem
    const carregamentosList = await db.execute(sql`SELECT safra, talhao, peso_kg FROM carregamentos LIMIT 10`);
    if (carregamentosList.rows.length > 0) {
      console.log("\n  Primeiros registros:");
      for (const row of carregamentosList.rows) {
        console.log(`    ${row.safra} | ${row.talhao} | ${row.peso_kg} KG`);
      }
    }

  } catch (error) {
    console.error("❌ Erro:", error);
  }
}

listTables()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
