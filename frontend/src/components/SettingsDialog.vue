<script setup>
import { ref } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';

const visible = ref(false);

const open = () => {
    visible.value = true;
};

defineExpose({ open });
</script>

<template>
    <Dialog v-model:visible="visible" modal header="Storage Settings (Serverless)" :style="{ width: '50vw' }" :breakpoints="{ '960px': '75vw', '641px': '90vw' }">
        <div class="flex flex-col gap-4">
            <p class="text-sm text-gray-400">Specify the absolute path where audio files will be saved and read from. (deve ser do bucket)</p>
            
            <div class="flex flex-col gap-2">
                <label for="path" class="font-semibold text-gray-200">Google Cloud Storage Bucket</label>
                <div class="flex gap-2">
                     <InputText id="path" value="gs://sonic-stream-storage/" class="flex-1 opacity-75 bg-surface-800" readonly />
                </div>
            </div>

            <div class="p-4 bg-blue-900/30 border border-blue-500/30 rounded-lg mt-2">
                <p class="text-sm text-blue-200">
                    <i class="pi pi-info-circle mr-2"></i>
                    This instance is running in Serverless Mode on Google Cloud Platform. File saving and folder browsing are disabled as all processing is done in-memory and synced directly.
                </p>
            </div>
        </div>
    </Dialog>
</template>
