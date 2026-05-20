/**
 * Seed kategorii i produktów magazynowych (dane testowe).
 * Uruchomienie: node scripts/seed-inventory-test-data.js
 */
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

const randomFloat = (min, max, precision = 1) => Number((Math.random() * (max - min) + min).toFixed(precision));
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Kategorie + produkty (nazwa, jednostka, typowa min. ilość magazynowa) */
const CATALOG = [
  {
    category: 'Pompy i hydroforowo',
    items: [
      { name: 'Pompa głębinowa 4" 4N23 230V IBO', unit: 'szt.', min: 1 },
      { name: 'Pompa głębinowa 4" 5N32 400V', unit: 'szt.', min: 1 },
      { name: 'Pompa głębinowa 3" 3N18 230V', unit: 'szt.', min: 1 },
      { name: 'Hydrofor 80L z manometrem', unit: 'szt.', min: 2 },
      { name: 'Hydrofor 100L stal nierdzewna', unit: 'szt.', min: 1 },
      { name: 'Wyłącznik ciśnieniowy 1-3 bar', unit: 'szt.', min: 5 },
      { name: 'Wyłącznik ciśnieniowy 1,5-5 bar', unit: 'szt.', min: 5 },
      { name: 'Przewód ciśnieniowy 5m 1"', unit: 'szt.', min: 3 },
      { name: 'Złączka PE 32x1" GZ', unit: 'szt.', min: 10 },
      { name: 'Zawór kulowy 1" mosiądz', unit: 'szt.', min: 8 },
    ],
  },
  {
    category: 'Rury i obudowy studzienne',
    items: [
      { name: 'Rura PE 32mm PN10', unit: 'm', min: 100 },
      { name: 'Rura PE 25mm PN10', unit: 'm', min: 80 },
      { name: 'Rura PEHD 40mm SDR11', unit: 'm', min: 60 },
      { name: 'Rura studzienna PVC 125mm', unit: 'm', min: 50 },
      { name: 'Rura studzienna PVC 160mm', unit: 'm', min: 40 },
      { name: 'Obudowa stalowa 133mm', unit: 'm', min: 30 },
      { name: 'Obudowa stalowa 159mm', unit: 'm', min: 25 },
      { name: 'Filtr liniowy 125mm', unit: 'szt.', min: 5 },
      { name: 'Filtr liniowy 160mm', unit: 'szt.', min: 4 },
      { name: 'Kielich PE 32mm', unit: 'szt.', min: 20 },
      { name: 'Kolano PE 32mm 90°', unit: 'szt.', min: 15 },
    ],
  },
  {
    category: 'Filtry i uzdatnianie',
    items: [
      { name: 'Filtr antypiaskowy 1"', unit: 'szt.', min: 6 },
      { name: 'Filtr antypiaskowy 1 1/4"', unit: 'szt.', min: 4 },
      { name: 'Filtr węglowy 10" Big Blue', unit: 'szt.', min: 8 },
      { name: 'Filtr osadowy 10" 5 mikronów', unit: 'szt.', min: 12 },
      { name: 'Filtr osadowy 20" 1 mikron', unit: 'szt.', min: 10 },
      { name: 'Wkład filtra 10" 5µ', unit: 'szt.', min: 20 },
      { name: 'Zbiornik soli 25 kg tabletkowana', unit: 'szt.', min: 10 },
      { name: 'Zbiornik soli 50 kg', unit: 'szt.', min: 5 },
      { name: 'Złoże żywiczne kationowe 25L', unit: 'op.', min: 4 },
      { name: 'Złoże żwir kwarcowy 0,8-1,2mm 25kg', unit: 'op.', min: 6 },
    ],
  },
  {
    category: 'Stacje uzdatniania wody',
    items: [
      { name: 'Zmiękczacz automatyczny 20L', unit: 'szt.', min: 1 },
      { name: 'Zmiękczacz automatyczny 30L', unit: 'szt.', min: 1 },
      { name: 'Lampa UV 12 GPM', unit: 'szt.', min: 2 },
      { name: 'Lampa UV 24 GPM', unit: 'szt.', min: 1 },
      { name: 'Wkład UV 12W', unit: 'szt.', min: 4 },
      { name: 'Sterownik zmiękczacza Clack WS1', unit: 'szt.', min: 2 },
      { name: 'Zbiornik solanki 15L', unit: 'szt.', min: 3 },
      { name: 'Zestaw montażowy stacji UV', unit: 'kpl.', min: 2 },
    ],
  },
  {
    category: 'Osprzęt elektryczny',
    items: [
      { name: 'Sterownik pompy SSM 2,2kW', unit: 'szt.', min: 2 },
      { name: 'Sterownik pompy SSM 1,1kW', unit: 'szt.', min: 2 },
      { name: 'Kabel zasilający 3x2,5mm²', unit: 'm', min: 50 },
      { name: 'Kabel zasilający 3x1,5mm²', unit: 'm', min: 50 },
      { name: 'Skrzynka rozdzielcza IP65', unit: 'szt.', min: 3 },
      { name: 'Wyłącznik różnicowoprądowy 40A', unit: 'szt.', min: 4 },
      { name: 'Stycznik 25A 230V', unit: 'szt.', min: 4 },
      { name: 'Listwa zaciskowa DIN', unit: 'szt.', min: 10 },
    ],
  },
  {
    category: 'Materiały montażowe',
    items: [
      { name: 'Głowica studzienna 125mm', unit: 'szt.', min: 4 },
      { name: 'Głowica studzienna 160mm', unit: 'szt.', min: 3 },
      { name: 'Uszczelka głowicy 125mm', unit: 'szt.', min: 10 },
      { name: 'Taśma teflonowa', unit: 'rol.', min: 5 },
      { name: 'Pasta uszczelniająca do gwintów', unit: 'szt.', min: 5 },
      { name: 'Opaska zaciskowa 32mm', unit: 'szt.', min: 30 },
      { name: 'Opaska zaciskowa 40mm', unit: 'szt.', min: 20 },
      { name: 'Klej do PVC 125ml', unit: 'szt.', min: 4 },
      { name: 'Płyn do czyszczenia PVC', unit: 'szt.', min: 4 },
      { name: 'Wąż ssący 1" 3m', unit: 'szt.', min: 2 },
    ],
  },
  {
    category: 'Chemia serwisowa',
    items: [
      { name: 'Środek odkamieniający 5L', unit: 'szt.', min: 3 },
      { name: 'Środek odkamieniający 1L', unit: 'szt.', min: 6 },
      { name: 'Płyn do dezynfekcji UV 1L', unit: 'szt.', min: 4 },
      { name: 'Tabletki chlorowe 1kg', unit: 'op.', min: 2 },
      { name: 'Test paskowy twardość wody (50 szt.)', unit: 'op.', min: 2 },
      { name: 'Test pH wody (50 szt.)', unit: 'op.', min: 2 },
    ],
  },
  {
    category: 'Narzędzia i akcesoria',
    items: [
      { name: 'Klucz do głowic studziennych', unit: 'szt.', min: 1 },
      { name: 'Taśma miernicza 50m', unit: 'szt.', min: 2 },
      { name: 'Lina stalowa 6mm', unit: 'm', min: 30 },
      { name: 'Zacisk linowy 6mm', unit: 'szt.', min: 10 },
      { name: 'Poziomnica 60cm', unit: 'szt.', min: 2 },
      { name: 'Rękawice robocze (para)', unit: 'para', min: 20 },
      { name: 'Marker permanentny czarny', unit: 'szt.', min: 10 },
      { name: 'Etykiety magazynowe A4', unit: 'ark.', min: 5 },
    ],
  },
];

