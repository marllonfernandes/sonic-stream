<script setup>
import { ref } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Message from 'primevue/message';
import DirectoryBrowser from './DirectoryBrowser.vue';

const visible = ref(false);
const showBrowser = ref(false);
const path = ref('');
const loading = ref(false);
const error = ref('');

const open = async () => {
    visible.value = true;
    error.value = '';
    await loadConfig();
};

const loadConfig = async () => {
    try {
        const res = await fetch('/api/config/path');
        const data = await res.json();
        path.value = data.path;
    } catch (e) {
        error.value = 'Failed to load configuration';
    }
};

const saveConfig = async () => {
    loading.value = true;
    error.value = '';
    try {
        const res = await fetch('/api/config/path', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: path.value })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save');
        visible.value = false;
        // Reload page to reflect changes
        window.location.reload();
    } catch (e) {
        error.value = e.message;
    } finally {
        loading.value = false;
    }
};

const handleDirectorySelect = (newPath) => {
    path.value = newPath;
    showBrowser.value = false;
};

defineExpose({ open });
</script>

<template>
    <Dialog v-model:visible="visible" modal header="Download Settings" :style="{ width: '50vw' }" :breakpoints="{ '960px': '75vw', '641px': '90vw' }">
        <div class="flex flex-col gap-4">
            <p class="text-sm text-gray-400">Specify the absolute path where audio files will be saved and read from.</p>
            
            <div class="flex flex-col gap-2">
                <label for="path" class="font-semibold text-gray-200">Download Path</label>
                <div class="flex gap-2">
                     <InputText id="path" v-model="path" class="flex-1" />
                     <Button icon="pi pi-folder-open" @click="showBrowser = true" v-tooltip="'Browse Directories'" />
                </div>
            </div>

            <Message v-if="error" severity="error">{{ error }}</Message>

            <div class="flex justify-end gap-2 mt-4">
                <Button label="Cancel" severity="secondary" @click="visible = false" />
                <Button label="Save Path" @click="saveConfig" :loading="loading" />
            </div>
        </div>
    </Dialog>

    <DirectoryBrowser 
        v-model:visible="showBrowser" 
        :initial-path="path"
        @select="handleDirectorySelect"
    />
</template>
