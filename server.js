// =================================================================================================
// 📜 IMPORTS
// =================================================================================================

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const logoBase64 =
  'data:image/png;base64,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';

// =================================================================================================
// ⚙️ KONFIGURACJA APLIKACJI I BAZY DANYCH
// =================================================================================================

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bardzo-tajny-klucz-do-zmiany-na-produkcji';

// Middlewares
// Ulepszona konfiguracja CORS, która "odsłania" nagłówek Content-Disposition
app.use(
  cors({
    exposedHeaders: ['Content-Disposition'],
  })
);
app.use(express.json());

// Konfiguracja połączenia z bazą danych PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  // Poniższe dane są używane tylko lokalnie, jeśli DATABASE_URL nie jest ustawione
  user: 'postgres',
  host: 'localhost',
  database: 'rejestr_prac',
  password: 'admin',
  port: 5432,
});

// =================================================================================================
// 🚀 INICJALIZACJA BAZY DANYCH
// =================================================================================================

/**
 * Inicjalizuje strukturę bazy danych. Tworzy tabele, jeśli nie istnieją,
 * i dodaje brakujące kolumny w celu zapewnienia kompatybilności wstecznej.
 * Funkcja jest wywoływana przy starcie serwera.
 */
const initializeDatabase = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Połączono z bazą danych PostgreSQL');

    // Tabela klientów
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY, 
        name TEXT, 
        phone_number TEXT NOT NULL UNIQUE, 
        address TEXT, 
        notes TEXT, 
        email TEXT, 
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);

    // Tabela główna zleceń
    await client.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY, 
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE, 
        job_type TEXT NOT NULL, 
        job_date DATE NOT NULL, 
        details_id INTEGER NOT NULL, 
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);

    // Tabela szczegółów dla odwiertów
    await client.query(`
      CREATE TABLE IF NOT EXISTS well_details (
        id SERIAL PRIMARY KEY, 
        job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE, 
        miejscowosc TEXT, 
        pracownicy TEXT, 
        informacje TEXT, 
        srednica REAL, 
        ilosc_metrow REAL, 
        lustro_statyczne REAL, 
        lustro_dynamiczne REAL, 
        wydajnosc REAL,
        cena_za_metr REAL DEFAULT 0,
        wyplaty REAL DEFAULT 0,
        rury REAL DEFAULT 0,
        inne_koszta REAL DEFAULT 0
      )`);

    // Tabela szczegółów dla podłączeń
    await client.query(`
      CREATE TABLE IF NOT EXISTS connection_details (
        id SERIAL PRIMARY KEY, 
        job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
        miejscowosc TEXT,
        well_depth REAL, 
        diameter REAL, 
        pump_depth REAL, 
        pump_model TEXT, 
        controller_model TEXT, 
        hydrophore_model TEXT, 
        materials_invoice_url TEXT, 
        client_offer_url TEXT, 
        revenue REAL, 
        casing_cost REAL, 
        equipment_cost REAL, 
        labor_cost REAL, 
        wholesale_materials_cost REAL
      )`);

    // Tabela szczegółów dla stacji uzdatniania
    await client.query(`
      CREATE TABLE IF NOT EXISTS treatment_station_details (
        id SERIAL PRIMARY KEY, 
        job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
        miejscowosc TEXT,
        station_model TEXT, 
        uv_lamp_model TEXT, 
        carbon_filter TEXT, 
        filter_types TEXT, 
        service_interval_months INTEGER DEFAULT 12, 
        materials_invoice_url TEXT, 
        client_offer_url TEXT, 
        revenue REAL, 
        equipment_cost REAL, 
        labor_cost REAL, 
        wholesale_materials_cost REAL
      )`);

    // Tabela szczegółów dla serwisów
    await client.query(`
      CREATE TABLE IF NOT EXISTS service_details (
        id SERIAL PRIMARY KEY, 
        job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE, 
        miejscowosc TEXT,
        description TEXT,
        is_warranty BOOLEAN DEFAULT true,
        revenue REAL DEFAULT 0,
        labor_cost REAL DEFAULT 0
      )`);

    // Tabela użytkowników
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, 
        username TEXT UNIQUE NOT NULL, 
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer'
      )`);

    // Tabela magazynu
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY, 
        name TEXT NOT NULL UNIQUE, 
        quantity REAL NOT NULL DEFAULT 0, 
        unit TEXT NOT NULL, 
        min_stock_level REAL NOT NULL DEFAULT 0, 
        last_delivery_date DATE, 
        is_ordered BOOLEAN DEFAULT FALSE NOT NULL
      )`);

    // Tabela historii operacji magazynowych
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_history (
        id SERIAL PRIMARY KEY, 
        item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE, 
        change_quantity REAL NOT NULL, 
        operation_type TEXT NOT NULL, 
        operation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
        user_id INTEGER REFERENCES users(id)
      )`);

    // Tabela główna ofert
    await client.query(`
      CREATE TABLE IF NOT EXISTS offers (
        id SERIAL PRIMARY KEY,
        offer_number TEXT NOT NULL UNIQUE,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        issue_date DATE NOT NULL,
        offer_type TEXT NOT NULL,
        vat_rate REAL DEFAULT 23,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);

    // Tabela pozycji w ofercie
    await client.query(`
      CREATE TABLE IF NOT EXISTS offer_items (
        id SERIAL PRIMARY KEY,
        offer_id INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        net_price REAL NOT NULL
      )`);

    console.log('✅ Tabele zostały zweryfikowane i są gotowe.');

    // Logika migracji - dodawanie brakujących kolumn, jeśli ich nie ma
    const migrations = [
      { table: 'clients', column: 'email', query: 'ALTER TABLE clients ADD COLUMN email TEXT' },
      {
        table: 'service_details',
        column: 'is_warranty',
        query: 'ALTER TABLE service_details ADD COLUMN is_warranty BOOLEAN DEFAULT true, ADD COLUMN revenue REAL DEFAULT 0, ADD COLUMN labor_cost REAL DEFAULT 0',
      },
      {
        table: 'users',
        column: 'role',
        query: "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer'",
      },
      {
        table: 'connection_details',
        column: 'miejscowosc',
        query: 'ALTER TABLE connection_details ADD COLUMN miejscowosc TEXT',
      },
      {
        table: 'treatment_station_details',
        column: 'miejscowosc',
        query: 'ALTER TABLE treatment_station_details ADD COLUMN miejscowosc TEXT',
      },
      {
        table: 'service_details',
        column: 'miejscowosc',
        query: 'ALTER TABLE service_details ADD COLUMN miejscowosc TEXT',
      },
      {
        table: 'jobs',
        column: 'miejscowosc',
        query: 'ALTER TABLE jobs ADD COLUMN miejscowosc TEXT',
      },
    ];

    for (const migration of migrations) {
      const res = await client.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2', [migration.table, migration.column]);
      if (res.rows.length === 0) {
        await client.query(migration.query);
        console.log(`🔧 Zaktualizowano tabelę "${migration.table}", dodano kolumnę "${migration.column}".`);
      }
    }
  } catch (err) {
    console.error('❌ Błąd podczas inicjalizacji bazy danych:', err);
    process.exit(1); // Zakończ proces, jeśli baza danych nie jest gotowa
  } finally {
    if (client) client.release();
  }
};

