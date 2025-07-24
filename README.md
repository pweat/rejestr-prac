# Rejestr Prac Zentroo v3.1

Wewnętrzna aplikacja typu PWA (Progressive Web App) do zarządzania zleceniami, klientami, magazynem i ofertami.

## 🌐 Live Demo

Publiczna wersja demonstracyjna aplikacji jest dostępna pod adresem:
**[https://rejestr-prac-demo.onrender.com](https://rejestr-prac-demo.onrender.com)**

Można się zalogować używając danych:

- **Login:** `demo`
- **Hasło:** `demodemo`

---

## 🚀 Kluczowe Funkcje

- **Pulpit:** Centralny widok z powiadomieniami o zbliżających się serwisach, niskich stanach magazynowych oraz miesięcznymi statystykami finansowymi.
- **Pełny CRUD:** Zarządzanie klientami, zleceniami, stanem magazynowym i ofertami.
- **Generator Ofert PDF:** Tworzenie ofert na podstawie szablonów i generowanie profesjonalnych plików PDF po stronie serwera z pełną obsługą polskich znaków.
- **System Uprawnień:** Trzy role użytkowników (Administrator, Edytor, Widz) z ograniczonym dostępem do funkcji.
- **PWA (Progressive Web App):** Aplikacja jest w pełni instalowalna na urządzeniach mobilnych i desktopowych, posiada podstawową obsługę offline oraz skróty aplikacji (App Shortcuts).
- **Zaawansowane Listy:** Wyszukiwanie, sortowanie i paginacja we wszystkich modułach.

---

## 🛠️ Architektura i Stos Technologiczny

Aplikacja zbudowana jest w architekturze full-stack z oddzielonym front-endem i back-endem.

- **Front-end:** Vue.js 3 (Composition API), Vite, Vue Router
- **Back-end:** Node.js, Express.js
- **Baza Danych:** PostgreSQL (hostowana na Supabase)
- **Hosting:** Render.com
- **Kluczowe Biblioteki:** `pdfkit` (generowanie PDF), `jsonwebtoken` (autoryzacja), `bcryptjs` (hashowanie haseł), `vite-plugin-pwa` (obsługa PWA).

```mermaid
graph TD
    A[Użytkownik w przeglądarce] --> B{Aplikacja Frontend<br>(Vue.js @ Render.com)};
    B -- Żądania API --> C{API Backend<br>(Node.js/Express @ Render.com)};
    C -- Zapytania SQL --> D[(Baza Danych<br>PostgreSQL @ Supabase)];

    subgraph "Proces Wdrożenia"
        E[Deweloper] -- git push --> F(Repozytorium GitHub);
        F -- Webhook --> G{Deploy na Render.com};
    end
```
