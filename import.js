const axios = require('axios');
const xlsx = require('xlsx');

// =================================================================================================
// ⚙️ KONFIGURACJA SKRYPTU - DOSTOSUJ DO SWOICH POTRZEB
// =================================================================================================
const CONFIG = {
  EXCEL_FILE_PATH: './import.xlsx',
  SHEET_NAME: 'Sheet1',
  API_URL: 'http://localhost:3000',
  LOGIN_CREDENTIALS: {
    username: 'pweat', // Użyj swoich danych
    password: '3325', // Użyj swoich danych
  },
  // Mapowanie kolumn Excela (jak w pliku) na klucze, których użyjemy w kodzie
  // Klucz (np. 'data') = nazwa kolumny w Excelu w 6. wierszu
  // Wartość (np. 'C') = litera kolumny w Excelu
  //
  // ⚠️ WAŻNE: Sprawdź w Excelu i upewnij się, że litery kolumn się zgadzają!
  COLUMN_MAP: {
    Numer: 'B',
    Data: 'C',
    Telefon: 'D',
    Miejscowość: 'E',
    'Głębokość studni': 'F',
    Średnica: 'G',
    'Na ilu pompa': 'H',
    Pompa: 'I',
    'Falownik/EWC': 'J',
    Hydrofor: 'K',
    Faktura: 'L',
    'Oferta dla klienta': 'M',
    Przychód: 'N',
    Obudowa: 'O',
    Osprzęt: 'P',
    Wypłaty: 'Q',
    Dochód: 'R',
  },
};
// =================================================================================================

async function getAuthToken() {
  console.log('Logowanie do API...');
  try {
    const response = await axios.post(`${CONFIG.API_URL}/api/login`, CONFIG.LOGIN_CREDENTIALS);
    if (response.data.token) {
      console.log('✅ Zalogowano pomyślnie.');
      return response.data.token;
    }
  } catch (err) {
    console.error('❌ BŁĄD LOGOWANIA:', err.response?.data?.error || err.message);
    return null;
  }
}