// Uruchomienie inicjalizacji
initializeDatabase();

// =================================================================================================
// 🛡️ MIDDLEWARES (Uwierzytelnianie i autoryzacja)
// =================================================================================================

/**
 * Middleware do weryfikacji tokenu JWT.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401); // Unauthorized

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Forbidden
    req.user = user;
    next();
  });
};

/**
 * Middleware sprawdzające, czy użytkownik ma rolę 'admin'.
 */
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Brak uprawnień administratora.' });
  }
};

/**
 * Middleware sprawdzające, czy użytkownik ma rolę 'admin' lub 'editor'.
 */
const canEdit = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'editor')) {
    next();
  } else {
    res.status(403).json({ error: 'Brak uprawnień do edycji.' });
  }
};

// =================================================================================================
// API ROUTES: Uwierzytelnianie i status
// =================================================================================================

/**
 * @route GET /api/health
 * @description Sprawdza status serwera.
 * @access Public
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

/**
 * @route POST /api/register
 * @description Rejestruje nowego użytkownika z domyślną rolą 'viewer'.
 * @access Public
 */
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Nazwa użytkownika i hasło są wymagane.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await pool.query("INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'viewer') RETURNING id, username, role", [username, password_hash]);

    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Użytkownik o tej nazwie już istnieje.' });
    }
    console.error('Błąd w /api/register:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera.' });
  }
});

/**
 * @route POST /api/login
 * @description Loguje użytkownika i zwraca token JWT.
 * @access Public
 */
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Nazwa użytkownika i hasło są wymagane.' });
    }

    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Nieprawidłowa nazwa użytkownika lub hasło.' });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Nieprawidłowa nazwa użytkownika lub hasło.' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } catch (err) {
    console.error('Błąd w /api/login:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera.' });
  }
});

// =================================================================================================
// API ROUTES: Klienci (Clients)
// =================================================================================================

/**
 * @route GET /api/clients
 * @description Zwraca spaginowaną listę klientów z opcją wyszukiwania i sortowania.
 * @access Private
 */
