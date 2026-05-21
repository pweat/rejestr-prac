<script setup>
import { ref, watch, onMounted } from 'vue';
import { sanitizeOfferItemHtml } from '../utils/offerRichText.js';

const model = defineModel({ type: String, default: '' });

const editorRef = ref(null);

function syncFromModel() {
  if (!editorRef.value) return;
  const safe = sanitizeOfferItemHtml(model.value || '');
  if (editorRef.value.innerHTML !== safe) {
    editorRef.value.innerHTML = safe || '';
  }
}

function onInput() {
  if (!editorRef.value) return;
  model.value = sanitizeOfferItemHtml(editorRef.value.innerHTML);
}

function exec(cmd) {
  document.execCommand(cmd, false, null);
  editorRef.value?.focus();
  onInput();
}

function insertLineBreak() {
  document.execCommand('insertLineBreak', false, null);
  editorRef.value?.focus();
  onInput();
}

watch(model, syncFromModel);
onMounted(syncFromModel);
</script>

<template>
  <div class="offer-item-name-editor">
    <div class="offer-item-name-toolbar">
      <button type="button" class="fmt-btn" title="Pogrubienie" @click="exec('bold')"><strong>B</strong></button>
      <button type="button" class="fmt-btn" title="Kursywa" @click="exec('italic')"><em>I</em></button>
      <button type="button" class="fmt-btn" title="Nowa linia" @click="insertLineBreak">↵</button>
    </div>
    <div
      ref="editorRef"
      class="offer-item-name-field"
      contenteditable="true"
      @input="onInput"
      @blur="onInput"
    ></div>
  </div>
</template>

<style scoped>
.offer-item-name-editor {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.offer-item-name-toolbar {
  display: flex;
  gap: 4px;
}

.fmt-btn {
  min-width: 28px;
  height: 26px;
  padding: 0 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-light-secondary);
  cursor: pointer;
  font-size: 12px;
}

.fmt-btn:hover {
  background: #e8eef3;
}

.offer-item-name-field {
  min-height: 52px;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.4;
  background: #fff;
  outline: none;
}

.offer-item-name-field:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.15);
}
</style>
