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

    for (const oldJob of oldJobs) {
      console.log(`\nMigracja zlecenia ID: ${oldJob.id} dla "${oldJob.od_kogo}"...`);

      // Rozpoczynamy transakcję dla tego jednego zlecenia w nowej bazie
      await newDbClient.query('BEGIN');

      try {
        // Krok 1: Znajdź lub stwórz klienta na podstawie numeru telefonu
        let clientId;
        // Sprawdzamy, czy numer telefonu nie jest pusty
        if (!oldJob.numer_tel) {
          console.log(`  - POMINIĘTO: Brak numeru telefonu.`);
          await newDbClient.query('ROLLBACK'); // Anulujemy transakcję dla tego wpisu
          continue; // Przechodzimy do następnego zlecenia
        }

        const clientResult = await newDbClient.query(
          'SELECT id FROM clients WHERE phone_number = $1',
          [oldJob.numer_tel]
        );

        if (clientResult.rows.length > 0) {
          clientId = clientResult.rows[0].id;
          console.log(`  - Klient znaleziony w nowej bazie (ID: ${clientId})`);
        } else {
          const newClientResult = await newDbClient.query(
            'INSERT INTO clients (name, phone_number, address) VALUES ($1, $2, $3) RETURNING id',
            [oldJob.od_kogo, oldJob.numer_tel, oldJob.miejscowosc]
          );
          clientId = newClientResult.rows[0].id;
          console.log(`  - Stworzono nowego klienta (ID: ${clientId})`);
        }

        // Krok 2: Stwórz wpis w 'well_details'
        // Zakładamy, że wszystkie stare prace to 'wykonanie studni'
        const detailsSql = `
            INSERT INTO well_details 
            (miejscowosc, pracownicy, informacje, srednica, ilosc_metrow, lustro_statyczne, lustro_dynamiczne, wydajnosc) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
        `;
        const detailsValues = [
          oldJob.miejscowosc,
          oldJob.pracownicy,
          oldJob.informacje,
          oldJob.srednica,
          oldJob.ilosc_metrow,
          oldJob.lustro_statyczne,
          oldJob.lustro_dynamiczne,
          oldJob.wydajnosc,
        ];
        const detailsResult = await newDbClient.query(detailsSql, detailsValues);
        const detailsId = detailsResult.rows[0].id;

        // Krok 3: Stwórz główny wpis w 'jobs'
        const jobSql = `INSERT INTO jobs (client_id, job_type, job_date, details_id) VALUES ($1, $2, $3, $4) RETURNING id`;
        // Używamy daty zakończenia jako głównej daty zlecenia
        const jobDate = oldJob.data_zakonczenia || new Date();
        const jobResult = await newDbClient.query(jobSql, [
          clientId,
          'well_drilling',
          jobDate,
          detailsId,
        ]);
        const jobId = jobResult.rows[0].id;

        // Krok 4: Zaktualizuj job_id w tabeli szczegółów (kluczowe powiązanie)
        await newDbClient.query('UPDATE well_details SET job_id = $1 WHERE id = $2', [
          jobId,
          detailsId,
        ]);

        await newDbClient.query('COMMIT'); // Zatwierdź transakcję, jeśli wszystko poszło dobrze
        console.log(`  - Pomyślnie zmigrowano zlecenie. Nowe ID zlecenia: ${jobId}`);
      } catch (err) {
        await newDbClient.query('ROLLBACK'); // Wycofaj zmiany w razie błędu dla tego jednego zlecenia
        console.error(
          `  - Błąd podczas migracji zlecenia ID: ${oldJob.id}. Zmiany wycofane. Błąd:`,
          err.message
        );
      }
    }
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
