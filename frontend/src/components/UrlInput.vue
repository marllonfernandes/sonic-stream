<script setup>
import { ref } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';

const url = ref('');
const emit = defineEmits(['search']);

const handleSubmit = () => {
    if (url.value) {
        emit('search', url.value);
    }
};

const handlePaste = async () => {
    try {
        const text = await navigator.clipboard.readText();
        url.value = text;
    } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
    }
};
</script>

<template>
  <div class="w-full max-w-2xl relative group mx-auto">
    <div class="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
    
    <div class="relative bg-gray-900 ring-1 ring-gray-800 rounded-2xl p-2 flex items-center gap-2 shadow-2xl">
        <div class="flex-1 relative">
             <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 z-10 transition-colors group-focus-within:text-purple-400"></i>
             <InputText 
                v-model="url" 
                placeholder="Paste YouTube URL here..." 
                class="w-full !pl-12 !pr-4 !py-4 !bg-transparent !border-0 !shadow-none !text-white !text-lg placeholder:!text-gray-600 focus:!ring-0"
                @keydown.enter="handleSubmit"
            />
        </div>

        <div class="flex items-center items-stretch gap-2 pr-2">
            <Button 
                v-if="!url"
                @click="handlePaste"
                icon="pi pi-clipboard" 
                label="Paste"
                class="!bg-gray-800 !text-gray-300 !border-0 hover:!bg-gray-700 !px-6 !rounded-xl"
            />
            
            <Button 
                v-else
                @click="handleSubmit"
                icon="pi pi-arrow-right" 
                label="Process"
                class="!bg-gradient-to-r !from-purple-600 !to-pink-600 hover:!from-purple-500 hover:!to-pink-500 !border-0 !text-white !font-bold !px-8 !rounded-xl shadow-lg shadow-purple-900/20"
            />
        </div>
    </div>
  </div>
</template>
