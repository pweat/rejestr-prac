/**
 * Dane demonstracyjne do testów pulpitu — powiadomienia serwisowe.
 * Użycie: node scripts/seed-service-reminders-demo.js
 * Wymaga: .local.env + działający PostgreSQL (scripts/start-local-db.ps1)
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const localEnvPath = path.join(__dirname, '..', '.local.env');
if (fs.existsSync(localEnvPath)) {
  fs.readFileSync(localEnvPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx > 0) process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    });
}

const useSsl = process.env.DATABASE_URL && !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  user: 'postgres',
  host: 'localhost',
  database: 'rejestr_prac',
  password: 'admin',
  port: 5432,
});

function normalizeMiejscowosc(miejscowosc) {
  return (miejscowosc || '').trim().toLowerCase();
}

function formatMiejscowosc(miejscowosc) {
  const t = (miejscowosc || '').trim();
  return t || '—';
}

/** Data N miesięcy wstecz od dziś (YYYY-MM-DD). */
function monthsAgo(months, extraDays = 0) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setMonth(d.getMonth() - months);
  d.setDate(d.getDate() - extraDays);
  return d.toISOString().slice(0, 10);
}

/** Data za N dni od dziś. */
function daysFromNow(days) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Ustawia last_service_date tak, aby next = last + interval mies. wypadało za `dueInDays` dni.
 * dueInDays ujemne = termin już minął (wygasło).
 */
function lastDateForDueIn(intervalMonths, dueInDays) {
  const due = new Date();
  due.setHours(12, 0, 0, 0);
  due.setDate(due.getDate() + dueInDays);
  const last = new Date(due);
  last.setMonth(last.getMonth() - intervalMonths);
  return last.toISOString().slice(0, 10);
}

const DEMO_USER = {
  username: 'lokalny',
  password: 'lokalny123',
  role: 'admin',
};

/** Klient + harmonogram — wszystkie powinny trafić na pulpit (termin <= 30 dni). */
const DEMO_SCHEDULES = [
  {
    client: {
      name: 'Jan Kowalski [DEMO serwis]',
      phone_number: '600100001',
      address: 'Polna 12, Kwidzyn',
      notes: 'Demo: serwis przeterminowany (Wygasło).',
      email: 'demo.serwis1@test.local',
    },
    miejscowosc: 'Kwidzyn',
    interval: 12,
    lastServiceDate: lastDateForDueIn(12, -18),
    stationModel: 'AQUAHOME 25',
    notes: 'Stacja Kwidzyn — termin minął ~18 dni temu',
  },
  {
    client: {
      name: 'Anna Nowak [DEMO serwis]',
      phone_number: '600100002',
      address: 'Leśna 5, Malbork',
      notes: 'Demo: serwis za tydzień (Wkrótce).',
      email: 'demo.serwis2@test.local',
    },
    miejscowosc: 'Malbork',
    interval: 12,
    lastServiceDate: lastDateForDueIn(12, 7),
    stationModel: 'SUPREME SOFT 30',
    notes: 'Stacja Malbork — następny serwis za ok. 7 dni',
  },
  {
    client: {
      name: 'Piotr Wiśniewski [DEMO serwis]',
      phone_number: '600100003',
      address: 'Kwiatowa 3, Grudziądz',
      notes: 'Demo: krótszy interwał 6 m-cy, termin za ~20 dni.',
      email: 'demo.serwis3@test.local',
    },
    miejscowosc: 'Grudziądz',
    interval: 6,
    lastServiceDate: lastDateForDueIn(6, 20),
    stationModel: 'ECO-FLOW 20',
    notes: 'Interwał 6 mies. — wkrótce',
  },
  {
    client: {
      name: 'Marta Mazur [DEMO serwis]',
      phone_number: '600100004',
      address: 'Słoneczna 8, Tczew',
      notes: 'Demo: dwa obiekty u jednego klienta.',
      email: 'demo.serwis4@test.local',
    },
    miejscowosc: 'Tczew — działka A',
    interval: 12,
    lastServiceDate: lastDateForDueIn(12, -5),
    stationModel: 'AQUAHOME 25',
    notes: 'Lokalizacja A — wygasło',
  },
  {
    client: {
      name: 'Marta Mazur [DEMO serwis]',
      phone_number: '600100004',
      address: 'Słoneczna 8, Tczew',
      notes: 'Demo: druga lokalizacja tego samego klienta.',
      email: 'demo.serwis4@test.local',
    },
    miejscowosc: 'Tczew — działka B',
    interval: 12,
    lastServiceDate: lastDateForDueIn(12, 14),
    stationModel: 'SUPREME SOFT 30',
    notes: 'Lokalizacja B — za ~14 dni',
    sameClientAsPrevious: true,
  },
  {
    client: {
      name: 'Tomasz Wójcik [DEMO serwis]',
      phone_number: '600100005',
      address: 'Morska 1, Prabuty',
      notes: 'Demo: ostatni serwis dawno temu, interwał 18 m-cy.',
      email: 'demo.serwis5@test.local',
    },
    miejscowosc: 'Prabuty',
    interval: 18,
    lastServiceDate: monthsAgo(17, 5),
    stationModel: 'UV PRO 40',
    notes: 'Interwał 18 mies. — pilne',
  },
];