app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const allowedSortBy = ['name', 'address', 'created_at'];
    if (!allowedSortBy.includes(sortBy)) {
      return res.status(400).json({ error: 'Niedozwolona kolumna sortowania.' });
    }

    let whereClause = '';
    let queryParams = [];
    if (search) {
      whereClause = `WHERE name ILIKE $1 OR phone_number ILIKE $1 OR address ILIKE $1`;
      queryParams.push(`%${search}%`);
    }

    const countSql = `SELECT COUNT(*) FROM clients ${whereClause}`;
    const countResult = await pool.query(countSql, queryParams);
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    const dataSql = `
      SELECT id, name, phone_number, address, notes, email, TO_CHAR(created_at, 'YYYY-MM-DD') as created_at 
      FROM clients 
      ${whereClause} 
      ORDER BY ${sortBy} ${sortOrder} NULLS LAST 
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    const dataResult = await pool.query(dataSql, [...queryParams, limit, offset]);

    res.json({
      data: dataResult.rows,
      pagination: { totalItems, totalPages, currentPage: page },
    });
  } catch (err) {
    console.error('Błąd w GET /api/clients:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

/**
 * @route POST /api/clients
 * @description Tworzy nowego klienta.
 * @access Private (Editor, Admin)
 */
app.post('/api/clients', authenticateToken, canEdit, async (req, res) => {
  try {
    const { name, phone_number, address, notes, email } = req.body;
    if (!phone_number) {
      return res.status(400).json({ error: 'Numer telefonu jest wymagany.' });
    }
    const sql = `
      INSERT INTO clients (name, phone_number, address, notes, email) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `;
    const result = await pool.query(sql, [name, phone_number, address, notes, email]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Klient z tym numerem telefonu już istnieje.' });
    }
    console.error('Błąd w POST /api/clients:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

/**
 * @route PUT /api/clients/:id
 * @description Aktualizuje dane istniejącego klienta.
 * @access Private (Editor, Admin)
 */
app.put('/api/clients/:id', authenticateToken, canEdit, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone_number, address, notes, email } = req.body;
    if (!phone_number) {
      return res.status(400).json({ error: 'Numer telefonu jest wymagany.' });
    }
    const sql = `
      UPDATE clients 
      SET name = $1, phone_number = $2, address = $3, notes = $4, email = $5 
      WHERE id = $6 
      RETURNING *
    `;
    const result = await pool.query(sql, [name, phone_number, address, notes, email, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nie znaleziono klienta o podanym ID.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Klient z tym numerem telefonu już istnieje.' });
    }
    console.error(`Błąd w PUT /api/clients/${req.params.id}:`, err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

/**
 * @route DELETE /api/clients/:id
 * @description Usuwa klienta.
 * @access Private (Admin)
 */
app.delete('/api/clients/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM clients WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Nie znaleziono klienta' });
    }
    res.status(204).send();
  } catch (err) {
    console.error(`Błąd w DELETE /api/clients/${req.params.id}:`, err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

/**
 * @route GET /api/clients-for-select
 * @description Zwraca uproszczoną listę klientów (id, name, phone) do użycia w formularzach.
 * @access Private
 */
app.get('/api/clients-for-select', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, phone_number FROM clients ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Błąd w GET /api/clients-for-select:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

// =================================================================================================
// API ROUTES: Zlecenia (Jobs)
// =================================================================================================

/**
 * @route POST /api/jobs
 * @description Tworzy nowe zlecenie (wraz ze szczegółami) w ramach transakcji.
 * @access Private (Editor, Admin)
 */
app.post('/api/jobs', authenticateToken, canEdit, async (req, res) => {
  const { clientId, jobType, jobDate, miejscowosc, details } = req.body;
  if (!clientId || !jobType || !jobDate || !details) {
    return res.status(400).json({ error: 'Brak wszystkich wymaganych danych dla zlecenia.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let detailsTable = '';
    let detailsColumns = [];
    let detailsValues = [];

    if (jobType === 'well_drilling') {
      detailsTable = 'well_details';
      detailsColumns = ['pracownicy', 'informacje', 'srednica', 'ilosc_metrow', 'lustro_statyczne', 'lustro_dynamiczne', 'wydajnosc', 'cena_za_metr', 'wyplaty', 'rury', 'inne_koszta'];
      detailsValues = detailsColumns.map((col) => details[col] || null);
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
      detailsValues = detailsColumns.map((col) => details[col] || null);
    } else if (jobType === 'treatment_station') {
      detailsTable = 'treatment_station_details';
      detailsColumns = [
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
      detailsValues = detailsColumns.map((col) => details[col] || null);
      // Poprawka dla domyślnej wartości interwału
      const intervalIndex = detailsColumns.indexOf('service_interval_months');
      if (intervalIndex !== -1) {
        detailsValues[intervalIndex] = parseInt(details.service_interval_months) || 12;
      }
    } else if (jobType === 'service') {
      detailsTable = 'service_details';
      detailsColumns = ['description', 'is_warranty', 'revenue', 'labor_cost'];
      const isWarranty = details.is_warranty !== false;
      detailsValues = [details.description || null, isWarranty, !isWarranty ? parseFloat(details.revenue) || 0 : 0, !isWarranty ? parseFloat(details.labor_cost) || 0 : 0];
    } else {
      throw new Error('Nieznany typ zlecenia.');
    }

    const detailsPlaceholders = detailsColumns.map((_, i) => `$${i + 1}`).join(', ');
    const detailsSql = `INSERT INTO ${detailsTable} (${detailsColumns.join(', ')}) VALUES (${detailsPlaceholders}) RETURNING id`;
    const detailsResult = await client.query(detailsSql, detailsValues);
    const detailsId = detailsResult.rows[0].id;

    const jobSql = `INSERT INTO jobs (client_id, job_type, job_date, details_id, miejscowosc) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
    const jobResult = await client.query(jobSql, [clientId, jobType, jobDate, detailsId, miejscowosc]);
    const jobId = jobResult.rows[0].id;

    await client.query(`UPDATE ${detailsTable} SET job_id = $1 WHERE id = $2`, [jobId, detailsId]);
    await client.query('COMMIT');

    const finalDataResult = await pool.query(
      `SELECT j.id, j.job_type, TO_CHAR(j.job_date, 'YYYY-MM-DD') as job_date, c.name as client_name, c.phone_number as client_phone, j.miejscowosc FROM jobs j JOIN clients c ON j.client_id = c.id WHERE j.id = $1`,
      [jobId]
    );
    res.status(201).json(finalDataResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Błąd w POST /api/jobs:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera podczas tworzenia zlecenia.' });
  } finally {
    client.release();
  }
});

/**
 * @route GET /api/jobs
 * @description Zwraca spaginowaną listę zleceń z opcją wyszukiwania.
 * @access Private
 */
