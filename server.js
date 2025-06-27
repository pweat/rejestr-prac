const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bardzo-tajny-klucz-do-zmiany-na-produkcji';

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

const initializeDatabase = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log('Połączono z bazą danych PostgreSQL');
    await client.query(`CREATE TABLE IF NOT EXISTS prace (id SERIAL PRIMARY KEY, od_kogo TEXT, pracownicy TEXT, numer_tel TEXT, miejscowosc TEXT, informacje TEXT, srednica REAL, data_rozpoczecia DATE, data_zakonczenia DATE NOT NULL, lustro_statyczne REAL, lustro_dynamiczne REAL, wydajnosc REAL, ilosc_metrow REAL)`);
    console.log('Tabela "prace" jest gotowa.');
    await client.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL)`);
    console.log('Tabela "users" jest gotowa.');
    await client.query(`CREATE TABLE IF NOT EXISTS inventory_items (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, quantity REAL NOT NULL DEFAULT 0, unit TEXT NOT NULL, min_stock_level REAL NOT NULL DEFAULT 0, last_delivery_date DATE)`);
    console.log('Tabela "inventory_items" jest gotowa.');
    await client.query(`CREATE TABLE IF NOT EXISTS stock_history (id SERIAL PRIMARY KEY, item_id INTEGER NOT NULL REFERENCES inventory_items(id), change_quantity REAL NOT NULL, operation_type TEXT NOT NULL, operation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(), user_id INTEGER REFERENCES users(id))`);
    console.log('Tabela "stock_history" jest gotowa.');
  } catch (err) {
    console.error('Błąd podczas inicjalizacji bazy danych:', err);
    process.exit(1);
  } finally {
    if (client) client.release();
  }
};
initializeDatabase();

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

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) { return res.status(400).json({ error: 'Nazwa użytkownika i hasło są wymagane.' }); }
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const newUser = await pool.query("INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username", [username, password_hash]);
    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    if (err.code === '23505') { return res.status(400).json({ error: 'Użytkownik o tej nazwie już istnieje.' }); }
    console.error('Błąd w /api/register:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) { return res.status(400).json({ error: 'Nazwa użytkownika i hasło są wymagane.' }); }
    const userResult = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) { return res.status(401).json({ error: 'Nieprawidłowa nazwa użytkownika lub hasło.' }); }
    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) { return res.status(401).json({ error: 'Nieprawidłowa nazwa użytkownika lub hasło.' }); }
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } catch (err) {
    console.error('Błąd w /api/login:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera.' });
  }
});

app.get('/api/prace', authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const sortBy = req.query.sortBy || 'data_zakonczenia';
  const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';
  const allowedSortBy = ['id', 'od_kogo', 'miejscowosc', 'data_zakonczenia'];
  if (!allowedSortBy.includes(sortBy)) { return res.status(400).json({ error: "Niedozwolona kolumna sortowania." }); }
  try {
    let whereClauses = []; let searchParams = [];
    if (search) {
      const searchTerm = `%${search}%`;
      const searchableColumns = ['od_kogo', 'miejscowosc', 'pracownicy', 'numer_tel'];
      let paramIndex = 1;
      searchableColumns.forEach(col => { whereClauses.push(`${col} ILIKE $${paramIndex++}`); });
      searchParams = Array(searchableColumns.length).fill(searchTerm);
    }
    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' OR ')}` : '';
    const countSql = `SELECT COUNT(*) as count FROM prace ${whereString}`;
    const countResult = await pool.query(countSql, searchParams);
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);
    const dataSql = `SELECT * FROM prace ${whereString} ORDER BY ${sortBy} ${sortOrder} NULLS LAST, id DESC LIMIT $${searchParams.length + 1} OFFSET $${searchParams.length + 2}`;
    const finalDataParams = [...searchParams, limit, offset];
    const dataResult = await pool.query(dataSql, finalDataParams);
    res.json({ message: "success", data: dataResult.rows, pagination: { totalItems, totalPages, currentPage: page, itemsPerPage: limit } });
  } catch (err) {
    console.error('Błąd w GET /api/prace:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

app.get('/api/prace/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM prace WHERE id = $1", [id]);
    if (result.rows.length === 0) { return res.status(404).json({ "error": "Nie znaleziono wpisu o podanym ID." }); }
    res.json({ message: "success", data: result.rows[0] });
  } catch (err) {
    console.error(`Błąd w GET /api/prace/${req.params.id}:`, err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

app.post('/api/prace', authenticateToken, async (req, res) => {
  try {
    const { od_kogo, pracownicy, numer_tel, miejscowosc, informacje, srednica, data_rozpoczecia, data_zakonczenia, lustro_statyczne, lustro_dynamiczne, wydajnosc, ilosc_metrow } = req.body;
    if (!od_kogo || !data_zakonczenia) { return res.status(400).json({ error: "Pola 'Od kogo' i 'Data zakończenia' są wymagane." }); }
    if (numer_tel && numer_tel.length > 0) {
      const phoneDigits = numer_tel.replace(/[\s-]/g, '');
      if (!/^\d{9}$/.test(phoneDigits)) { return res.status(400).json({ error: "Niepoprawny format numeru telefonu." }); }
    }
    const sql = `INSERT INTO prace (od_kogo, pracownicy, numer_tel, miejscowosc, informacje, srednica, data_rozpoczecia, data_zakonczenia, lustro_statyczne, lustro_dynamiczne, wydajnosc, ilosc_metrow) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`;
    const params = [ od_kogo, pracownicy, numer_tel, miejscowosc, informacje, srednica || null, data_rozpoczecia || null, data_zakonczenia, lustro_statyczne || null, lustro_dynamiczne || null, wydajnosc || null, ilosc_metrow || null ];
    const result = await pool.query(sql, params);
    res.status(201).json({ message: "success", data: result.rows[0] });
  } catch (err) {
    console.error('Błąd w POST /api/prace:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera podczas dodawania wpisu.' });
  }
});

app.put('/api/prace/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { od_kogo, pracownicy, numer_tel, miejscowosc, informacje, srednica, data_rozpoczecia, data_zakonczenia, lustro_statyczne, lustro_dynamiczne, wydajnosc, ilosc_metrow } = req.body;
    if (!od_kogo || !data_zakonczenia) { return res.status(400).json({ error: "Pola 'Od kogo' i 'Data zakończenia' są wymagane." }); }
    if (numer_tel && numer_tel.length > 0) {
      const phoneDigits = numer_tel.replace(/[\s-]/g, '');
      if (!/^\d{9}$/.test(phoneDigits)) { return res.status(400).json({ error: "Niepoprawny format numeru telefonu." }); }
    }
    const sql = `UPDATE prace SET od_kogo = $1, pracownicy = $2, numer_tel = $3, miejscowosc = $4, informacje = $5, srednica = $6, data_rozpoczecia = $7, data_zakonczenia = $8, lustro_statyczne = $9, lustro_dynamiczne = $10, wydajnosc = $11, ilosc_metrow = $12 WHERE id = $13 RETURNING *`;
    const params = [ od_kogo, pracownicy, numer_tel, miejscowosc, informacje, srednica || null, data_rozpoczecia || null, data_zakonczenia, lustro_statyczne || null, lustro_dynamiczne || null, wydajnosc || null, ilosc_metrow || null, id ];
    const result = await pool.query(sql, params);
    res.json({ message: "updated", data: result.rows[0] });
  } catch (err) {
    console.error(`Błąd w PUT /api/prace/${req.params.id}:`, err);
    res.status(500).json({ error: 'Wystąpił błąd serwera podczas aktualizacji.' });
  }
});

app.delete('/api/prace/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM prace WHERE id = $1", [id]);
    if (result.rowCount === 0) { return res.status(404).json({ "message": "not_found" }); }
    res.json({ "message": "deleted" });
  } catch (err) {
    console.error(`Błąd w DELETE /api/prace/${req.params.id}:`, err);
    res.status(500).json({ error: 'Wystąpił błąd serwera podczas usuwania.' });
  }
});

app.get('/api/inventory', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory_items ORDER BY name ASC');
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
      return res.status(400).json({ error: 'Nazwa i jednostka miary są wymagane.' });
    }
    const sql = `INSERT INTO inventory_items (name, quantity, unit, min_stock_level) VALUES ($1, $2, $3, $4) RETURNING *`;
    const params = [name, quantity || 0, unit, min_stock_level || 0];
    const result = await pool.query(sql, params);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { 
      return res.status(400).json({ error: 'Przedmiot o tej nazwie już istnieje w magazynie.' });
    }
    console.error('Błąd w POST /api/inventory:', err);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});

app.listen(PORT, () => {
  console.log(`Serwer został uruchomiony na porcie ${PORT}`);
});