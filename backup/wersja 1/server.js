// === 1. IMPORT BIBLIOTEK ===
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

// === 2. INICJALIZACJA APLIKACJI ===
const app = express();
const PORT = 3000;

// === 3. KONFIGURACJA MIDDLEWARE ===
app.use(cors()); 
app.use(express.json()); 

// === 4. POŁĄCZENIE Z BAZĄ DANYCH I TWORZENIE TABELI ===
const dbFile = 'rejestr.db';
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Błąd podczas łączenia z bazą danych:', err.message);
  } else {
    console.log('Połączono z bazą danych SQLite.');
    db.run(`CREATE TABLE IF NOT EXISTS prace (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        od_kogo TEXT,
        pracownicy TEXT,
        dane_kontaktowe TEXT,
        numer_tel TEXT,
        email TEXT,
        miejscowosc TEXT,
        informacje TEXT,
        srednica REAL,
        data_rozpoczecia TEXT,
        data_zakonczenia TEXT,
        lustro_statyczne REAL,
        lustro_dynamiczne REAL,
        wydajnosc REAL,
        ilosc_metrow REAL
    )`, (err) => {
      if (err) {
        console.error('Błąd podczas tworzenia tabeli:', err.message);
      } else {
        console.log('Tabela "prace" jest gotowa.');
      }
    });
  }
});

// === 5. API ENDPOINTS (PUNKTY DOSTĘPOWE APLIKACJI) ===

// ENDPOINT [GET] /api/prace - do pobierania wszystkich prac
app.get('/api/prace', (req, res) => {
  const sql = "SELECT * FROM prace ORDER BY id DESC";
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    });
  });
});

// ENDPOINT [POST] /api/prace - do dodawania nowej pracy
app.post('/api/prace', (req, res) => {
  const {
    od_kogo, pracownicy, dane_kontaktowe, numer_tel, email, miejscowosc,
    informacje, srednica, data_rozpoczecia, data_zakonczenia, lustro_statyczne,
    lustro_dynamiczne, wydajnosc, ilosc_metrow
  } = req.body;

  if (!od_kogo) {
    return res.status(400).json({ error: "Pole 'Od kogo' jest wymagane." });
  }

  const sql = `INSERT INTO prace (od_kogo, pracownicy, dane_kontaktowe, numer_tel, email, miejscowosc, informacje, srednica, data_rozpoczecia, data_zakonczenia, lustro_statyczne, lustro_dynamiczne, wydajnosc, ilosc_metrow) 
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  const params = [
    od_kogo, pracownicy, dane_kontaktowe, numer_tel, email, miejscowosc,
    informacje, srednica, data_rozpoczecia, data_zakonczenia, lustro_statyczne,
    lustro_dynamiczne, wydajnosc, ilosc_metrow
  ];

  db.run(sql, params, function(err) {
    if (err) { res.status(500).json({ "error": err.message }); return; }
    res.status(201).json({ "message": "success", "data": { id: this.lastID, ...req.body } });
  });
});

// ENDPOINT [PUT] /api/prace/:id - do aktualizacji pracy
app.put('/api/prace/:id', (req, res) => {
  const id = req.params.id;
  const {
    od_kogo, pracownicy, dane_kontaktowe, numer_tel, email, miejscowosc,
    informacje, srednica, data_rozpoczecia, data_zakonczenia, lustro_statyczne,
    lustro_dynamiczne, wydajnosc, ilosc_metrow
  } = req.body;

  if (!od_kogo) {
    return res.status(400).json({ error: "Pole 'Od kogo' jest wymagane." });
  }

  const sql = `UPDATE prace SET 
    od_kogo = ?, pracownicy = ?, dane_kontaktowe = ?, numer_tel = ?, email = ?, miejscowosc = ?, 
    informacje = ?, srednica = ?, data_rozpoczecia = ?, data_zakonczenia = ?, lustro_statyczne = ?, 
    lustro_dynamiczne = ?, wydajnosc = ?, ilosc_metrow = ? 
    WHERE id = ?`;
  const params = [
    od_kogo, pracownicy, dane_kontaktowe, numer_tel, email, miejscowosc,
    informacje, srednica, data_rozpoczecia, data_zakonczenia, lustro_statyczne,
    lustro_dynamiczne, wydajnosc, ilosc_metrow,
    id
  ];

  db.run(sql, params, function(err) {
    if (err) { res.status(500).json({ "error": err.message }); return; }
    res.json({ "message": "updated", "data": req.body, changes: this.changes });
  });
});

// ENDPOINT [DELETE] /api/prace/:id - do usuwania pracy
app.delete('/api/prace/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'DELETE FROM prace WHERE id = ?';
  db.run(sql, id, function(err) {
    if (err) {
      res.status(500).json({ "error": err.message });
      return;
    }
    if (this.changes > 0) {
      res.json({ "message": "deleted", changes: this.changes });
    } else {
      res.status(404).json({ "message": "not_found" });
    }
  });
});


// === 6. URUCHOMIENIE SERWERA ===
app.listen(PORT, () => {
  console.log(`Serwer został uruchomiony na http://localhost:${PORT}`);
});