const fs = require('fs');
const path = require('path');
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

const firstNames = ['Jan', 'Anna', 'Piotr', 'Katarzyna', 'Tomasz', 'Marta', 'Pawel', 'Magda', 'Lukasz', 'Agnieszka'];
const lastNames = ['Kowalski', 'Nowak', 'Wisniewski', 'Wojcik', 'Kaczmarek', 'Mazur', 'Zielinski', 'Piotrowski', 'Dabrowski', 'Krawczyk'];
const cities = ['Kwidzyn', 'Grudziadz', 'Malbork', 'Tczew', 'Prabuty', 'Sztum', 'Gniew', 'Pelplin'];
const streets = ['Polna', 'Leśna', 'Kwiatowa', 'Sloneczna', 'Szeroka', 'Morska', 'Szkolna', 'Ogrodowa'];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max, precision = 2) => Number((Math.random() * (max - min) + min).toFixed(precision));
const dateInLastMonths = (monthsBack = 4) => {
  const now = new Date();
  const from = new Date(now);
  from.setMonth(now.getMonth() - monthsBack);
  const ts = from.getTime() + Math.random() * (now.getTime() - from.getTime());
  return new Date(ts).toISOString().slice(0, 10);
};

function buildClient(index) {
  const first = rand(firstNames);
  const last = rand(lastNames);
  const city = rand(cities);
  const street = rand(streets);
  const building = randomNumber(1, 85);
  const flat = randomNumber(1, 25);
  const phone = `5${randomNumber(0, 9)}${randomNumber(0, 9)}${randomNumber(0, 9)}${randomNumber(0, 9)}${randomNumber(0, 9)}${randomNumber(0, 9)}${randomNumber(0, 9)}${randomNumber(0, 9)}`;
  return {
    name: `${first} ${last} ${index + 1}`,
    phone_number: phone,
    address: `${street} ${building}/${flat}, ${city}`,
    notes: `Klient testowy #${index + 1} do weryfikacji generatora ofert.`,
    email: `${first}.${last}.${index + 1}@test.local`.toLowerCase(),
  };
}

async function insertClient(client) {
  const insertSql = `
    INSERT INTO clients (name, phone_number, address, notes, email)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (phone_number) DO NOTHING
    RETURNING id, name;
  `;
  const insertResult = await pool.query(insertSql, [client.name, client.phone_number, client.address, client.notes, client.email]);
  if (insertResult.rows.length) return insertResult.rows[0];
  const existing = await pool.query('SELECT id, name FROM clients WHERE phone_number = $1', [client.phone_number]);
  return existing.rows[0];
}