async function upsertCategory(name) {
  const result = await pool.query(
    `INSERT INTO inventory_categories (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name`,
    [name]
  );
  return result.rows[0];
}

async function upsertItem({ name, unit, min_stock_level, category_id }) {
  const quantity = randomFloat(min_stock_level * 0.5, min_stock_level * 4, 1);
  const result = await pool.query(
    `INSERT INTO inventory_items (name, quantity, unit, min_stock_level, category_id, is_ordered)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (name) DO UPDATE SET
       unit = EXCLUDED.unit,
       min_stock_level = EXCLUDED.min_stock_level,
       category_id = EXCLUDED.category_id
     RETURNING id, name`,
    [name, quantity, unit, min_stock_level, category_id, quantity < min_stock_level]
  );
  return result.rows[0];
}

async function run() {
  let categoriesAdded = 0;
  let itemsAdded = 0;
  let lowStock = 0;

  for (const group of CATALOG) {
    const cat = await upsertCategory(group.category);
    categoriesAdded += 1;

    for (const item of group.items) {
      const min = item.min ?? randomInt(2, 10);
      const row = await upsertItem({
        name: item.name,
        unit: item.unit,
        min_stock_level: min,
        category_id: cat.id,
      });
      itemsAdded += 1;

      const qtyRes = await pool.query('SELECT quantity, min_stock_level FROM inventory_items WHERE id = $1', [row.id]);
      if (qtyRes.rows[0].quantity < qtyRes.rows[0].min_stock_level) lowStock += 1;
    }
  }

  console.log(`Kategorie: ${categoriesAdded}`);
  console.log(`Produkty: ${itemsAdded}`);
  console.log(`Poniżej minimum (is_ordered): ${lowStock} — do testów alertów magazynowych`);
  console.log('');
  console.log('Gotowe. Odśwież widok Magazyn w aplikacji.');
}

run()
  .catch((err) => {
    console.error('Seed magazynu nieudany:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
