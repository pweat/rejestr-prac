<script setup>
import { RouterView, RouterLink, useRouter } from 'vue-router';
import { isAuthenticated, removeToken } from './auth/auth.js';

const router = useRouter();

const handleLogout = () => {
  removeToken();
  router.push('/login');
};
</script>

<template>
  <header class="main-header">
    <nav class="main-nav">
      <template v-if="isAuthenticated">
        <RouterLink to="/">Pulpit</RouterLink>
        <RouterLink to="/klienci">Klienci</RouterLink>
        <RouterLink to="/zlecenia">Zlecenia</RouterLink>
        <RouterLink to="/magazyn">Magazyn</RouterLink>
      </template>
    </nav>
    <div class="user-actions">
      <button v-if="isAuthenticated" @click="handleLogout" class="logout-btn">Wyloguj</button>
    </div>
  </header>

  <main>
    <RouterView />
  </main>
</template>

<style>
:root {
  --text-color: #2c3e50;
  --border-color: #e0e0e0;
  --background-light: #ffffff;
  --background-page: #f4f7f9;
  --header-background: #f8f9fa;
  --green: #28a745;
  --red: #dc3545;
  --blue: #007bff;
  --grey: #6c757d;
  --white: #fff;
  --shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
html {
  box-sizing: border-box;
}
*,
*:before,
*:after {
  box-sizing: inherit;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: var(--text-color);
  background-color: var(--background-page);
  margin: 0;
}
#app {
  width: 100%;
}

.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 40px;
  background-color: #343a40;
  color: white;
  height: 60px;
}
.main-nav {
  display: flex;
  gap: 20px;
}
.main-nav a {
  color: #f8f9fa;
  text-decoration: none;
  padding: 10px;
  border-radius: 6px;
  transition: background-color 0.2s;
}
.main-nav a.router-link-exact-active {
  background-color: var(--blue);
  font-weight: bold;
}
.main-nav a:hover {
  background-color: #495057;
}
.logout-btn {
  background-color: var(--grey);
}
.container {
  width: 98%;
  max-width: none;
  box-sizing: border-box;
  margin: 30px auto;
  padding: 20px 30px;
  background-color: var(--background-light);
  border-radius: 8px;
  box-shadow: var(--shadow);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}
.header h1 {
  margin: 0;
  font-size: 24px;
}
.add-new-btn {
  background-color: var(--green);
  font-size: 16px;
  padding: 12px 20px;
}
.search-container {
  margin-bottom: 1.5rem;
}
.search-container input {
  width: 100%;
  padding: 12px 15px;
  font-size: 16px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-sizing: border-box;
}
.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  color: var(--grey);
}
.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--blue);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
.table-container {
  width: 100%;
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
th,
td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}
.col-pracownicy,
.col-informacje {
  white-space: normal;
  word-break: break-word;
  min-width: 200px;
}
th {
  background-color: var(--header-background);
  font-weight: 600;
}
th.sortable {
  cursor: pointer;
  user-select: none;
}
th.sortable:hover {
  background-color: #e9ecef;
}
td {
  color: #555;
}
.empty-table-message {
  padding: 30px;
  text-align: center;
  color: var(--grey);
}
.actions-cell {
  white-space: nowrap;
}
.actions-cell > * {
  margin-right: 8px;
}
.actions-cell > *:last-child {
  margin-right: 0;
}
button {
  padding: 8px 12px;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}
button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
button.pokaż {
  background-color: #17a2b8;
}
button.usun {
  background-color: var(--red);
}
button.edytuj {
  background-color: var(--blue);
}
button.zapisz {
  background-color: var(--green);
}
button.anuluj {
  background-color: var(--grey);
}
button:disabled {
  background-color: var(--grey);
  cursor: not-allowed;
  opacity: 0.7;
  transform: none;
  box-shadow: none;
}
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1.5rem;
  gap: 1rem;
}
.pagination-controls button {
  background-color: var(--blue);
}
.pagination-controls span {
  font-weight: 600;
  color: var(--grey);
}
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-content {
  width: 90%;
  max-width: 1000px;
  max-height: 90vh;
  overflow-y: auto;
  background-color: var(--background-light);
  border-radius: 8px;
  box-shadow: var(--shadow);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid var(--border-color);
}
.modal-header h3 {
  border-bottom: none;
  padding-bottom: 0;
  margin: 0;
}
.close-button {
  background: 0 0;
  border: none;
  font-size: 28px;
  font-weight: 300;
  color: var(--grey);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.modal-content form {
  padding: 25px;
  border: none;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}
.form-group {
  display: flex;
  flex-direction: column;
}
.form-group.full-width {
  grid-column: 1/-1;
}
.form-group label {
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 14px;
}
.form-group input,
.form-group textarea {
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  transition:
    border-color 0.3s,
    box-shadow 0.3s;
}
.form-group input:focus,
.form-group textarea:focus {
  outline: 0;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.2);
}
.modal-actions {
  grid-column: 1/-1;
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
  gap: 10px;
}
.error-message {
  color: var(--red);
  font-size: 13px;
  margin-top: 15px;
  margin-bottom: 15px;
  text-align: center;
}
@media screen and (max-width: 768px) {
  .table-container table thead {
    border: none;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
  }
  .table-container table tr {
    display: block;
    margin-bottom: 1em;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 1em;
  }
  .table-container table td {
    display: block;
    text-align: left;
    border-bottom: 1px dotted #ccc;
    padding: 8px 0;
    min-height: 1.5em;
  }
  .table-container table td:last-child {
    border-bottom: 0;
  }
  .table-container table td::before {
    content: attr(data-label);
    display: block;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 11px;
    color: #6c757d;
    margin-bottom: 5px;
  }
  .actions-cell {
    padding-top: 15px;
    margin-top: 10px;
    border-top: 1px dotted #ccc;
  }
  .actions-cell::before {
    display: none;
  }
  .header {
    flex-direction: column;
    gap: 15px;
  }
  .modal-content {
    width: 95%;
    padding: 15px;
  }
  .form-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  .main-header {
    padding: 0 20px;
  }
  .main-nav {
    gap: 10px;
  }
}
</style>
