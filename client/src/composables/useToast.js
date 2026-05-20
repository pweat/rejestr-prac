import { reactive } from 'vue';

const state = reactive({
  toasts: [],
});

let idCounter = 0;

function remove(id) {
  const idx = state.toasts.findIndex((t) => t.id === id);
  if (idx !== -1) state.toasts.splice(idx, 1);
}

function push(message, type = 'info', timeout = 4000) {
  const id = ++idCounter;
  const toast = { id, message, type };
  state.toasts.push(toast);
  if (timeout > 0) {
    setTimeout(() => remove(id), timeout);
  }
  return id;
}

export function useToast() {
  return {
    toasts: state.toasts,
    success: (msg, timeout) => push(msg, 'success', timeout),
    error: (msg, timeout) => push(msg, 'error', timeout ?? 6000),
    info: (msg, timeout) => push(msg, 'info', timeout),
    warn: (msg, timeout) => push(msg, 'warning', timeout),
    remove,
  };
}