async function getClientMap(token) {
  console.log('Pobieranie mapy klientów...');
  const clientsMap = new Map();
  try {
    const response = await axios.get(`${CONFIG.API_URL}/api/clients-for-select`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    response.data.forEach((client) => {
      if (client.phone_number) {
        clientsMap.set(client.phone_number, client.id);
      }
    });
    console.log(`✅ Pobrano ${clientsMap.size} klientów do mapy.`);
    return clientsMap;
  } catch (err) {
    console.error('❌ BŁĄD POBIERANIA KLIENTÓW:', err.response?.data?.error || err.message);
    return null;
  }
}

/**
 * Funkcja pomocnicza do odczytania wartości z komórki, z uwzględnieniem linków.
 */
function getCellValue(sheet, colName, rowNum) {
  const colLetter = CONFIG.COLUMN_MAP[colName];
  if (!colLetter) {
    console.warn(`[Ostrzeżenie] Nie znaleziono mapowania dla kolumny "${colName}"`);
    return undefined;
  }

  const cellAddress = colLetter + rowNum;
  const cell = sheet[cellAddress];

  if (!cell) return undefined;

  // ZMIANA: Sprawdzamy, czy komórka ma pole linku (.l) i czy to kolumna linku
  if (cell.l && (colName === 'Faktura' || colName === 'Oferta dla klienta')) {
    return cell.l.Target; // Zwracamy URL
  }

  // W przeciwnym razie zwracamy normalną wartość (.v)
  return cell.v;
}

/**
 * Konwertuje datę z Excela (numer seryjny lub string) na format YYYY-MM-DD
 */
function formatExcelDate(excelDate) {
  if (typeof excelDate === 'number') {
    const jsDate = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    return jsDate.toISOString().slice(0, 10);
  }
  // Jeśli to już string (choć plik wskazuje na numer), spróbujmy go użyć
  if (typeof excelDate === 'string') {
    return excelDate.split('T')[0];
  }
  return new Date().toISOString().slice(0, 10); // Domyślnie dzisiaj, jeśli format jest zły
}

/**
 * Główna funkcja uruchamiająca import.
 */
async function runImport() {
  console.log('--- Rozpoczynam import zleceń ---');

  const token = await getAuthToken();
  if (!token) return;

  const clientsMap = await getClientMap(token);
  if (!clientsMap) return;

  let workbook;
  try {
    workbook = xlsx.readFile(CONFIG.EXCEL_FILE_PATH);
  } catch (err) {
    console.error(`❌ BŁĄD: Nie można wczytać pliku Excela ze ścieżki: ${CONFIG.EXCEL_FILE_PATH}`);
    return;
  }

  const sheet = workbook.Sheets[CONFIG.SHEET_NAME];
  if (!sheet) {
    console.error(`❌ BŁĄD: Nie znaleziono arkusza o nazwie "${CONFIG.SHEET_NAME}" w pliku Excela.`);
    return;
  }

  // --- ZMIANA: Ręczne iterowanie po wierszach ---
  const range = xlsx.utils.decode_range(sheet['!ref']);
  const START_ROW_INDEX = 6; // Zaczynamy od 7. wiersza (indeks 6), bo 6. (indeks 5) to nagłówki

  let successCount = 0;
  let errorCount = 0;

  console.log(`Rozpoczynam przetwarzanie od wiersza ${START_ROW_INDEX + 1} do ${range.e.r + 1}`);

  for (let R = START_ROW_INDEX; R <= range.e.r; ++R) {
    const excelRowNumber = R + 1; // Numer wiersza jak w Excelu (1-based)

    // Używamy funkcji pomocniczej getCellValue do odczytania danych
    const excel_clientPhone = String(getCellValue(sheet, 'Telefon', excelRowNumber) || '');

    // Jeśli komórka z telefonem jest pusta, pomiń wiersz
    if (!excel_clientPhone) {
      console.log(`ℹ️ (Wiersz Excela ${excelRowNumber}) Pomijam, brak numeru telefonu.`);
      continue;
    }

    const excel_miejscowosc = getCellValue(sheet, 'Miejscowość', excelRowNumber);
    const clientId = clientsMap.get(excel_clientPhone);

    if (!clientId) {
      console.warn(`⚠️ (Wiersz Excela ${excelRowNumber}) OSTRZEŻENIE: Nie znaleziono klienta o nr telefonu: ${excel_clientPhone}. Pomijam wiersz.`);
      errorCount++;
      continue;
    }

    const excel_jobDate = getCellValue(sheet, 'Data', excelRowNumber);
    const excel_glebokosc = getCellValue(sheet, 'Głębokość studni', excelRowNumber);
    const excel_srednica = getCellValue(sheet, 'Średnica', excelRowNumber);
    const excel_pompaGlebokosc = getCellValue(sheet, 'Na ilu pompa', excelRowNumber);
    const excel_pompaModel = getCellValue(sheet, 'Pompa', excelRowNumber);
    const excel_sterownikModel = getCellValue(sheet, 'Falownik/EWC', excelRowNumber);
    const excel_hydroforModel = getCellValue(sheet, 'Hydrofor', excelRowNumber);
    const excel_fakturaLink = getCellValue(sheet, 'Faktura', excelRowNumber);
    const excel_ofertaLink = getCellValue(sheet, 'Oferta dla klienta', excelRowNumber);
    const excel_przychod = getCellValue(sheet, 'Przychód', excelRowNumber);
    const excel_kosztObudowy = getCellValue(sheet, 'Obudowa', excelRowNumber);
    const excel_kosztOsprzetu = getCellValue(sheet, 'Osprzęt', excelRowNumber);
    const excel_wyplaty = getCellValue(sheet, 'Wypłaty', excelRowNumber);

    // Tworzenie obiektu (payload) dla API
    const payload = {
      clientId: clientId,
      jobType: 'connection',
      jobDate: formatExcelDate(excel_jobDate),
      miejscowosc: excel_miejscowosc,
      details: {
        miejscowosc: excel_miejscowosc,
        well_depth: parseFloat(excel_glebokosc) || null,
        diameter: parseFloat(excel_srednica) || null,
        pump_depth: parseFloat(excel_pompaGlebokosc) || null,
        pump_model: excel_pompaModel || '',
        controller_model: excel_sterownikModel || '',
        hydrophore_model: excel_hydroforModel || '',
        revenue: parseFloat(excel_przychod) || 0,
        casing_cost: parseFloat(excel_kosztObudowy) || 0,
        equipment_cost: parseFloat(excel_kosztOsprzetu) || 0,
        labor_cost: parseFloat(excel_wyplaty) || 0,
        wholesale_materials_cost: 0,
        materials_invoice_url: excel_fakturaLink || '', // Przekazujemy URL
        client_offer_url: excel_ofertaLink || '', // Przekazujemy URL
      },
    };

    // Wysłanie zapytania do API
    try {
      await axios.post(`${CONFIG.API_URL}/api/jobs`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`✅ (Wiersz Excela ${excelRowNumber}) Pomyślnie dodano zlecenie dla: ${excel_miejscowosc}`);
      successCount++;
    } catch (err) {
      console.error(`❌ (Wiersz Excela ${excelRowNumber}) BŁĄD dodawania zlecenia dla: ${excel_miejscowosc}. Odpowiedź serwera:`, err.response?.data?.error || err.message);
      errorCount++;
    }
  }

  console.log('--- Zakończono import ---');
  console.log(`👍 Pomyślnie dodano: ${successCount} zleceń`);
  console.log(`👎 Błędów / Pominięto: ${errorCount} wierszy`);
}

// Uruchomienie skryptu
runImport();
