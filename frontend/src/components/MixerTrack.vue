<script setup>
import { computed } from 'vue';
import Button from 'primevue/button';
import Slider from 'primevue/slider';

const props = defineProps({
    stem: {
        type: String,
        required: true // 'vocals', 'drums', 'bass', 'piano', 'other'
    },
    volume: {
        type: Number,
        default: 100
    },
    isMuted: Boolean,
    isSolo: Boolean
});

const emit = defineEmits(['update:volume', 'update:mute', 'update:solo']);

const icon = computed(() => {
    const map = {
        'vocals': 'pi pi-microphone',
        'drums': 'pi pi-server',
        'bass': 'pi pi-bolt',
        'piano': 'pi pi-table',
        'other': 'pi pi-box'
    };
    return map[props.stem.toLowerCase()] || 'pi pi-file';
});

const colorClass = computed(() => {
    const map = {
        'vocals': 'bg-teal-500',
        'drums': 'bg-blue-500',
        'bass': 'bg-purple-500',
        'piano': 'bg-yellow-500',
        'other': 'bg-green-500'
    };
    return map[props.stem.toLowerCase()] || 'bg-gray-500';
});
</script>

<template>
    <div
        class="h-full flex flex-col items-center gap-3 pt-4 pb-4 min-w-[80px] w-24 bg-moises-surface/40 backdrop-blur-sm rounded-2xl border border-white/5 hover:border-white/10 transition-all group">

        <!-- Track Icon -->
        <div class="flex flex-col items-center justify-center text-gray-400 gap-1 mt-2">
            <div class="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center shadow-inner">
                <i :class="icon" class="text-lg group-hover:text-white transition-colors"></i>
            </div>
            <span class="text-[10px] uppercase font-bold tracking-wider opacity-60">{{ stem.substring(0, 3) }}</span>
        </div>

        <!-- Volume Slider (Vertical) -->
        <div class="flex-1 w-full flex justify-center py-2 relative">
            <Slider :modelValue="volume" @update:modelValue="$emit('update:volume', $event)" orientation="vertical"
                :min="0" :max="100" class="h-full" :pt="{
                    root: { class: 'w-1.5 bg-black/40 rounded-full h-full border border-white/5' },
                    range: { class: colorClass },
                    handle: { class: 'w-4 h-4 bg-white rounded-full shadow-lg border-2 border-transparent hover:border-white transition-all transform hover:scale-125 focus:outline-none -ml-[5px]' }
                }" />
        </div>

        <!-- Mute/Solo Buttons -->
        <div class="flex flex-row gap-2 mb-2">
            <button @click="$emit('update:solo', !isSolo)"
                class="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all"
                :class="isSolo ? 'bg-yellow-500 border-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'border-gray-700 text-gray-500 hover:border-gray-500 bg-black/20'">S</button>
            <button @click="$emit('update:mute', !isMuted)"
                class="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all"
                :class="isMuted ? 'bg-red-500 border-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'border-gray-700 text-gray-500 hover:border-gray-500 bg-black/20'">M</button>
        </div>

    </div>
</template>

<style scoped>
/* Custom styles if needed */
</style>
