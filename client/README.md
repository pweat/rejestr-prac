# Rejestr Prac Zentroo v3.0

Wewnętrzna aplikacja do zarządzania zleceniami, klientami, magazynem i ofertami dla firmy Zentroo.

## Kluczowe Funkcje

- **Pulpit:** Centralny widok z powiadomieniami o zbliżających się serwisach, niskich stanach magazynowych oraz miesięcznymi statystykami finansowymi.
- **Klienci:** Pełna obsługa bazy klientów (CRUD) z wyszukiwaniem i sortowaniem.
- **Zlecenia:** Zarządzanie czterema typami zleceń (Odwiert, Podłączenie, Stacja, Serwis) z dedykowanymi polami dla każdego typu.
- **Magazyn:** Proste zarządzanie stanem magazynowym z historią operacji.
- **Generator Ofert:** Tworzenie i edycja ofert na podstawie predefiniowanych szablonów oraz generowanie profesjonalnych plików PDF po stronie serwera.
- **System Uprawnień:** Trzy role użytkowników (Administrator, Edytor, Widz) z ograniczonym dostępem do funkcji modyfikacji i usuwania danych.

## Architektura

Aplikacja zbudowana jest w architekturze typu full-stack z oddzielonym front-endem i back-endem.

- **Front-end:** Aplikacja typu SPA (Single Page Application) zbudowana w **Vue.js 3** (Composition API) z użyciem **Vite** jako narzędzia budującego.
- **Back-end:** Serwer REST API zbudowany na **Node.js** z użyciem frameworka **Express.js**.
- **Baza Danych:** Relacyjna baza danych **PostgreSQL**.

_(Poniżej diagram, który zostanie automatycznie wyrenderowany przez GitHub)_

## Uruchomienie Projektu (Lokalnie)

1.  **Sklonuj repozytorium:**

    ```bash
    git clone [adres-twojego-repozytorium]
    ```

2.  **Uruchomienie Back-endu:**
    - Przejdź do głównego folderu projektu: `cd rejestr-prac`
    - Zainstaluj zależności: `npm install`
    - Stwórz plik `.env` na podstawie `.env.example` i uzupełnij dane do swojej lokalnej bazy danych.
    - Uruchom serwer: `node server.js`

3.  **Uruchomienie Front-endu:**
    - Otwórz nowy terminal.
    - Przejdź do folderu front-endu: `cd client`
    - Zainstaluj zależności: `npm install`
    - Uruchom serwer deweloperski: `npm run dev`

Aplikacja będzie dostępna pod adresem `http://localhost:5173`.
