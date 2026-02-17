<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
    <header class="max-w-6xl mx-auto mb-8">
      <h1 class="text-4xl font-bold text-gray-900 mb-2">Mis Notas AWS</h1>
      <p class="text-xl text-gray-600">CRUD + Procesar con Translate/Polly/S3</p>
    </header>
    
    <main class="max-w-6xl mx-auto">
      <NotesGrid />
    </main>
  </div>
</template>

<script setup>
import NotesGrid from '@/components/NotesGrid.vue';
</script>
