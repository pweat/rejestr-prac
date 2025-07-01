<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { setToken } from '../auth/auth.js';

const router = useRouter();
const username = ref('');
const password = ref('');
const error = ref(null);
const isLoading = ref(false);

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const handleLogin = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Nie udało się zalogować.');
    }
    setToken(data.token);
    router.push('/');
  } catch (err) {
    error.value = err.message;
  } finally {
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
          <input type="text" id="username" v-model="username" required />
        </div>
        <div class="form-group">
          <label for="password">Hasło</label>
          <input type="password" id="password" v-model="password" required />
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
  background-color: #f4f7f9;
}
.login-box {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
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
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}
.login-btn {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  background-color: #007bff;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}
.login-btn:hover {
  background-color: #0056b3;
}
.error-message {
  color: #dc3545;
  /* ZMIANA: Dodano margines na górze, aby odsunąć od pól i na dole, aby odsunąć od przycisku */
  margin-top: 15px;
  margin-bottom: 15px;
  text-align: center;
}
</style>
