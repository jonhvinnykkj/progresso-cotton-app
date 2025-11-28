import 'dotenv/config';
import { db } from '../server/db';
import { bales } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function updateBales() {
  console.log('Atualizando fardos da safra 24/25 para status "beneficiado"...');

  const result = await db.update(bales)
    .set({
      status: 'beneficiado',
      updatedAt: new Date()
    })
    .where(eq(bales.safra, '24/25'))
    .returning({ id: bales.id });

  console.log(`✅ ${result.length} fardos atualizados com sucesso!`);
}

updateBales()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro:', err);
    process.exit(1);
  });
