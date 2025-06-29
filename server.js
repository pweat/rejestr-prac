// =================================================================
// --- IMPORTY I PODSTAWOWA KONFIGURACJA ---
// =================================================================
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET =
  process.env.JWT_SECRET || 'bardzo-tajny-klucz-do-zmiany-na-produkcji';

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  user: 'postgres',
  host: 'localhost',
  database: 'rejestr_prac',
  password: 'admin', // <-- Pamiętaj o swoim lokalnym haśle
  port: 5432,
});

// =================================================================
// --- INICJALIZACJA BAZY DANYCH I TWORZENIE TABEL ---
// =================================================================
const initializeDatabase = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log('Połączono z bazą danych PostgreSQL');

    // TWORZENIE NOWEJ STRUKTURY
    await client.query(
      `CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, name TEXT, phone_number TEXT NOT NULL UNIQUE, address TEXT, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`
    );
    console.log('Tabela "clients" jest gotowa.');

    await client.query(
      `CREATE TABLE IF NOT EXISTS jobs (id SERIAL PRIMARY KEY, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE, job_type TEXT NOT NULL, job_date DATE NOT NULL, details_id INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`
    );
    console.log('Tabela "jobs" jest gotowa.');

    await client.query(
      `CREATE TABLE IF NOT EXISTS well_details (id SERIAL PRIMARY KEY, job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, miejscowosc TEXT, pracownicy TEXT, informacje TEXT, srednica REAL, ilosc_metrow REAL, lustro_statyczne REAL, lustro_dynamiczne REAL, wydajnosc REAL)`
    );
    console.log('Tabela "well_details" jest gotowa.');

    await client.query(
      `CREATE TABLE IF NOT EXISTS connection_details (id SERIAL PRIMARY KEY, job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, well_depth REAL, diameter REAL, pump_depth REAL, pump_model TEXT, controller_model TEXT, hydrophore_model TEXT, materials_invoice_url TEXT, client_offer_url TEXT, revenue REAL, casing_cost REAL, equipment_cost REAL, labor_cost REAL, wholesale_materials_cost REAL)`
    );
    console.log('Tabela "connection_details" jest gotowa.');

    await client.query(
      `CREATE TABLE IF NOT EXISTS treatment_station_details (id SERIAL PRIMARY KEY, job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, station_model TEXT, uv_lamp_model TEXT, carbon_filter TEXT, filter_types TEXT, materials_invoice_url TEXT, client_offer_url TEXT, revenue REAL, equipment_cost REAL, labor_cost REAL, wholesale_materials_cost REAL)`
    );
    console.log('Tabela "treatment_station_details" jest gotowa.');

    // ISTNIEJĄCE TABELE
    await client.query(
      `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL)`
    );
    console.log('Tabela "users" jest gotowa.');

    await client.query(
      `CREATE TABLE IF NOT EXISTS inventory_items (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, quantity REAL NOT NULL DEFAULT 0, unit TEXT NOT NULL, min_stock_level REAL NOT NULL DEFAULT 0, last_delivery_date DATE, is_ordered BOOLEAN DEFAULT FALSE NOT NULL)`
    );
    console.log('Tabela "inventory_items" jest gotowa.');

    await client.query(
      `CREATE TABLE IF NOT EXISTS stock_history (id SERIAL PRIMARY KEY, item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE, change_quantity REAL NOT NULL, operation_type TEXT NOT NULL, operation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(), user_id INTEGER REFERENCES users(id))`
    );
    console.log('Tabela "stock_history" jest gotowa.');
  } catch (err) {
    console.error('Błąd podczas inicjalizacji bazy danych:', err);
    process.exit(1);
  } finally {
    if (client) client.release();
  }
};
initializeDatabase();

