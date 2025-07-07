<script setup>
/**
 * @file Login.vue
 * @description Komponent zawierający formularz logowania. Odpowiada za
 * wysłanie danych uwierzytelniających do API, obsługę odpowiedzi
 * oraz przekierowanie użytkownika po pomyślnym zalogowaniu.
 */

// ===================================================================================
// 📜 IMPORTS
// ===================================================================================
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { setToken } from '../auth/auth.js';

// ===================================================================================
// ⚙️ KONFIGURACJA I INICJALIZACJA
// ===================================================================================

/** Dostęp do instancji routera Vue. */
const router = useRouter();

/** @const {string} Bazowy URL do API. */
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// ===================================================================================
// ✨ STAN KOMPONENTU (REFS)
// ===================================================================================

/** Przechowuje nazwę użytkownika wprowadzoną w formularzu. */
const username = ref('');

/** Przechowuje hasło wprowadzone w formularzu. */
const password = ref('');

/** Przechowuje komunikat błędu logowania, jeśli wystąpi. */
const error = ref(null);

/** Wskaźnik, czy proces logowania jest w toku (do blokowania przycisku). */
const isLoading = ref(false);

// ===================================================================================
// ⚡ GŁÓWNA LOGIKA
// ===================================================================================

/**
 * Asynchronicznie obsługuje proces logowania.
 * 1. Wysyła dane logowania do API.
 * 2. W przypadku błędu, wyświetla komunikat.
 * 3. W przypadku sukcesu, zapisuje token i przekierowuje na stronę główną.
 */
const handleLogin = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        password: password.value,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Jeśli serwer zwrócił błąd, rzucamy go, aby obsłużyć w bloku catch.
      throw new Error(data.error || 'Nie udało się zalogować.');
    }

    // Zapisujemy token w localStorage.
    setToken(data.token);
    // Przekierowujemy przez twarde przeładowanie strony, co gwarantuje wczytanie nowego stanu.
    window.location.href = '/';
  } catch (err) {
    // Przechwytujemy błąd i przypisujemy jego treść do zmiennej, która wyświetli go w szablonie.
    error.value = err.message;
  } finally {
    // Niezależnie od wyniku, kończymy stan ładowania.
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="login-wrapper">
    <div class="login-box">
      <h1>Logowanie</h1>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">Nazwa użytkownika</label>
          <input id="username" v-model="username" type="text" required />
        </div>
        <div class="form-group">
          <label for="password">Hasło</label>
          <input id="password" v-model="password" type="password" required />
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>

        <button type="submit" class="login-btn" :disabled="isLoading">
          {{ isLoading ? 'Logowanie...' : 'Zaloguj' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--background-page);
}

.login-box {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: var(--background-light);
  border-radius: 8px;
  box-shadow: var(--shadow);
}

h1 {
  text-align: center;
  margin-top: 0;
  margin-bottom: 25px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

.form-group input {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.login-btn {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  background-color: var(--blue);
  color: var(--white);
  cursor: pointer;
  transition: background-color 0.2s;
}

.login-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

/* Styl dla komunikatu o błędzie, z odpowiednimi marginesami. */
.error-message {
  color: var(--red);
  margin-top: 15px;
  margin-bottom: 15px;
  text-align: center;
  font-weight: 500;
}
</style>
