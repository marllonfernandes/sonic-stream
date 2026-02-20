<script setup>
import Button from 'primevue/button';
import { computed } from 'vue';

const props = defineProps({
    info: Object,
    loading: Boolean
});

const emit = defineEmits(['download']);
</script>

<template>
    <div class="relative w-full max-w-4xl p-1 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden group">
        <!-- Glow effect -->
        <div class="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

        <div class="relative flex flex-col md:flex-row bg-gray-900/40 rounded-xl overflow-hidden">
            <!-- Thumbnail -->
            <div class="md:w-2/5 h-64 md:h-auto relative overflow-hidden">
                <img :src="info.thumbnail" alt="Video Thumbnail" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                <div class="absolute bottom-4 left-4 text-white font-mono text-sm bg-black/60 px-2 py-1 rounded backdrop-blur-sm border border-white/10">
                    {{ info.duration }}
                </div>
            </div>

            <!-- Content -->
            <div class="md:w-3/5 p-8 flex flex-col justify-between backdrop-blur-sm">
                <div class="space-y-4">
                    <h2 class="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 line-clamp-2 leading-tight">
                        {{ info.title }}
                    </h2>
                    <div class="flex items-center gap-2 text-gray-400">
                        <i class="pi pi-user text-purple-400"></i>
                        <span class="font-medium tracking-wide">{{ info.channel }}</span>
                    </div>
                </div>

                <div class="mt-8 flex justify-end">
                    <Button 
                        @click="$emit('download')" 
                        :loading="loading"
                        label="Add to Library"
                        icon="pi pi-download"
                        class="!bg-gradient-to-r !from-purple-600 !to-blue-600 !border-0 hover:!from-purple-500 hover:!to-blue-500 !text-white !font-bold !px-8 !py-4 !rounded-xl !shadow-lg hover:!shadow-purple-500/30 transition-all transform hover:scale-105 active:scale-95"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
