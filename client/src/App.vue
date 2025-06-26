<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
:root {
  --text-color: #2c3e50; --border-color: #e0e0e0; --background-light: #ffffff;
  --background-page: #f4f7f9; --header-background: #f8f9fa; --green: #28a745;
  --red: #dc3545; --blue: #007bff; --grey: #6c757d; --white: #fff;
  --shadow: 0 4px 12px rgba(0,0,0,0.08);
}
html {
  box-sizing: border-box;
}
*, *:before, *:after {
  box-sizing: inherit;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: var(--text-color);
  background-color: var(--background-page);
  margin: 0;
}
#app {
  /* ZMIANA: Usunięto display:flex, aby uniknąć problemów na niektórych widokach */
  width: 100%;
}
</style>