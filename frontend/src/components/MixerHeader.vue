<script setup>
import { computed, ref } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Slider from 'primevue/slider';

const props = defineProps({
    title: {
        type: String,
        default: 'Unknown Track'
    },
    artist: {
        type: String,
        default: 'Unknown Artist'
    }
});

const emit = defineEmits(['back', 'refresh']);

const pitchVisible = ref(false);
const semitones = ref(0);
const isProcessing = ref(false);

const applyPitch = async () => {
    if (isProcessing.value) return;
    isProcessing.value = true;
    try {
        const response = await fetch('/api/process/pitch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: props.title,
                semitones: semitones.value
            })
        });

        if (!response.ok) throw new Error('Pitch shift failed');

        pitchVisible.value = false;
        emit('refresh');
    } catch (error) {
        console.error(error);
        alert('Failed to apply pitch shift');
    } finally {
        isProcessing.value = false;
    }
};

</script>

<template>
    <div class="w-full flex flex-col gap-2 sm:gap-4 p-2 sm:p-4 mt-2 sm:mt-0">
        <!-- Top Bar -->
        <div class="flex items-center justify-between text-gray-400 gap-1 w-full">
            <Button icon="pi pi-chevron-down" text rounded severity="secondary" @click="$emit('back')" class="!w-8 !h-8 !p-0 sm:!w-10 sm:!h-10 shrink-0" />
            <div class="flex flex-col items-center flex-1 max-w-[50%] md:max-w-[60%] mx-auto overflow-hidden">
                <h2 class="text-white font-medium text-sm md:text-base truncate w-full text-center">{{ title }}</h2>
                <!-- <span class="text-xs">{{ artist }}</span> -->
            </div>
            <div class="flex gap-1">
                <Button icon="pi pi-sort-alt" text rounded severity="secondary" @click="pitchVisible = true"
                    v-tooltip="'Pitch Shift'" class="!w-8 !h-8 !p-0 sm:!w-10 sm:!h-10" />
                <Button icon="pi pi-refresh" text rounded severity="secondary" @click="$emit('refresh')" class="!w-8 !h-8 !p-0 sm:!w-10 sm:!h-10" />
                <Button icon="pi pi-download" text rounded severity="secondary" class="!w-8 !h-8 !p-0 sm:!w-10 sm:!h-10" />
                <Button icon="pi pi-bars" text rounded severity="secondary" class="!w-8 !h-8 !p-0 sm:!w-10 sm:!h-10" />
            </div>
        </div>

        <!-- Pitch Dialog -->
        <Dialog v-model:visible="pitchVisible" modal header="Adjust Pitch" :style="{ width: '25rem' }" class="p-fluid">
            <div class="flex flex-col gap-8 pt-4">
                <div class="flex flex-col items-center gap-2">
                    <span class="text-4xl font-bold text-primary">{{ semitones > 0 ? '+' : '' }}{{ semitones }}</span>
                    <span class="text-sm text-gray-400">Semitones</span>
                </div>

                <Slider v-model="semitones" :min="-12" :max="12" :step="1" class="w-full" />

                <div class="flex justify-end gap-2 mt-4">
                    <Button label="Cancel" text severity="secondary" @click="pitchVisible = false" />
                    <Button label="Create Copy" icon="pi pi-check" @click="applyPitch" :loading="isProcessing" />
                </div>
            </div>
        </Dialog>
    </div>
</template>
