<script setup>
import { useToast } from '../composables/useToast.js';

const { toasts, remove } = useToast();
</script>

<template>
  <div class="toast-container" aria-live="polite">
    <transition-group name="toast" tag="div">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast--${toast.type}`"
        role="status"
        @click="remove(toast.id)"
      >
        <span class="toast-icon" aria-hidden="true">
          <template v-if="toast.type === 'success'">✓</template>
          <template v-else-if="toast.type === 'error'">!</template>
          <template v-else-if="toast.type === 'warning'">⚠</template>
          <template v-else>i</template>
        </span>
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" @click.stop="remove(toast.id)" aria-label="Zamknij">×</button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 260px;
  max-width: 380px;
  padding: 12px 14px;
  background-color: #fff;
  border-left: 4px solid #6c757d;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  font-size: 14px;
  color: #2c3e50;
  cursor: pointer;
}
.toast--success {
  border-left-color: #28a745;
}
.toast--error {
  border-left-color: #dc3545;
}
.toast--warning {
  border-left-color: #ffc107;
}
.toast--info {
  border-left-color: #007bff;
}
.toast-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: #f1f3f5;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}
.toast--success .toast-icon {
  background-color: #d4edda;
  color: #155724;
}
.toast--error .toast-icon {
  background-color: #f8d7da;
  color: #721c24;
}
.toast--warning .toast-icon {
  background-color: #fff3cd;
  color: #856404;
}
.toast--info .toast-icon {
  background-color: #d1ecf1;
  color: #0c5460;
}
.toast-message {
  flex: 1;
  line-height: 1.35;
  word-break: break-word;
}
.toast-close {
  background: none;
  border: 0;
  color: #6c757d;
  font-size: 20px;
  padding: 0 4px;
  cursor: pointer;
  line-height: 1;
}
.toast-close:hover {
  color: #2c3e50;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

@media screen and (max-width: 600px) {
  .toast-container {
    top: 70px;
    right: 10px;
    left: 10px;
  }
  .toast {
    min-width: 0;
    max-width: 100%;
  }
}
</style>
