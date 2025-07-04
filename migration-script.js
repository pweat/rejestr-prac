// migration-script.js
const { Pool } = require('pg');

// --- KONFIGURACJA ---
// WAŻNE: Wklej tutaj dane do połączenia ze swoją STARĄ, produkcyjną bazą na Supabase
const oldDbPool = new Pool({
  // Przykład: 'postgresql://postgres:[TWOJE_HASLO]@db.xxxxxxxx.supabase.co:5432/postgres'
  connectionString:
    'postgresql://postgres.haoenjhsppbltrrtgvop:dVLGn9cV@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: {
    rejectUnauthorized: false,
  },
});

// Dane do połączenia z Twoją NOWĄ, lokalną bazą danych (do testów)
const newDbPool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rejestr_prac',
  password: 'admin', // Twoje hasło do lokalnej bazy
  port: 5432,
});

async function migrateData() {
  console.log('Rozpoczynam migrację danych...');

  const oldDbClient = await oldDbPool.connect();
  const newDbClient = await newDbPool.connect(); // Na razie tylko otwieramy połączenie
  console.log('Połączono z obiema bazami danych.');

  try {
    // Pobieramy wszystkie zlecenia ze starej bazy
    const oldJobsResult = await oldDbClient.query('SELECT * FROM prace ORDER BY id ASC');
    const oldJobs = oldJobsResult.rows;
    console.log(`Pobrano ${oldJobs.length} zleceń ze starej bazy danych.`);

    // Tutaj w następnym kroku dodamy pętlę i logikę migracji
  } catch (error) {
    console.error('Błąd w trakcie migracji:', error);
  } finally {
    console.log('Zamykanie połączeń...');
    oldDbClient.release();
    newDbClient.release();
    await oldDbPool.end();
    await newDbPool.end();
    console.log('Połączenia zamknięte.');
  }

  console.log('Migracja zakończona!');
}

migrateData().catch((err) => console.error('Wystąpił krytyczny błąd podczas migracji:', err));