async function ensureDemoUser() {
  const hash = bcrypt.hashSync(DEMO_USER.password, 10);
  await pool.query(
    `
    INSERT INTO users (username, password_hash, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
    `,
    [DEMO_USER.username, hash, DEMO_USER.role]
  );
}

async function upsertClient(client) {
  const insert = await pool.query(
    `
    INSERT INTO clients (name, phone_number, address, notes, email)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (phone_number) DO UPDATE SET
      name = EXCLUDED.name,
      address = EXCLUDED.address,
      notes = EXCLUDED.notes,
      email = EXCLUDED.email
    RETURNING id
    `,
    [client.name, client.phone_number, client.address, client.notes, client.email]
  );
  return insert.rows[0].id;
}

async function createTreatmentStationJob(clientId, item) {
  const jobDate = item.lastServiceDate;
  const miejscowosc = formatMiejscowosc(item.miejscowosc);

  const detailsRes = await pool.query(
    `
    INSERT INTO treatment_station_details (
      station_model, uv_lamp_model, carbon_filter, filter_types,
      service_interval_months, revenue, equipment_cost, labor_cost, wholesale_materials_cost
    ) VALUES ($1, $2, 'Tak', 'Sediment + Carbon', $3, 5000, 3000, 800, 400)
    RETURNING id
    `,
    [item.stationModel, 'UV-C 25W', item.interval]
  );
  const detailsId = detailsRes.rows[0].id;

  const jobRes = await pool.query(
    `
    INSERT INTO jobs (client_id, job_type, job_date, details_id, miejscowosc)
    VALUES ($1, 'treatment_station', $2::date, $3, $4)
    RETURNING id
    `,
    [clientId, jobDate, detailsId, miejscowosc]
  );
  const jobId = jobRes.rows[0].id;
  await pool.query('UPDATE treatment_station_details SET job_id = $1 WHERE id = $2', [jobId, detailsId]);
  return jobId;
}

async function upsertSchedule(clientId, item, sourceJobId) {
  const miejscowosc = formatMiejscowosc(item.miejscowosc);
  const key = normalizeMiejscowosc(item.miejscowosc);

  await pool.query(
    `
    INSERT INTO service_schedules (
      client_id, miejscowosc, miejscowosc_key, service_interval_months,
      last_service_date, last_service_date_source, notes, source_job_id, updated_at
    ) VALUES ($1, $2, $3, $4, $5::date, 'job', $6, $7, NOW())
    ON CONFLICT (client_id, miejscowosc_key) DO UPDATE SET
      miejscowosc = EXCLUDED.miejscowosc,
      service_interval_months = EXCLUDED.service_interval_months,
      last_service_date = EXCLUDED.last_service_date,
      last_service_date_source = 'job',
      notes = EXCLUDED.notes,
      source_job_id = EXCLUDED.source_job_id,
      updated_at = NOW()
    `,
    [clientId, miejscowosc, key, item.interval, item.lastServiceDate, item.notes, sourceJobId]
  );
}

async function main() {
  console.log('Łączenie z bazą:', process.env.DATABASE_URL || '(domyślna localhost:5432)');
  const client = await pool.connect();
  try {
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'service_schedules'
      ) AS ok
    `);
    if (!tableCheck.rows[0].ok) {
      console.error(
        'Brak tabeli service_schedules. Uruchom najpierw serwer raz: node server.js (inicjalizacja schematu), potem ponów seed.'
      );
      process.exit(1);
    }

    await ensureDemoUser();
    console.log(`Konto testowe: ${DEMO_USER.username} / ${DEMO_USER.password} (rola: ${DEMO_USER.role})`);

    let lastClientId = null;
    let created = 0;

    for (const item of DEMO_SCHEDULES) {
      const clientId = item.sameClientAsPrevious && lastClientId
        ? lastClientId
        : await upsertClient(item.client);
      lastClientId = clientId;

      const jobId = await createTreatmentStationJob(clientId, item);
      await upsertSchedule(clientId, item, jobId);
      created++;
      console.log(`  ✓ ${item.client.name} — ${item.miejscowosc} (ostatni: ${item.lastServiceDate}, co ${item.interval} m-cy)`);
    }

    const reminders = await client.query(`
      SELECT c.name, ss.miejscowosc,
        TO_CHAR(ss.last_service_date, 'YYYY-MM-DD') AS last_service_date,
        TO_CHAR(ss.last_service_date + (ss.service_interval_months * INTERVAL '1 month'), 'YYYY-MM-DD') AS next_due
      FROM service_schedules ss
      JOIN clients c ON c.id = ss.client_id
      WHERE ss.client_id IN (SELECT id FROM clients WHERE phone_number LIKE '600100%')
      ORDER BY next_due
    `);

    console.log('\nHarmonogramy DEMO na pulpicie (termin w ciągu 30 dni):');
    reminders.rows.forEach((r) => {
      console.log(`  • ${r.name} | ${r.miejscowosc} | ostatni: ${r.last_service_date} | następny: ${r.next_due}`);
    });
    console.log(`\nGotowe: ${created} harmonogramów. Zaloguj się i otwórz pulpit.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Błąd seed:', err.message);
  if (err.code === 'ECONNREFUSED') {
    console.error('PostgreSQL nie działa. Uruchom: .\\scripts\\start-local-db.ps1');
  }
  process.exit(1);
});