app.get('/api/jobs', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const clientId = req.query.clientId || null;
    const sortBy = req.query.sortBy || 'job_date';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const allowedSortBy = ['job_date', 'client_name', 'miejscowosc'];
    if (!allowedSortBy.includes(sortBy)) {
      return res.status(400).json({ error: 'Niedozwolona kolumna sortowania.' });
    }

    let whereClauses = [];
    let queryParams = [];
    let paramIndex = 1;

    if (clientId) {
      whereClauses.push(`j.client_id = $${paramIndex++}`);
      queryParams.push(clientId);
    }

    if (search) {
      const searchTerm = `%${search}%`;
      whereClauses.push(`(c.name ILIKE $${paramIndex} OR c.phone_number ILIKE $${paramIndex} OR j.miejscowosc ILIKE $${paramIndex})`);
      queryParams.push(searchTerm);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(j.id) FROM jobs j JOIN clients c ON j.client_id = c.id ${whereString}`;
    const countResult = await pool.query(countSql, queryParams);
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    const dataSql = `
      SELECT 
        j.id, j.job_type, TO_CHAR(j.job_date, 'YYYY-MM-DD') as job_date, 
        c.name as client_name, c.phone_number as client_phone, j.miejscowosc
      FROM jobs j
      JOIN clients c ON j.client_id = c.id
      ${whereString}
      ORDER BY ${sortBy} ${sortOrder} NULLS LAST
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    const dataResult = await pool.query(dataSql, [...queryParams, limit, offset]);

    res.json({
      data: dataResult.rows,
      pagination: { totalItems, totalPages, currentPage: page },
    });
  } catch (err) {
    console.error('Błąd w GET /api/jobs:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

/**
 * @route GET /api/jobs/:id
 * @description Zwraca pełne szczegóły pojedynczego zlecenia.
 * @access Private
 */
app.get('/api/jobs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const jobSql = `
      SELECT 
        j.id, j.job_type, TO_CHAR(j.job_date, 'YYYY-MM-DD') as job_date, j.details_id, j.miejscowosc,
        c.id as client_id, c.name as client_name, c.phone_number as client_phone, 
        c.address as client_address, c.notes as client_notes 
      FROM jobs j 
      JOIN clients c ON j.client_id = c.id 
      WHERE j.id = $1`;
    const jobResult = await pool.query(jobSql, [id]);

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Nie znaleziono zlecenia o podanym ID.' });
    }
    const jobData = jobResult.rows[0];

    // Dynamiczne pobieranie szczegółów z odpowiedniej tabeli
    let detailsTable = '';
    if (jobData.job_type === 'well_drilling') detailsTable = 'well_details';
    else if (jobData.job_type === 'connection') detailsTable = 'connection_details';
    else if (jobData.job_type === 'treatment_station') detailsTable = 'treatment_station_details';
    else if (jobData.job_type === 'service') detailsTable = 'service_details';

    let detailsData = {};
    if (detailsTable) {
      const detailsSql = `SELECT * FROM ${detailsTable} WHERE id = $1`;
      const detailsResult = await pool.query(detailsSql, [jobData.details_id]);
      if (detailsResult.rows.length > 0) {
        detailsData = detailsResult.rows[0];
      }
    }

    res.json({ ...jobData, details: detailsData });
  } catch (err) {
    console.error(`Błąd w GET /api/jobs/${req.params.id}:`, err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

app.get('/api/jobs', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const clientId = req.query.clientId || null;
    const sortBy = req.query.sortBy || 'job_date';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const allowedSortBy = ['job_date', 'client_name', 'miejscowosc'];
    if (!allowedSortBy.includes(sortBy)) {
      return res.status(400).json({ error: 'Niedozwolona kolumna sortowania.' });
    }

    let whereClauses = [];
    let queryParams = [];
    let paramIndex = 1;

    if (clientId) {
      whereClauses.push(`j.client_id = $${paramIndex++}`);
      queryParams.push(clientId);
    }

    if (search) {
      const searchTerm = `%${search}%`;
      whereClauses.push(`(c.name ILIKE $${paramIndex} OR c.phone_number ILIKE $${paramIndex} OR j.miejscowosc ILIKE $${paramIndex})`);
      queryParams.push(searchTerm);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(j.id) FROM jobs j JOIN clients c ON j.client_id = c.id ${whereString}`;
    const countResult = await pool.query(countSql, queryParams);
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    const dataSql = `
      SELECT 
        j.id, 
        j.job_type, 
        TO_CHAR(j.job_date, 'YYYY-MM-DD') as job_date, 
        c.name as client_name, 
        c.phone_number as client_phone, 
        j.miejscowosc
      FROM jobs j
      JOIN clients c ON j.client_id = c.id
      ${whereString}
      ORDER BY ${sortBy} ${sortOrder} NULLS LAST
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    const dataResult = await pool.query(dataSql, [...queryParams, limit, offset]);

    res.json({
      data: dataResult.rows,
      pagination: { totalItems, totalPages, currentPage: page },
    });
  } catch (err) {
    console.error('Błąd w GET /api/jobs:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

/**
 * @route PUT /api/jobs/:id
 * @description Aktualizuje istniejące zlecenie w ramach transakcji.
 * @access Private (Editor, Admin)
 */
app.put('/api/jobs/:id', authenticateToken, canEdit, async (req, res) => {
  const { id } = req.params;
  const { clientId, jobDate, miejscowosc, details } = req.body;
  if (!clientId || !jobDate || !details) {
    return res.status(400).json({ error: 'Brak wszystkich wymaganych danych dla zlecenia.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const jobInfoRes = await pool.query('SELECT job_type, details_id FROM jobs WHERE id = $1', [id]);
    if (jobInfoRes.rows.length === 0) throw new Error('Nie znaleziono zlecenia o podanym ID.');
    const { job_type, details_id } = jobInfoRes.rows[0];

    await client.query(`UPDATE jobs SET client_id = $1, job_date = $2, miejscowosc = $3 WHERE id = $4`, [clientId, jobDate, miejscowosc, id]);

    let detailsTable = '';
    let detailsColumns = [];

    if (job_type === 'well_drilling') {
      detailsTable = 'well_details';
      detailsColumns = ['pracownicy', 'informacje', 'srednica', 'ilosc_metrow', 'lustro_statyczne', 'lustro_dynamiczne', 'wydajnosc', 'cena_za_metr', 'wyplaty', 'rury', 'inne_koszta'];
    } else if (job_type === 'connection') {
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
    }
    // ... (tutaj dodaj logikę dla pozostałych typów zleceń, jeśli mają jakieś szczegóły)

    if (detailsTable) {
      const setClauses = detailsColumns.map((col, i) => `${col} = $${i + 1}`).join(', ');
      const detailsValues = detailsColumns.map((col) => details[col] || null);
      const detailsSql = `UPDATE ${detailsTable} SET ${setClauses} WHERE id = $${detailsColumns.length + 1}`;
      await client.query(detailsSql, [...detailsValues, details_id]);
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Zlecenie pomyślnie zaktualizowane.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Błąd w PUT /api/jobs/${id}:`, err);
    res.status(500).json({ error: 'Wystąpił błąd serwera podczas aktualizacji zlecenia.' });
  } finally {
    client.release();
  }
});

/**
 * @route DELETE /api/jobs/:id
 * @description Usuwa zlecenie (i powiązane szczegóły dzięki `ON DELETE CASCADE`).
 * @access Private (Admin)
 */
