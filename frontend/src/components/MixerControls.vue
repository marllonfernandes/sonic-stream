<script setup>
import { computed } from 'vue';
import Button from 'primevue/button';
import Slider from 'primevue/slider';

const props = defineProps({
    isPlaying: Boolean,
    currentTime: Number,
    duration: Number
});

const emit = defineEmits(['togglePlay', 'seek', 'next', 'prev']);

const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};
</script>

<template>
    <div class="w-full flex flex-col gap-2 sm:gap-4 p-3 sm:p-6 pt-1 sm:pt-2">

        <!-- Scrubber -->
        <div class="flex items-center gap-4 text-xs font-mono text-moises-secondary">
            <span>{{ formatTime(currentTime) }}</span>
            <Slider :modelValue="currentTime" :min="0" :max="duration || 100" @update:modelValue="$emit('seek', $event)"
                class="flex-1" :pt="{
                    root: { class: 'h-1.5 bg-moises-border rounded-full' },
                    range: { class: 'bg-moises-accent' },
                    handle: { class: 'hidden' } // Hide handle for cleaner look, or show on hover
                }" />
            <span>{{ formatTime(duration) }}</span>
        </div>

        <!-- Transport Controls -->
        <div class="flex items-center justify-between px-1 sm:px-4 mt-1 sm:mt-2">
            <!-- Left Options -->
            <div class="flex gap-1 sm:gap-4 hidden sm:flex">
                <Button icon="pi pi-replay" text rounded class="text-moises-secondary hover:text-white" />
                <Button icon="pi pi-metronome" text rounded class="text-moises-secondary hover:text-white" />
            </div>

            <!-- Main Controls -->
            <div class="flex items-center gap-4 sm:gap-8 mx-auto sm:mx-0">
                <Button icon="pi pi-step-backward" text rounded size="large"
                    class="text-moises-text hover:text-moises-accent transition-colors !p-2 sm:!p-3" @click="$emit('prev')" />

                <button
                    class="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-moises-accent text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                    @click="$emit('togglePlay')">
                    <i :class="isPlaying ? 'pi pi-pause' : 'pi pi-play'" class="text-xl sm:text-2xl"></i>
                </button>

                <Button icon="pi pi-step-forward" text rounded size="large"
                    class="text-moises-text hover:text-moises-accent transition-colors !p-2 sm:!p-3" @click="$emit('next')" />
            </div>

            <!-- Right Options -->
            <div class="flex gap-1 sm:gap-4 hidden sm:flex">
                <Button icon="pi pi-sliders-h" text rounded class="text-moises-secondary hover:text-white" />
            </div>
        </div>
    </div>
</template>