// =================================================================
// --- "STRAŻNIK" (MIDDLEWARE WERYFIKUJĄCY TOKEN) ---
// =================================================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// =================================================================
// --- API UŻYTKOWNIKÓW (Rejestracja, Logowanie) ---
// =================================================================
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: 'Nazwa użytkownika i hasło są wymagane.' });
    }
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const newUser = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, password_hash]
    );
    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res
        .status(400)
        .json({ error: 'Użytkownik o tej nazwie już istnieje.' });
    }
    console.error('Błąd w /api/register:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera.' });
  }
});
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: 'Nazwa użytkownika i hasło są wymagane.' });
    }
    const userResult = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    if (userResult.rows.length === 0) {
      return res
        .status(401)
        .json({ error: 'Nieprawidłowa nazwa użytkownika lub hasło.' });
    }
    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ error: 'Nieprawidłowa nazwa użytkownika lub hasło.' });
    }
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token });
  } catch (err) {
    console.error('Błąd w /api/login:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera.' });
  }
});

// =================================================================
// --- API KLIENTÓW ---
// =================================================================
// GET /api/clients - Pobierz wszystkich klientów
app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    // Na razie proste pobieranie wszystkich. W przyszłości dodamy tu paginację, jeśli będzie potrzeba.
    const result = await pool.query('SELECT * FROM clients ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Błąd w GET /api/clients:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

// POST /api/clients - Dodaj nowego klienta
app.post('/api/clients', authenticateToken, async (req, res) => {
  try {
    const { name, phone_number, address, notes } = req.body;

    // Walidacja na serwerze
    if (!phone_number) {
      return res.status(400).json({ error: 'Numer telefonu jest wymagany.' });
    }

    const sql = `INSERT INTO clients (name, phone_number, address, notes) VALUES ($1, $2, $3, $4) RETURNING *`;
    const params = [name, phone_number, address, notes];
    const result = await pool.query(sql, params);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      // Błąd unikalności dla numeru telefonu
      return res
        .status(400)
        .json({ error: 'Klient z tym numerem telefonu już istnieje.' });
    }
    console.error('Błąd w POST /api/clients:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

// PUT /api/clients/:id - Aktualizuj klienta
app.put('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone_number, address, notes } = req.body;
    if (!phone_number) {
      return res.status(400).json({ error: 'Numer telefonu jest wymagany.' });
    }
    const sql = `UPDATE clients SET name = $1, phone_number = $2, address = $3, notes = $4 WHERE id = $5 RETURNING *`;
    const params = [name, phone_number, address, notes, id];
    const result = await pool.query(sql, params);
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'Nie znaleziono klienta o podanym ID.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res
        .status(400)
        .json({ error: 'Klient z tym numerem telefonu już istnieje.' });
    }
    console.error(`Błąd w PUT /api/clients/${req.params.id}:`, err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

// DELETE /api/clients/:id - Usuń klienta
app.delete('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Uwaga: Usunięcie klienta spowoduje usunięcie wszystkich jego zleceń (dzięki ON DELETE CASCADE)
    const result = await pool.query('DELETE FROM clients WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Nie znaleziono klienta' });
    }
    res.status(204).send(); // Sukces, brak zawartości
  } catch (err) {
    console.error(`Błąd w DELETE /api/clients/${req.params.id}:`, err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

// =================================================================
// --- API ZLECEŃ ---
// =================================================================
// Tę sekcję wypełnimy kodem w przyszłości

// =================================================================
// --- API MAGAZYNU ---
// =================================================================
app.get('/api/inventory', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM inventory_items ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Błąd w GET /api/inventory:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});
app.post('/api/inventory', authenticateToken, async (req, res) => {
  try {
    const { name, quantity, unit, min_stock_level } = req.body;
    if (!name || !unit) {
      return res
        .status(400)
        .json({ error: 'Nazwa i jednostka miary są wymagane.' });
    }
    const sql = `INSERT INTO inventory_items (name, quantity, unit, min_stock_level, is_ordered) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const params = [name, quantity || 0, unit, min_stock_level || 0, false];
    const result = await pool.query(sql, params);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res
        .status(400)
        .json({ error: 'Przedmiot o tej nazwie już istnieje w magazynie.' });
    }
    console.error('Błąd w POST /api/inventory:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});
app.put('/api/inventory/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, quantity, unit, min_stock_level, is_ordered } = req.body;
    if (!name || !unit) {
      return res
        .status(400)
        .json({ error: 'Nazwa i jednostka miary są wymagane.' });
    }
    const sql = `UPDATE inventory_items SET name = $1, quantity = $2, unit = $3, min_stock_level = $4, is_ordered = $5 WHERE id = $6 RETURNING *`;
    const params = [
      name,
      quantity || 0,
      unit,
      min_stock_level || 0,
      is_ordered || false,
      id,
    ];
    const result = await pool.query(sql, params);
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'Nie znaleziono przedmiotu o podanym ID.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res
        .status(400)
        .json({ error: 'Przedmiot o tej nazwie już istnieje w magazynie.' });
    }
    console.error(`Błąd w PUT /api/inventory/${req.params.id}:`, err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});
app.delete('/api/inventory/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM inventory_items WHERE id = $1',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Nie znaleziono przedmiotu' });
    }
    res.status(204).send();
  } catch (err) {
    console.error(`Błąd w DELETE /api/inventory/${req.params.id}:`, err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});
app.post('/api/inventory/operation', authenticateToken, async (req, res) => {
  const { itemId, operationType, quantity } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let updatedItem;
    if (operationType === 'delivery' || operationType === 'withdrawal') {
      if (!quantity || quantity <= 0)
        throw new Error('Ilość musi być dodatnia.');
      const changeQuantity =
        operationType === 'delivery' ? Math.abs(quantity) : -Math.abs(quantity);
      const updateQuery = `UPDATE inventory_items SET quantity = quantity + $1, last_delivery_date = CASE WHEN $2 = 'delivery' THEN NOW() ELSE last_delivery_date END WHERE id = $3 RETURNING *`;
      const updateResult = await client.query(updateQuery, [
        changeQuantity,
        operationType,
        itemId,
      ]);
      updatedItem = updateResult.rows[0];
      const historyQuery = `INSERT INTO stock_history (item_id, change_quantity, operation_type, user_id) VALUES ($1, $2, $3, $4)`;
      await client.query(historyQuery, [
        itemId,
        changeQuantity,
        operationType,
        req.user.userId,
      ]);
    } else if (operationType === 'toggle_ordered') {
      const updateQuery = `UPDATE inventory_items SET is_ordered = NOT is_ordered WHERE id = $1 RETURNING *`;
      const updateResult = await client.query(updateQuery, [itemId]);
      updatedItem = updateResult.rows[0];
      const historyQuery = `INSERT INTO stock_history (item_id, change_quantity, operation_type, user_id) VALUES ($1, $2, $3, $4)`;
      await client.query(historyQuery, [
        itemId,
        0,
        `status_changed_to_${updatedItem.is_ordered}`,
        req.user.userId,
      ]);
    } else {
      throw new Error('Nieznany typ operacji.');
    }
    if (!updatedItem) {
      throw new Error('Nie znaleziono przedmiotu.');
    }
    await client.query('COMMIT');
    res.status(200).json(updatedItem);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Błąd w /api/inventory/operation:', err);
    res
      .status(500)
      .json({ error: 'Wystąpił błąd serwera podczas operacji magazynowej.' });
  } finally {
    client.release();
  }
});
app.get('/api/inventory/:id/history', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `SELECT sh.change_quantity, sh.operation_type, sh.operation_date, u.username FROM stock_history sh LEFT JOIN users u ON sh.user_id = u.id WHERE sh.item_id = $1 ORDER BY sh.operation_date DESC`;
    const result = await pool.query(sql, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(`Błąd w GET /api/inventory/${req.params.id}/history:`, err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

// =================================================================
// --- URUCHOMIENIE SERWERA ---
// =================================================================
app.listen(PORT, () => {
  console.log(`Serwer został uruchomiony na porcie ${PORT}`);
});
