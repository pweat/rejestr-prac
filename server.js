const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json()); 

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  user: 'postgres',
  host: 'localhost',
  database: 'rejestr_prac',
  password: 'admin', // <-- PAMIĘTAJ O ZMIANIE
  port: 5432,
});

const initializeDatabase = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log('Połączono z bazą danych PostgreSQL');
    await client.query(`CREATE TABLE IF NOT EXISTS prace (id SERIAL PRIMARY KEY, od_kogo TEXT, pracownicy TEXT, numer_tel TEXT, miejscowosc TEXT, informacje TEXT, srednica REAL, data_rozpoczecia DATE, data_zakonczenia DATE, lustro_statyczne REAL, lustro_dynamiczne REAL, wydajnosc REAL, ilosc_metrow REAL)`);
    console.log('Tabela "prace" jest gotowa.');
  } catch (err) {
    console.error('Błąd podczas inicjalizacji bazy danych:', err);
  } finally {
    if (client) {
      client.release();
    }
  }
};
initializeDatabase();

app.get('/api/prace', async (req, res) => {
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

app.get('/api/prace/:id', async (req, res) => {
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

app.post('/api/prace', async (req, res) => {
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

app.put('/api/prace/:id', async (req, res) => {
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

app.delete('/api/prace/:id', async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Serwer został uruchomiony na porcie ${PORT}`);
});