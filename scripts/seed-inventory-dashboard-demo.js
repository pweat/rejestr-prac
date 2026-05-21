/**
 * Dane demonstracyjne magazynu — różne stany, alerty pulpitu, zamówione.
 * Uruchomienie: node scripts/seed-inventory-dashboard-demo.js
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
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@127.0.0.1:5433/rejestr_prac',
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

/** Scenariusze testowe — nazwy z prefiksem [DEMO] */
const DEMO_ITEMS = [
  {
    category: 'Demo — alerty pulpitu',
    name: '[DEMO] Pompa głębinowa 4" — brak towaru',
    unit: 'szt.',
    quantity: 0,
    min_stock_level: 2,
    alert_on_dashboard: true,
    is_ordered: false,
    note: 'Pulpit: Brak (krytyczny)',
  },
  {
    category: 'Demo — alerty pulpitu',
    name: '[DEMO] Filtr osadowy 10" — niski stan',
    unit: 'szt.',
    quantity: 2,
    min_stock_level: 8,
    alert_on_dashboard: true,
    is_ordered: false,
    note: 'Pulpit: Niski',
  },
  {
    category: 'Demo — alerty pulpitu',
    name: '[DEMO] Wyłącznik ciśnieniowy — niski, alert WYŁ.',
    unit: 'szt.',
    quantity: 1,
    min_stock_level: 5,
    alert_on_dashboard: false,
    is_ordered: false,
    note: 'Magazyn: niski, pulpit: brak (sezonowy)',
  },
  {
    category: 'Demo — alerty pulpitu',
    name: '[DEMO] Klej PVC — brak, już zamówione',
    unit: 'szt.',
    quantity: 0,
    min_stock_level: 4,
    alert_on_dashboard: true,
    is_ordered: true,
    note: 'Pulpit: ukryte (is_ordered)',
  },
  {
    category: 'Demo — alerty pulpitu',
    name: '[DEMO] Taśma teflonowa — stan OK',
    unit: 'rol.',
    quantity: 12,
    min_stock_level: 5,
    alert_on_dashboard: true,
    is_ordered: false,
    note: 'Pulpit: brak alertu (powyżej minimum)',
  },
  {
    category: 'Demo — alerty pulpitu',
    name: '[DEMO] Marker — bez progu magazynowego',
    unit: 'szt.',
    quantity: 3,
    min_stock_level: 0,
    alert_on_dashboard: false,
    is_ordered: false,
    note: 'Min=0, brak alertów',
  },
  {
    category: 'Demo — alerty pulpitu',
    name: '[DEMO] Hydrofor 80L — niski + alert',
    unit: 'szt.',
    quantity: 1,
    min_stock_level: 2,
    alert_on_dashboard: true,
    is_ordered: false,
    note: 'Pulpit: Niski',
  },
  {
    category: 'Demo — alerty pulpitu',
    name: '[DEMO] Wkład UV 12W — niski, zamówione',
    unit: 'szt.',
    quantity: 1,
    min_stock_level: 4,
    alert_on_dashboard: true,
    is_ordered: true,
    note: 'Magazyn: niski+zamówione, pulpit: ukryte',
  },
  {
    category: 'Demo — alerty pulpitu',
    name: '[DEMO] Rura PE 32mm — niski, bez alertu',
    unit: 'm',
    quantity: 15,
    min_stock_level: 100,
    alert_on_dashboard: false,
    is_ordered: false,
    note: 'Magazyn: niski, pulpit: brak',
  },
  {
    category: 'Demo — alerty pulpitu',
    name: '[DEMO] Zbiornik soli 25kg — krytyczny',
    unit: 'szt.',
    quantity: 0,
    min_stock_level: 3,
    alert_on_dashboard: true,
    is_ordered: false,
    note: 'Pulpit: Brak',
  },
];

async function upsertCategory(name) {
  const result = await pool.query(
    `INSERT INTO inventory_categories (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name]
  );
  return result.rows[0].id;
}

async function upsertDemoItem(item, categoryId) {
  await pool.query(
    `INSERT INTO inventory_items (name, quantity, unit, min_stock_level, category_id, is_ordered, alert_on_dashboard)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (name) DO UPDATE SET
       quantity = EXCLUDED.quantity,
       unit = EXCLUDED.unit,
       min_stock_level = EXCLUDED.min_stock_level,
       category_id = EXCLUDED.category_id,
       is_ordered = EXCLUDED.is_ordered,
       alert_on_dashboard = EXCLUDED.alert_on_dashboard`,
    [
      item.name,
      item.quantity,
      item.unit,
      item.min_stock_level,
      categoryId,
      item.is_ordered,
      item.alert_on_dashboard,
    ]
  );
}

async function run() {
  const catId = await upsertCategory('Demo — alerty pulpitu');
  let dashboardAlerts = 0;

  console.log('Dodawanie pozycji demonstracyjnych magazynu:\n');

  for (const item of DEMO_ITEMS) {
    await upsertDemoItem(item, catId);
    const onDashboard =
      item.alert_on_dashboard &&
      item.min_stock_level > 0 &&
      item.quantity <= item.min_stock_level &&
      !item.is_ordered;
    if (onDashboard) dashboardAlerts += 1;
    console.log(`  ${onDashboard ? '🔔' : '  '} ${item.name}`);
    console.log(`     stan ${item.quantity} / min ${item.min_stock_level} · alert=${item.alert_on_dashboard} · zamówione=${item.is_ordered}`);
    console.log(`     → ${item.note}\n`);
  }

  console.log(`Na pulpicie (widget magazyn): ${dashboardAlerts} pozycji`);
  console.log('Gotowe. Odśwież Pulpit i Magazyn w aplikacji.');
}

run()
  .catch((err) => {
    console.error('Seed demo magazynu nieudany:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
