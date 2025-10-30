import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function initDatabase() {
  console.log('🔧 Initializing database...');

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables!');
    process.exit(1);
  }

  try {
    // Create SQL connection
    const sql = neon(databaseUrl);
    
    // Read SQL file
    const sqlFilePath = join(__dirname, 'init-db.sql');
    const sqlScript = readFileSync(sqlFilePath, 'utf-8');
    
    console.log('📄 Executing SQL script...');
    
    // Split SQL script into individual statements and execute them
    const statements = sqlScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          await sql(statement);
          console.log(`✓ Statement ${i + 1}/${statements.length} executed`);
        } catch (error: any) {
          // Ignore DROP errors (table might not exist)
          if (statement.startsWith('DROP') && error.code === '42P01') {
            console.log(`  Skipping DROP (table doesn't exist)`);
            continue;
          }
          // Ignore duplicate key errors for INSERT
          if (error.code === '23505') {
            console.log(`  Skipping INSERT (record already exists)`);
            continue;
          }
          throw error;
        }
      }
    }
    
    console.log('✅ Database initialized successfully!');
    console.log('👤 Default users created:');
    console.log('   - admin / admin123');
    console.log('   - campo / campo123');
    console.log('   - transporte / trans123');
    console.log('   - algodoeira / algo123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();
