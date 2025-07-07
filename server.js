// =================================================================================================
// 📜 IMPORTS
// =================================================================================================

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');

// =================================================================================================
// ⚙️ KONFIGURACJA APLIKACJI I BAZY DANYCH
// =================================================================================================

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bardzo-tajny-klucz-do-zmiany-na-produkcji';

// Middlewares
app.use(cors());
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
        query:
          'ALTER TABLE service_details ADD COLUMN is_warranty BOOLEAN DEFAULT true, ADD COLUMN revenue REAL DEFAULT 0, ADD COLUMN labor_cost REAL DEFAULT 0',
      },
      {
        table: 'users',
        column: 'role',
        query: "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer'",
      },
    ];

    for (const migration of migrations) {
      const res = await client.query(
        'SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
        [migration.table, migration.column]
      );
      if (res.rows.length === 0) {
        await client.query(migration.query);
        console.log(
          `🔧 Zaktualizowano tabelę "${migration.table}", dodano kolumnę "${migration.column}".`
        );
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

    const newUser = await pool.query(
      "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'viewer') RETURNING id, username, role",
      [username, password_hash]
    );

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

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
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
  const { clientId, jobType, jobDate, details } = req.body;
  if (!clientId || !jobType || !jobDate || !details) {
    return res.status(400).json({ error: 'Brak wszystkich wymaganych danych dla zlecenia.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let detailsTable = '';
    let detailsColumns = [];
    let detailsValues = [];

    // Logika wyboru tabeli i kolumn na podstawie typu zlecenia
    if (jobType === 'well_drilling') {
      detailsTable = 'well_details';
      detailsColumns = [
        'miejscowosc',
        'pracownicy',
        'informacje',
        'srednica',
        'ilosc_metrow',
        'lustro_statyczne',
        'lustro_dynamiczne',
        'wydajnosc',
        'cena_za_metr',
        'wyplaty',
        'rury',
        'inne_koszta',
      ];
      detailsValues = detailsColumns.map((col) => details[col] || null);
    } else if (jobType === 'connection') {
      detailsTable = 'connection_details';
      detailsColumns = [
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
      // (pozostawiona stara nazwa `job_type` dla zachowania logiki)
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
    } else if (jobType === 'service') {
      detailsTable = 'service_details';
      detailsColumns = ['description', 'is_warranty', 'revenue', 'labor_cost'];
      const isWarranty = details.is_warranty !== false;
      detailsValues = [
        details.description || null,
        isWarranty,
        !isWarranty ? parseFloat(details.revenue) || 0 : 0,
        !isWarranty ? parseFloat(details.labor_cost) || 0 : 0,
      ];
    } else {
      throw new Error('Nieznany typ zlecenia.');
    }

    // Wstawienie rekordu szczegółów
    const detailsPlaceholders = detailsValues.map((_, i) => `$${i + 1}`).join(', ');
    const detailsSql = `INSERT INTO ${detailsTable} (${detailsColumns.join(', ')}) VALUES (${detailsPlaceholders}) RETURNING id`;
    const detailsResult = await client.query(detailsSql, detailsValues);
    const detailsId = detailsResult.rows[0].id;

    // Wstawienie głównego rekordu zlecenia
    const jobSql = `INSERT INTO jobs (client_id, job_type, job_date, details_id) VALUES ($1, $2, $3, $4) RETURNING id`;
    const jobResult = await client.query(jobSql, [clientId, jobType, jobDate, detailsId]);
    const jobId = jobResult.rows[0].id;

    // Zaktualizowanie rekordu szczegółów o ID zlecenia
    const updateDetailsSql = `UPDATE ${detailsTable} SET job_id = $1 WHERE id = $2`;
    await client.query(updateDetailsSql, [jobId, detailsId]);

    await client.query('COMMIT');

    const finalDataResult = await pool.query(
      `SELECT j.id, j.job_type, TO_CHAR(j.job_date, 'YYYY-MM-DD') as job_date, c.name as client_name, c.phone_number as client_phone, wd.miejscowosc FROM jobs j JOIN clients c ON j.client_id = c.id LEFT JOIN well_details wd ON j.details_id = wd.id AND j.job_type = 'well_drilling' WHERE j.id = $1`,
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
      const searchSubQuery = `
        SELECT j_sub.id FROM jobs j_sub
        JOIN clients c_sub ON j_sub.client_id = c_sub.id
        LEFT JOIN well_details wd_sub ON j_sub.details_id = wd_sub.id AND j_sub.job_type = 'well_drilling'
        WHERE c_sub.name ILIKE $${paramIndex} OR c_sub.phone_number ILIKE $${paramIndex} OR wd_sub.miejscowosc ILIKE $${paramIndex}
      `;
      whereClauses.push(`j.id IN (${searchSubQuery})`);
      queryParams.push(searchTerm);
      paramIndex++;
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(j.id) FROM jobs j ${whereString}`;
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
        (SELECT wd.miejscowosc 
         FROM well_details wd 
         JOIN jobs sub_j ON sub_j.details_id = wd.id 
         WHERE sub_j.client_id = j.client_id AND sub_j.job_type = 'well_drilling' 
         ORDER BY sub_j.job_date DESC 
         LIMIT 1) as miejscowosc
      FROM jobs j
      JOIN clients c ON j.client_id = c.id
      ${whereString}
      ORDER BY ${sortBy} ${sortOrder} NULLS LAST
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
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
        j.id, j.job_type, TO_CHAR(j.job_date, 'YYYY-MM-DD') as job_date, j.details_id, 
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

/**
 * @route PUT /api/jobs/:id
 * @description Aktualizuje istniejące zlecenie w ramach transakcji.
 * @access Private (Editor, Admin)
 */
app.put('/api/jobs/:id', authenticateToken, canEdit, async (req, res) => {
  const { id } = req.params;
  const { clientId, jobDate, details } = req.body;
  if (!clientId || !jobDate || !details) {
    return res.status(400).json({ error: 'Brak wszystkich wymaganych danych dla zlecenia.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Pobranie informacji o typie zlecenia
    const jobInfoRes = await pool.query('SELECT job_type, details_id FROM jobs WHERE id = $1', [
      id,
    ]);
    if (jobInfoRes.rows.length === 0) throw new Error('Nie znaleziono zlecenia o podanym ID.');
    const { job_type, details_id } = jobInfoRes.rows[0];

    // Aktualizacja głównego rekordu zlecenia
    await client.query(`UPDATE jobs SET client_id = $1, job_date = $2 WHERE id = $3`, [
      clientId,
      jobDate,
      id,
    ]);

    // Dynamiczna aktualizacja tabeli ze szczegółami
    let detailsTable = '';
    let detailsColumns = [];

    if (job_type === 'well_drilling') {
      detailsTable = 'well_details';
      detailsColumns = [
        'miejscowosc',
        'pracownicy',
        'informacje',
        'srednica',
        'ilosc_metrow',
        'lustro_statyczne',
        'lustro_dynamiczne',
        'wydajnosc',
        'cena_za_metr',
        'wyplaty',
        'rury',
        'inne_koszta',
      ];
    } else if (job_type === 'connection') {
      detailsTable = 'connection_details';
      detailsColumns = [
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
    } else if (job_type === 'treatment_station') {
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
    } else if (job_type === 'service') {
      detailsTable = 'service_details';
      detailsColumns = ['description', 'is_warranty', 'revenue', 'labor_cost'];
    }

    if (detailsTable) {
      const setClauses = detailsColumns.map((col, i) => `${col} = $${i + 1}`).join(', ');
      let detailsValues = detailsColumns.map((col) => details[col] || null);

      if (job_type === 'service') {
        const isWarranty = details.is_warranty !== false;
        detailsValues = [
          details.description || null,
          isWarranty,
          !isWarranty ? parseFloat(details.revenue) || 0 : 0,
          !isWarranty ? parseFloat(details.labor_cost) || 0 : 0,
        ];
      }

      const detailsSql = `UPDATE ${detailsTable} SET ${setClauses} WHERE id = $${detailsColumns.length + 1}`;
      await client.query(detailsSql, [...detailsValues, details_id]);
    }

    await client.query('COMMIT');

    // Zwrócenie zaktualizowanych danych
    const finalDataResult = await pool.query(
      `SELECT j.id, j.job_type, TO_CHAR(j.job_date, 'YYYY-MM-DD') as job_date, j.details_id, c.id as client_id, c.name as client_name, c.phone_number as client_phone, wd.miejscowosc FROM jobs j JOIN clients c ON j.client_id = c.id LEFT JOIN well_details wd ON j.details_id = wd.id AND j.job_type = 'well_drilling' WHERE j.id = $1`,
      [id]
    );

    res.status(200).json(finalDataResult.rows[0]);
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
    const paginatedData = await getPaginatedInventory(
      parseInt(req.query.page) || 1,
      req.query.search || '',
      req.query.sortBy,
      req.query.sortOrder
    );
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
      const changeQuantity =
        operationType === 'delivery' ? Math.abs(quantity) : -Math.abs(quantity);
      await client.query(
        `UPDATE inventory_items SET quantity = quantity + $1, last_delivery_date = CASE WHEN $2 = 'delivery' THEN NOW() ELSE last_delivery_date END WHERE id = $3`,
        [changeQuantity, operationType, itemId]
      );
      await client.query(
        `INSERT INTO stock_history (item_id, change_quantity, operation_type, user_id) VALUES ($1, $2, $3, $4)`,
        [itemId, changeQuantity, operationType, req.user.userId]
      );
    } else if (operationType === 'toggle_ordered') {
      const updateResult = await client.query(
        `UPDATE inventory_items SET is_ordered = NOT is_ordered WHERE id = $1 RETURNING is_ordered`,
        [itemId]
      );
      const newStatus = updateResult.rows[0].is_ordered;
      await client.query(
        `INSERT INTO stock_history (item_id, change_quantity, operation_type, user_id) VALUES ($1, $2, $3, $4)`,
        [itemId, 0, `status_changed_to_${newStatus}`, req.user.userId]
      );
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
    const countResult = await client.query(
      'SELECT COUNT(*) FROM offers WHERE EXTRACT(YEAR FROM issue_date) = $1 AND EXTRACT(MONTH FROM issue_date) = $2',
      [year, issueDate.getMonth() + 1]
    );
    const nextOfferNumberInMonth = parseInt(countResult.rows[0].count) + 1;
    const offerNumber = `OF/${String(nextOfferNumberInMonth).padStart(3, '0')}/${month}/${year}`;

    const offerSql = `
      INSERT INTO offers (offer_number, client_id, issue_date, offer_type, vat_rate, notes)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
    `;
    const offerResult = await client.query(offerSql, [
      offerNumber,
      clientId,
      issue_date,
      offer_type,
      vat_rate,
      notes,
    ]);
    const newOfferId = offerResult.rows[0].id;

    const itemSql = `
      INSERT INTO offer_items (offer_id, name, quantity, unit, net_price)
      VALUES ($1, $2, $3, $4, $5);
    `;
    for (const item of items) {
      if (item.name && item.quantity > 0 && item.net_price >= 0) {
        await client.query(itemSql, [
          newOfferId,
          item.name,
          item.quantity,
          item.unit,
          item.net_price,
        ]);
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
    const offerResult = await pool.query(
      `SELECT o.*, c.name as client_name, c.address as client_address, c.phone_number as client_phone, c.email as client_email FROM offers o LEFT JOIN clients c ON o.client_id = c.id WHERE o.id = $1`,
      [id]
    );
    if (offerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Nie znaleziono oferty.' });
    }
    const offerData = offerResult.rows[0];
    const itemsResult = await pool.query(
      `SELECT * FROM offer_items WHERE offer_id = $1 ORDER BY id ASC`,
      [id]
    );
    offerData.items = itemsResult.rows;

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const fileName = `oferta-${offerData.offer_number.replace(/\//g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    doc.pipe(res);

    doc.registerFont('Lato', 'fonts/Lato-Regular.ttf');
    doc.registerFont('Lato-Bold', 'fonts/Lato-Bold.ttf');
    doc.font('Lato');

    // Dane firmy
    doc.font('Lato-Bold').fontSize(12).text('Twoja Nazwa Firmy', 40, 40);
    doc.font('Lato').fontSize(10).text('Twój Adres, 12-345 Miasto', 40, 55);
    doc.text(`NIP: 123-456-78-90`, 40, 70);

    // Nagłówek oferty
    doc
      .font('Lato-Bold')
      .fontSize(14)
      .text(`Oferta nr ${offerData.offer_number}`, { align: 'right' });
    doc
      .font('Lato')
      .fontSize(10)
      .text(`Data wystawienia: ${new Date(offerData.issue_date).toLocaleDateString('pl-PL')}`, {
        align: 'right',
      });
    doc.moveDown(2);

    // Dane klienta
    doc.font('Lato-Bold').fontSize(12).text('Dla:', 40);
    doc.font('Lato').text(offerData.client_name || '', 40, doc.y);
    doc.text(offerData.client_address || '');
    doc.text(offerData.client_phone || '');
    doc.text(offerData.client_email || '');
    doc.moveDown(2);

    // Tabela
    const tableTop = doc.y;
    const tableHeaders = [
      'Lp.',
      'Nazwa towaru / usługi',
      'Ilość',
      'J.m.',
      'Cena netto',
      'Wartość netto',
    ];

    function generateTableRow(y, ...args) {
      const [lp, name, qty, unit, price, value] = args;
      doc.fontSize(9).text(lp, 50, y, { width: 20, align: 'left' });
      doc.text(name, 80, y, { width: 230, align: 'left' });
      doc.text(qty, 320, y, { width: 40, align: 'right' });
      doc.text(unit, 370, y, { width: 40, align: 'left' });
      doc.text(price, 420, y, { width: 60, align: 'right' });
      doc.text(value, 490, y, { width: 70, align: 'right' });
    }

    doc.font('Lato-Bold');
    generateTableRow(tableTop, ...tableHeaders);
    doc.moveTo(40, doc.y).lineTo(570, doc.y).stroke();
    doc.font('Lato');
    let currentY = doc.y + 5;
    let totalNet = 0;

    offerData.items.forEach((item, index) => {
      const netValue = item.quantity * item.net_price;
      totalNet += netValue;
      if (currentY > 750) {
        doc.addPage();
        currentY = 40;
      }
      generateTableRow(
        currentY,
        index + 1,
        item.name,
        item.quantity,
        item.unit,
        `${item.net_price.toFixed(2)} zł`,
        `${netValue.toFixed(2)} zł`
      );
      currentY += 20; // Zwiększony odstęp
    });
    doc
      .moveTo(40, currentY - 10)
      .lineTo(570, currentY - 10)
      .stroke();

    // Podsumowanie
    const vatValue = totalNet * (offerData.vat_rate / 100);
    const totalGross = totalNet + vatValue;
    currentY += 5;
    doc.fontSize(10).text('Suma netto:', 400, currentY, { align: 'left' });
    doc.text(`${totalNet.toFixed(2)} zł`, 0, currentY, { align: 'right' });
    currentY += 15;
    doc.fontSize(9).text(`Podatek VAT (${offerData.vat_rate}%):`, 400, currentY, { align: 'left' });
    doc.text(`${vatValue.toFixed(2)} zł`, 0, currentY, { align: 'right' });
    currentY += 15;
    doc.font('Lato-Bold').fontSize(11).text('Do zapłaty brutto:', 400, currentY, { align: 'left' });
    doc.text(`${totalGross.toFixed(2)} zł`, 0, currentY, { align: 'right' });

    // Notatki
    if (offerData.notes) {
      doc
        .font('Lato-Bold')
        .fontSize(10)
        .text('Uwagi:', 40, doc.y + 30);
      doc.font('Lato').fontSize(9).text(offerData.notes, { width: 500, align: 'justify' });
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
