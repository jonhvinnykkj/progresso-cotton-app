import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { carregamentos } from "../shared/schema";
import { eq } from "drizzle-orm";

async function testQuery() {
  console.log("🔍 Testando query getPesoBrutoByTalhao...\n");

  const safra = "24/25";

  try {
    const result = await db
      .select({
        talhao: carregamentos.talhao,
        pesoBrutoTotal: sql<number>`COALESCE(SUM(CAST(${carregamentos.pesoKg} AS DECIMAL)), 0)`,
        quantidadeCarregamentos: sql<number>`COUNT(*)`,
      })
      .from(carregamentos)
      .where(eq(carregamentos.safra, safra))
      .groupBy(carregamentos.talhao);

    console.log("Resultado da query:");
    console.log(JSON.stringify(result, null, 2));

    console.log("\nFormatado:");
    for (const r of result) {
      console.log(`  ${r.talhao}: ${r.pesoBrutoTotal} KG (${r.quantidadeCarregamentos} carregamentos)`);
    }

  } catch (error) {
    console.error("❌ Erro:", error);
  }
}

testQuery()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
