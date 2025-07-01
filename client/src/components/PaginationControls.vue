<script setup>
import { computed } from 'vue';

const props = defineProps({
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
});

const emit = defineEmits(['page-changed']);

const pageNumbers = computed(() => {
  if (props.totalPages <= 7) {
    return Array.from({ length: props.totalPages }, (_, i) => i + 1);
  }

  const pages = new Set();
  pages.add(1);
  pages.add(props.totalPages);

  for (let i = -1; i <= 1; i++) {
    const page = props.currentPage + i;
    if (page > 1 && page < props.totalPages) {
      pages.add(page);
    }
  }

  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const result = [];
  let lastPage = 0;

  for (const page of sortedPages) {
    if (lastPage !== 0 && page - lastPage > 1) {
      result.push('...');
    }
    result.push(page);
    lastPage = page;
  }

  return result;
});

function changePage(page) {
  if (page >= 1 && page <= props.totalPages) {
    emit('page-changed', page);
  }
}
</script>

<template>
  <div v-if="totalPages > 1" class="pagination-controls">
    <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1">&laquo;</button>
    <button v-for="(page, index) in pageNumbers" :key="index" :class="{ active: page === currentPage, dots: page === '...' }" :disabled="page === '...'" @click="changePage(page)">
      {{ page }}
    </button>
    <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages">&raquo;</button>
  </div>
</template>

<style scoped>
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1.5rem;
  gap: 5px;
  user-select: none;
}
.pagination-controls button {
  min-width: 40px;
  height: 40px;
  padding: 0 10px;
  margin: 0;
  border: 1px solid var(--border-color);
  background-color: var(--background-light);
  color: var(--blue);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}
.pagination-controls button:hover:not(:disabled) {
  background-color: #e9ecef;
  border-color: #dee2e6;
}
.pagination-controls button:disabled:not(.dots) {
  cursor: not-allowed;
  opacity: 0.5;
}
.pagination-controls button.active {
  background-color: var(--blue);
  color: white;
  border-color: var(--blue);
  font-weight: bold;
}
.pagination-controls button.dots {
  border: none;
  background: none;
}
</style>