app.delete('/api/jobs/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM jobs WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Nie znaleziono zlecenia' });
    }
    res.status(204).send();
  } catch (err) {
    console.error(`Błąd w DELETE /api/jobs/${req.params.id}:`, err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

// =================================================================================================
// API ROUTES: Przypomnienia i Raporty
// =================================================================================================

/**
 * @route GET /api/service-reminders
 * @description Zwraca listę klientów z zbliżającym się terminem serwisu stacji uzdatniania.
 * @access Private
 */
app.get('/api/service-reminders', authenticateToken, async (req, res) => {
  try {
    const sql = `
      SELECT
        sub.client_id,
        sub.client_name,
        sub.client_phone,
        TO_CHAR(sub.last_event_date, 'YYYY-MM-DD') as last_event_date,
        TO_CHAR((sub.last_event_date + (sub.service_interval_months * INTERVAL '1 month')), 'YYYY-MM-DD') as next_service_due
      FROM (
        SELECT
          c.id AS client_id,
          c.name AS client_name,
          c.phone_number AS client_phone,
          (SELECT MAX(job_date) FROM jobs WHERE client_id = c.id AND job_type IN ('treatment_station', 'service')) as last_event_date,
          (SELECT service_interval_months FROM treatment_station_details tsd JOIN jobs j ON j.details_id = tsd.id WHERE j.client_id = c.id AND j.job_type = 'treatment_station' ORDER BY j.job_date DESC LIMIT 1) as service_interval_months
        FROM clients c
        WHERE c.id IN (SELECT client_id FROM jobs WHERE job_type = 'treatment_station')
      ) as sub
      WHERE 
        sub.last_event_date IS NOT NULL 
        AND sub.service_interval_months IS NOT NULL
        AND (sub.last_event_date + (sub.service_interval_months * INTERVAL '1 month')) <= (NOW()::date + INTERVAL '30 days')
      ORDER BY next_service_due ASC;
    `;
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error('Błąd w GET /api/service-reminders:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

/**
 * @route GET /api/stats/monthly-summary
 * @description Zwraca podsumowanie finansowe i operacyjne dla danego miesiąca.
 * @access Private
 */
app.get('/api/stats/monthly-summary', authenticateToken, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;

    const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const firstDayOfNextMonth = new Date(Date.UTC(year, month, 1));

    // 1. Zliczanie typów zleceń
    const jobsCountSql = `
      SELECT job_type, COUNT(id) as count
      FROM jobs
      WHERE job_date >= $1 AND job_date < $2
      GROUP BY job_type;
    `;
    const jobsCountResult = await pool.query(jobsCountSql, [firstDayOfMonth, firstDayOfNextMonth]);
    const jobCounts = { well_drilling: 0, connection: 0, treatment_station: 0, service: 0 };
    jobsCountResult.rows.forEach((row) => {
      if (jobCounts.hasOwnProperty(row.job_type)) {
        jobCounts[row.job_type] = parseInt(row.count);
      }
    });

    // 2. Sumowanie metrów
    const metersSql = `
      SELECT SUM(wd.ilosc_metrow) as total_meters
      FROM jobs j
      JOIN well_details wd ON j.details_id = wd.id
      WHERE j.job_type = 'well_drilling' AND j.job_date >= $1 AND j.job_date < $2;
    `;
    const metersResult = await pool.query(metersSql, [firstDayOfMonth, firstDayOfNextMonth]);
    const totalMeters = parseFloat(metersResult.rows[0].total_meters) || 0;

    // 3. Sumowanie finansów
    const financeSql = `
      SELECT 
        COALESCE(SUM(revenue), 0) as total_revenue, 
        COALESCE(SUM(total_cost), 0) as total_costs
      FROM (
        -- Podłączenia
        SELECT cd.revenue, (COALESCE(cd.casing_cost,0) + COALESCE(cd.equipment_cost,0) + COALESCE(cd.labor_cost,0) + COALESCE(cd.wholesale_materials_cost,0)) as total_cost
        FROM jobs j JOIN connection_details cd ON j.details_id = cd.id
        WHERE j.job_type = 'connection' AND j.job_date >= $1 AND j.job_date < $2
      UNION ALL
        -- Stacje uzdatniania
        SELECT tsd.revenue, (COALESCE(tsd.equipment_cost,0) + COALESCE(tsd.labor_cost,0) + COALESCE(tsd.wholesale_materials_cost,0)) as total_cost
        FROM jobs j JOIN treatment_station_details tsd ON j.details_id = tsd.id
        WHERE j.job_type = 'treatment_station' AND j.job_date >= $1 AND j.job_date < $2
      UNION ALL
        -- Odwierty
        SELECT (COALESCE(wd.ilosc_metrow, 0) * COALESCE(wd.cena_za_metr, 0)) as revenue, (COALESCE(wd.wyplaty, 0) + COALESCE(wd.rury, 0) + COALESCE(wd.inne_koszta, 0)) as total_cost
        FROM jobs j JOIN well_details wd ON j.details_id = wd.id
        WHERE j.job_type = 'well_drilling' AND j.job_date >= $1 AND j.job_date < $2
      UNION ALL
        -- Płatne serwisy
        SELECT sd.revenue, COALESCE(sd.labor_cost, 0) as total_cost 
        FROM jobs j JOIN service_details sd ON j.details_id = sd.id 
        WHERE j.job_type = 'service' AND j.job_date >= $1 AND j.job_date < $2 AND sd.is_warranty = false
      ) as monthly_finances;
    `;
    const financeResult = await pool.query(financeSql, [firstDayOfMonth, firstDayOfNextMonth]);
    const totalRevenue = parseFloat(financeResult.rows[0].total_revenue) || 0;
    const totalCosts = parseFloat(financeResult.rows[0].total_costs) || 0;
    const totalProfit = totalRevenue - totalCosts;

    res.json({ jobCounts, totalMeters, totalProfit, totalRevenue, totalCosts });
  } catch (err) {
    console.error('Błąd w GET /api/stats/monthly-summary:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

// =================================================================================================
// API ROUTES: Magazyn (Inventory)
// =================================================================================================

// Funkcja pomocnicza do pobierania spaginowanej listy przedmiotów
const getPaginatedInventory = async (page = 1, search = '', sortBy = 'name', sortOrder = 'asc') => {
  const limit = 15;
  const offset = (page - 1) * limit;

  let whereClause = '';
  let queryParams = [];
  if (search) {
    whereClause = `WHERE name ILIKE $1 OR unit ILIKE $1`;
    queryParams.push(`%${search}%`);
  }

  const countSql = `SELECT COUNT(*) FROM inventory_items ${whereClause}`;
  const countResult = await pool.query(countSql, queryParams);
  const totalItems = parseInt(countResult.rows[0].count);
  const totalPages = Math.ceil(totalItems / limit);

  const dataSql = `
    SELECT * FROM inventory_items 
    ${whereClause} 
    ORDER BY ${sortBy} ${sortOrder} 
    LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
  `;
  const dataResult = await pool.query(dataSql, [...queryParams, limit, offset]);

  return {
    data: dataResult.rows,
    pagination: { totalItems, totalPages, currentPage: page },
  };
};

app.get('/api/inventory', authenticateToken, async (req, res) => {
  try {
    const paginatedData = await getPaginatedInventory(parseInt(req.query.page) || 1, req.query.search || '', req.query.sortBy, req.query.sortOrder);
    res.json(paginatedData);
  } catch (err) {
    console.error('Błąd w GET /api/inventory:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

app.post('/api/inventory', authenticateToken, canEdit, async (req, res) => {
  try {
    const { name, quantity, unit, min_stock_level } = req.body;
    if (!name || !unit) {
      return res.status(400).json({ error: 'Nazwa i jednostka miary są wymagane.' });
    }
    const sql = `INSERT INTO inventory_items (name, quantity, unit, min_stock_level, is_ordered) VALUES ($1, $2, $3, $4, false) RETURNING *`;
    const result = await pool.query(sql, [name, quantity || 0, unit, min_stock_level || 0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Przedmiot o tej nazwie już istnieje w magazynie.' });
    }
    console.error('Błąd w POST /api/inventory:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

app.put('/api/inventory/:id', authenticateToken, canEdit, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, quantity, unit, min_stock_level } = req.body;
    if (!name || !unit) {
      return res.status(400).json({ error: 'Nazwa i jednostka miary są wymagane.' });
    }
    const sql = `UPDATE inventory_items SET name = $1, quantity = $2, unit = $3, min_stock_level = $4 WHERE id = $5 RETURNING *`;
    const result = await pool.query(sql, [name, quantity || 0, unit, min_stock_level || 0, id]);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Przedmiot o tej nazwie już istnieje w magazynie.' });
    }
    console.error(`Błąd w PUT /api/inventory/${req.params.id}:`, err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

app.delete('/api/inventory/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM inventory_items WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(`Błąd w DELETE /api/inventory/${req.params.id}:`, err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

app.post('/api/inventory/operation', authenticateToken, canEdit, async (req, res) => {
  const { itemId, operationType, quantity } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (operationType === 'delivery' || operationType === 'withdrawal') {
      if (!quantity || quantity <= 0) throw new Error('Ilość musi być dodatnia.');
      const changeQuantity = operationType === 'delivery' ? Math.abs(quantity) : -Math.abs(quantity);
      await client.query(`UPDATE inventory_items SET quantity = quantity + $1, last_delivery_date = CASE WHEN $2 = 'delivery' THEN NOW() ELSE last_delivery_date END WHERE id = $3`, [
        changeQuantity,
        operationType,
        itemId,
      ]);
      await client.query(`INSERT INTO stock_history (item_id, change_quantity, operation_type, user_id) VALUES ($1, $2, $3, $4)`, [itemId, changeQuantity, operationType, req.user.userId]);
    } else if (operationType === 'toggle_ordered') {
      const updateResult = await client.query(`UPDATE inventory_items SET is_ordered = NOT is_ordered WHERE id = $1 RETURNING is_ordered`, [itemId]);
      const newStatus = updateResult.rows[0].is_ordered;
      await client.query(`INSERT INTO stock_history (item_id, change_quantity, operation_type, user_id) VALUES ($1, $2, $3, $4)`, [itemId, 0, `status_changed_to_${newStatus}`, req.user.userId]);
    } else {
      throw new Error('Nieznany typ operacji.');
    }

    await client.query('COMMIT');
    const updatedItem = await client.query('SELECT * FROM inventory_items WHERE id = $1', [itemId]);
    res.status(200).json(updatedItem.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Błąd w /api/inventory/operation:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera podczas operacji magazynowej.' });
  } finally {
    client.release();
  }
});

app.get('/api/inventory/low-stock', authenticateToken, async (req, res) => {
  try {
    const sql = `SELECT id, name, quantity, min_stock_level, unit FROM inventory_items WHERE quantity <= min_stock_level AND min_stock_level > 0 ORDER BY name ASC`;
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error('Błąd w GET /api/inventory/low-stock:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

app.get('/api/inventory/:id/history', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT sh.change_quantity, sh.operation_type, TO_CHAR(sh.operation_date, 'YYYY-MM-DD HH24:MI') as operation_date, u.username 
      FROM stock_history sh 
      LEFT JOIN users u ON sh.user_id = u.id 
      WHERE sh.item_id = $1 
      ORDER BY sh.operation_date DESC
    `;
    const result = await pool.query(sql, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(`Błąd w GET /api/inventory/${req.params.id}/history:`, err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

// =================================================================================================
// API ROUTES: Oferty (Offers)
// =================================================================================================

app.post('/api/offers', authenticateToken, canEdit, async (req, res) => {
  const { clientId, issue_date, offer_type, vat_rate, notes, items } = req.body;
  if (!clientId || !issue_date || !offer_type || !items || !items.length) {
    return res.status(400).json({ error: 'Brak wszystkich wymaganych danych oferty.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Generowanie numeru oferty
    const issueDate = new Date(issue_date);
    const year = issueDate.getFullYear();
    const month = String(issueDate.getMonth() + 1).padStart(2, '0');
    const countResult = await client.query('SELECT COUNT(*) FROM offers WHERE EXTRACT(YEAR FROM issue_date) = $1 AND EXTRACT(MONTH FROM issue_date) = $2', [year, issueDate.getMonth() + 1]);
    const nextOfferNumberInMonth = parseInt(countResult.rows[0].count) + 1;
    const offerNumber = `OF/${String(nextOfferNumberInMonth).padStart(2, '0')}/${month}/${year}`;

    const offerSql = `
      INSERT INTO offers (offer_number, client_id, issue_date, offer_type, vat_rate, notes)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
    `;
    const offerResult = await client.query(offerSql, [offerNumber, clientId, issue_date, offer_type, vat_rate, notes]);
    const newOfferId = offerResult.rows[0].id;

    const itemSql = `
      INSERT INTO offer_items (offer_id, name, quantity, unit, net_price)
      VALUES ($1, $2, $3, $4, $5);
    `;
    for (const item of items) {
      if (item.name && item.quantity > 0 && item.net_price >= 0) {
        await client.query(itemSql, [newOfferId, item.name, item.quantity, item.unit, item.net_price]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Oferta pomyślnie utworzona', newOfferId, offerNumber });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Błąd w POST /api/offers:', error);
    res.status(500).json({ error: 'Wystąpił błąd serwera podczas tworzenia oferty.' });
  } finally {
    client.release();
  }
});

app.get('/api/offers', authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 15;
  const offset = (page - 1) * limit;

  try {
    const totalResult = await pool.query('SELECT COUNT(*) FROM offers');
    const totalItems = parseInt(totalResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    const offersSql = `
      SELECT 
        o.id, o.offer_number, TO_CHAR(o.issue_date, 'YYYY-MM-DD') as issue_date, 
        o.offer_type, c.name as client_name, c.phone_number as client_phone,
        c.address as client_address,
        (SELECT COALESCE(SUM(oi.quantity * oi.net_price), 0) FROM offer_items oi WHERE oi.offer_id = o.id) as total_net_value
      FROM offers o
      LEFT JOIN clients c ON o.client_id = c.id
      ORDER BY o.issue_date DESC, o.id DESC
      LIMIT $1 OFFSET $2;
    `;
    const offersResult = await pool.query(offersSql, [limit, offset]);

    res.json({
      data: offersResult.rows,
      pagination: { totalItems, totalPages, currentPage: page },
    });
  } catch (error) {
    console.error('Błąd w GET /api/offers:', error);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

app.get('/api/offers/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const offerSql = `
      SELECT 
        o.id, o.offer_number, TO_CHAR(o.issue_date, 'YYYY-MM-DD') as issue_date,
        o.offer_type, o.vat_rate, o.notes, c.id as client_id, c.name as client_name, 
        c.address as client_address, c.phone_number as client_phone, c.email as client_email 
      FROM offers o
      JOIN clients c ON o.client_id = c.id
      WHERE o.id = $1;
    `;
    const offerResult = await pool.query(offerSql, [id]);

    if (offerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Nie znaleziono oferty.' });
    }
    const offerData = offerResult.rows[0];

    const itemsSql = `SELECT * FROM offer_items WHERE offer_id = $1 ORDER BY id ASC;`;
    const itemsResult = await pool.query(itemsSql, [id]);
    offerData.items = itemsResult.rows;

    res.json(offerData);
  } catch (error) {
    console.error(`Błąd w GET /api/offers/${id}:`, error);
    res.status(500).json({ error: 'Wystąpił błąd serwera.' });
  }
});

app.delete('/api/offers/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const deleteResult = await pool.query('DELETE FROM offers WHERE id = $1', [id]);
    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: 'Nie znaleziono oferty o podanym ID.' });
    }
    res.status(204).send();
  } catch (error) {
    console.error(`Błąd w DELETE /api/offers/${id}:`, error);
    res.status(500).json({ error: 'Wystąpił błąd serwera podczas usuwania oferty.' });
  }
});

app.put('/api/offers/:id', authenticateToken, canEdit, async (req, res) => {
  const { id } = req.params;
  const { clientId, issue_date, offer_type, vat_rate, notes, items } = req.body;
  if (!clientId || !issue_date || !offer_type || !items) {
    return res.status(400).json({ error: 'Brak wszystkich wymaganych danych oferty.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const offerSql = `
      UPDATE offers 
      SET client_id = $1, issue_date = $2, offer_type = $3, vat_rate = $4, notes = $5
      WHERE id = $6;
    `;
    await client.query(offerSql, [clientId, issue_date, offer_type, vat_rate, notes, id]);

    await client.query('DELETE FROM offer_items WHERE offer_id = $1', [id]);

    const itemSql = `
      INSERT INTO offer_items (offer_id, name, quantity, unit, net_price)
      VALUES ($1, $2, $3, $4, $5);
    `;
    for (const item of items) {
      if (item.name && item.quantity > 0 && item.net_price >= 0) {
        await client.query(itemSql, [id, item.name, item.quantity, item.unit, item.net_price]);
      }
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Oferta pomyślnie zaktualizowana.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Błąd w PUT /api/offers/${id}:`, error);
    res.status(500).json({ error: 'Wystąpił błąd serwera podczas aktualizacji oferty.' });
  } finally {
    client.release();
  }
});

app.get('/api/offers/:id/download', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Pobieranie danych oferty
    const offerResult = await pool.query(
      `SELECT o.*, c.name as client_name, c.address as client_address, c.phone_number as client_phone, c.email as client_email FROM offers o LEFT JOIN clients c ON o.client_id = c.id WHERE o.id = $1`,
      [id]
    );
    if (offerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Nie znaleziono oferty.' });
    }
    const offerData = offerResult.rows[0];
    const itemsResult = await pool.query(`SELECT * FROM offer_items WHERE offer_id = $1 ORDER BY id ASC`, [id]);
    offerData.items = itemsResult.rows;

    // 2. Inicjalizacja dokumentu PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const fileName = `Oferta nr ${offerData.offer_number.replace(/\//g, '-')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    doc.pipe(res);

    // 3. Rejestracja czcionek
    doc.registerFont('Lato', 'fonts/Lato-Regular.ttf');
    doc.registerFont('Lato-Bold', 'fonts/Lato-Bold.ttf');
    doc.font('Lato');

    // --- Rysowanie PDF ---

    // Nagłówek i dane firmy/oferty
    const logoWidth = 220;
    if (logoBase64 && logoBase64.startsWith('data:image')) {
      doc.image(logoBase64, 40, 40, { width: logoWidth });
    }

    const companyName = 'Twoja Nazwa Firmy';
    const companyAddress = 'Twój Adres, 12-345 Miasto';
    const companyNip = 'NIP: 123-456-78-90';
    const companyPhone = '123 456 789';
    const companyEmail = 'kontakt@twojafirma.pl';
    const startXRight = 280;
    const widthRight = 280;

    doc.font('Lato-Bold').fontSize(14).text(`Oferta nr ${offerData.offer_number}`, startXRight, 40, { align: 'right', width: widthRight });
    doc.font('Lato').fontSize(10);
    doc.text(`z dnia: ${new Date(offerData.issue_date).toLocaleDateString('pl-PL')}`, { align: 'right', width: widthRight });
    doc.text(`przygotowana przez: Dawid Nikolajski`, { align: 'right', width: widthRight });
    doc.moveDown(0.5);
    doc.font('Lato-Bold').text(companyName, { align: 'right', width: widthRight });
    doc.font('Lato').text(companyAddress, { align: 'right', width: widthRight });
    doc.text(companyNip, { align: 'right', width: widthRight });
    doc.text(`Tel: ${companyPhone}, E-mail: ${companyEmail}`, { align: 'right', width: widthRight });

    // Dane klienta
    const startYClient = 120;
    doc.font('Lato-Bold').fontSize(12).text('Oferta dla', 40, startYClient);
    // POPRAWKA LINII - teraz jej długość zależy od szerokości logo
    doc
      .moveTo(40, doc.y + 2)
      .lineTo(40 + logoWidth, doc.y + 2)
      .stroke();
    doc.moveDown(0.5);
    doc.font('Lato').fontSize(10);
    doc.text(offerData.client_name || '', { width: 200 });
    doc.text(offerData.client_address || '', { width: 200 });
    doc.text(offerData.client_email || '', { width: 200 });

    // --- TABELA Z DYNAMICZNĄ WYSOKOŚCIĄ ---
    const tableTop = 190;
    const tableMargin = 40;
    const textPadding = 5;
    const minRowHeight = 20; // Minimalna wysokość wiersza

    const columns = [
      { key: 'lp', header: 'Lp.', width: 30, align: 'left' },
      { key: 'name', header: 'Nazwa towaru / usługi', width: 260, align: 'left' },
      { key: 'quantity', header: 'Ilość', width: 40, align: 'center' },
      { key: 'unit', header: 'J.m.', width: 40, align: 'center' },
      { key: 'price', header: 'Cena netto', width: 70, align: 'right' },
      { key: 'value', header: 'Wartość netto', width: 80, align: 'right' },
    ];
    const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);

    let currentY = tableTop;

    // --- Funkcja pomocnicza do rysowania wiersza ---
    function drawRow(y, rowData, rowHeight, isHeader = false) {
      doc.font(isHeader ? 'Lato-Bold' : 'Lato').fontSize(isHeader ? 9 : 8);

      let currentX = tableMargin;
      rowData.forEach((text, i) => {
        doc.rect(currentX, y, columns[i].width, rowHeight).strokeColor('#cccccc').stroke();
        doc.text(text.toString(), currentX + textPadding, y + 5, {
          width: columns[i].width - textPadding * 2,
          align: columns[i].align,
        });
        currentX += columns[i].width;
      });
    }

    // Rysowanie nagłówka
    drawRow(
      currentY,
      columns.map((c) => c.header),
      minRowHeight,
      true
    );
    currentY += minRowHeight;

    // Rysowanie wierszy z danymi
    let totalNetValue = 0;

    offerData.items.forEach((item, index) => {
      const netValue = item.quantity * item.net_price;
      totalNetValue += netValue;

      const row = [index + 1, item.name, item.quantity, item.unit, item.net_price.toFixed(2), netValue.toFixed(2)];

      // Oblicz dynamiczną wysokość wiersza na podstawie najdłuższej komórki (nazwy)
      const nameHeight = doc
        .font('Lato')
        .fontSize(8)
        .heightOfString(item.name, {
          width: columns[1].width - textPadding * 2,
        });
      const dynamicRowHeight = Math.max(minRowHeight, nameHeight + textPadding * 2);

      if (currentY + dynamicRowHeight > 750) {
        // Łamanie strony
        doc.addPage();
        currentY = 40;
        drawRow(
          currentY,
          columns.map((c) => c.header),
          minRowHeight,
          true
        );
        currentY += minRowHeight;
      }

      drawRow(currentY, row, dynamicRowHeight);
      currentY += dynamicRowHeight;
    });

    // Podsumowanie
    const summaryY = currentY + 10;
    doc.font('Lato-Bold').fontSize(10);
    doc.text('Suma Wartości Netto:', 400, summaryY, { align: 'right' });
    doc.text(`${totalNetValue.toFixed(2)} zł`, 0, summaryY, { align: 'right' });

    // Notatki
    if (offerData.notes) {
      doc
        .font('Lato-Bold')
        .fontSize(10)
        .text('Uwagi:', 40, currentY + 30);
      doc.font('Lato').fontSize(9).text(offerData.notes, { width: 520, align: 'left' });
    }

    doc.end();
  } catch (error) {
    console.error(`Błąd podczas generowania PDF dla oferty ${id}:`, error);
    res.status(500).send('Nie udało się wygenerować PDF.');
  }
});

// =================================================================================================
// ▶️ URUCHOMIENIE SERWERA
// =================================================================================================

app.listen(PORT, () => {
  console.log(`🚀 Serwer został uruchomiony na porcie ${PORT}`);
});
