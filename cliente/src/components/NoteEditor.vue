<template>
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="p-6 border-b border-gray-200">
        <h2 class="text-2xl font-bold text-gray-900">
          {{ editing ? 'Editar nota' : 'Nueva nota' }}
        </h2>
        
        <!-- ID: editable SOLO en creación -->
        <div class="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            ID Nota {{ editing ? '(Solo lectura)' : '(Editable)' }}
          </label>
          <input 
            v-model="localNote.noteId"
            :readonly="editing"
            type="text" 
            class="w-full p-3 border border-gray-300 rounded-lg text-lg font-semibold bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            :class="{ 'bg-gray-100 cursor-not-allowed': editing }"
            placeholder="nota1, nota2, mi-nota..."
            required
          />
          <p v-if="!editing" class="text-xs text-gray-500 mt-1">ID único para tu nota</p>
          <p v-else class="text-xs text-gray-500 mt-1">Clave única DynamoDB</p>
        </div>
      </div>
      
      <!-- Formulario con título y contenido -->
      <form @submit.prevent="handleSubmit" class="p-6">
        <div class="space-y-4">
          <!-- Campo Título -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Título</label>
            <input
              v-model="localNote.title"
              type="text"
              class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Título de la nota"
              required
            />
          </div>

          <!-- Campo Contenido -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Contenido</label>
            <textarea 
              v-model="localNote.content"
              rows="6"
              class="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-vertical"
              placeholder="Escribe tu nota aquí..."
              required
            ></textarea>
          </div>
          
          <div class="flex gap-3 pt-2">
            <button 
              type="submit" 
              class="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:bg-indigo-400"
              :disabled="!isValid"
            >
              {{ editing ? '✏️ Actualizar' : '➕ Crear' }}
            </button>
            <button 
              type="button"
              @click="$emit('cancel')"
              class="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  note: { type: Object, default: () => ({}) }
});
const emit = defineEmits(['save', 'cancel']);

const editing = computed(() => !!props.note.noteId);
const localNote = ref({ 
  noteId: '', 
  title: '',
  content: '' 
});

// Cargar datos cuando la nota cambia (edición) o limpiar (creación)
watch(() => props.note, (note) => {
  if (note?.noteId) {
    localNote.value = {
      noteId: note.noteId,
      title: note.title || '',
      content: note.content || ''
    };
  } else {
    localNote.value = { noteId: '', title: '', content: '' };
  }
}, { immediate: true });

const isValid = computed(() => 
  localNote.value.noteId.trim() && 
  localNote.value.title.trim() &&
  localNote.value.content.trim()
);

const handleSubmit = () => {
  if (isValid.value) {
    emit('save', { ...localNote.value });
  }
};
</script>