async function createJobForClient(clientId) {
  const jobType = rand(['well_drilling', 'connection', 'treatment_station', 'service']);
  const jobDate = dateInLastMonths();
  const miejscowosc = rand(cities);

  let detailsTable = '';
  let detailsColumns = [];
  let detailsValues = [];

  if (jobType === 'well_drilling') {
    detailsTable = 'well_details';
    detailsColumns = ['miejscowosc', 'pracownicy', 'informacje', 'srednica', 'ilosc_metrow', 'lustro_statyczne', 'lustro_dynamiczne', 'wydajnosc', 'cena_za_metr', 'wyplaty', 'rury', 'inne_koszta'];
    detailsValues = [
      miejscowosc,
      'Janek, Mirek',
      'Zlecenie testowe - odwiert',
      rand([110, 125, 140]),
      randomFloat(18, 42),
      randomFloat(2, 9),
      randomFloat(8, 19),
      randomFloat(0.8, 3.5),
      randomFloat(180, 320),
      randomFloat(900, 2200),
      randomFloat(600, 1800),
      randomFloat(200, 1200),
    ];
  } else if (jobType === 'connection') {
    detailsTable = 'connection_details';
    detailsColumns = [
      'miejscowosc',
      'well_depth',
      'diameter',
      'pump_depth',
      'pump_model',
      'controller_model',
      'hydrophore_model',
      'materials_invoice_url',
      'client_offer_url',
      'revenue',
      'casing_cost',
      'equipment_cost',
      'labor_cost',
      'wholesale_materials_cost',
    ];
    detailsValues = [
      miejscowosc,
      randomFloat(18, 40),
      rand([110, 125, 140]),
      randomFloat(10, 26),
      rand(['IBO 4N23', 'Omnigena SKM', 'Pedrollo 4BLOCK']),
      rand(['PC-16', 'BRIO 2000-M', 'ControlBOX']),
      rand(['GWS 80', 'GWS 100', 'AQUASYSTEM 80']),
      null,
      null,
      randomFloat(3500, 9800),
      randomFloat(200, 1200),
      randomFloat(1200, 4200),
      randomFloat(700, 2200),
      randomFloat(350, 1800),
    ];
  } else if (jobType === 'treatment_station') {
    detailsTable = 'treatment_station_details';
    detailsColumns = [
      'miejscowosc',
      'station_model',
      'uv_lamp_model',
      'carbon_filter',
      'filter_types',
      'service_interval_months',
      'materials_invoice_url',
      'client_offer_url',
      'revenue',
      'equipment_cost',
      'labor_cost',
      'wholesale_materials_cost',
    ];
    detailsValues = [
      miejscowosc,
      rand(['AQUAHOME 25', 'SUPREME SOFT 30', 'ECO-FLOW 20']),
      rand(['UV-C 25W', 'UV-C 55W', 'UV-C PRO 40W']),
      rand(['Tak', 'Nie']),
      rand(['Sediment + Carbon', 'Sediment + Carbon + UV', 'Sediment']),
      rand([6, 12, 18]),
      null,
      null,
      randomFloat(4200, 11500),
      randomFloat(2200, 6800),
      randomFloat(700, 2400),
      randomFloat(300, 1800),
    ];
  } else {
    detailsTable = 'service_details';
    detailsColumns = ['miejscowosc', 'description', 'is_warranty', 'revenue', 'labor_cost'];
    const isWarranty = Math.random() < 0.3;
    detailsValues = [
      miejscowosc,
      rand(['Przeglad okresowy', 'Wymiana presostatu', 'Regulacja automatyki', 'Czyszczenie filtra']),
      isWarranty,
      isWarranty ? 0 : randomFloat(250, 1400),
      isWarranty ? 0 : randomFloat(120, 700),
    ];
  }

  const placeholders = detailsColumns.map((_, i) => `$${i + 1}`).join(', ');
  const detailsSql = `INSERT INTO ${detailsTable} (${detailsColumns.join(', ')}) VALUES (${placeholders}) RETURNING id`;
  const detailsResult = await pool.query(detailsSql, detailsValues);
  const detailsId = detailsResult.rows[0].id;

  const jobSql = `INSERT INTO jobs (client_id, job_type, job_date, details_id, miejscowosc) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
  const jobResult = await pool.query(jobSql, [clientId, jobType, jobDate, detailsId, miejscowosc]);
  const jobId = jobResult.rows[0].id;

  await pool.query(`UPDATE ${detailsTable} SET job_id = $1 WHERE id = $2`, [jobId, detailsId]);
  return { jobId, jobType };
}

async function run() {
  const clientCount = 8;
  const jobCount = 12;
  const createdClients = [];

  for (let i = 0; i < clientCount; i += 1) {
    const client = buildClient(i);
    const created = await insertClient(client);
    if (created) createdClients.push(created);
  }

  if (!createdClients.length) {
    throw new Error('Nie udało się dodać żadnego klienta testowego.');
  }

  const createdJobs = [];
  for (let i = 0; i < jobCount; i += 1) {
    const client = rand(createdClients);
    const job = await createJobForClient(client.id);
    createdJobs.push({ ...job, clientName: client.name });
  }

  console.log(`Dodano klientów: ${createdClients.length}`);
  console.log(`Dodano zleceń: ${createdJobs.length}`);
  console.log('Przykładowe zlecenia:');
  createdJobs.slice(0, 5).forEach((job) => {
    console.log(`- #${job.jobId} (${job.jobType}) dla: ${job.clientName}`);
  });
}

run()
  .catch((error) => {
    console.error('Seed nieudany:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
