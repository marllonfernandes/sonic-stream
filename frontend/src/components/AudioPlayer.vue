<script setup>
import { ref, watch, onMounted, computed, onUnmounted } from 'vue';
import MixerHeader from './MixerHeader.vue';
import MixerTrack from './MixerTrack.vue';
import MixerControls from './MixerControls.vue';

const props = defineProps({
    file: {
        type: Object,
        default: null
    },
    isPlaying: Boolean
});

const emit = defineEmits(['update:isPlaying', 'next', 'prev', 'back']);

// State
const audio = ref(null); // Single track fallback
const stems = ref({}); // { vocals: Audio, drums: Audio, ... }
const stemVolumes = ref({}); // { vocals: 100, drums: 100, ... }
const stemMuted = ref({}); // { vocals: false, ... }
const stemSolo = ref({}); // { vocals: false, ... }

const currentTime = ref(0);
const duration = ref(0);
const loading = ref(false);
const chords = ref(null);
const chordsLoading = ref(false);

const currentChord = computed(() => {
    if (!chords.value) return null;
    const time = currentTime.value;
    const found = chords.value.find(c => time >= c.start && time < c.end);
    return found ? found.chord : '-';
});

const fetchChords = async () => {
    if (!props.file) return;
    try {
        const response = await fetch(`/api/chords/${encodeURIComponent(props.file.name)}`);
        if (response.ok) {
            chords.value = await response.json();
        } else {
            chords.value = null;
        }
    } catch(e) {
        console.error("Failed to load chords", e);
        chords.value = null;
    }
};

const extractChords = async () => {
    chordsLoading.value = true;
    try {
        const response = await fetch('/api/process/chords', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: props.file.name })
        });
        if (response.ok) {
            const result = await response.json();
            chords.value = result.data;
        } else {
            console.error('Failed to extract chords');
        }
    } catch(e) {
        console.error('Extraction error', e);
    } finally {
        chordsLoading.value = false;
    }
};

// Computed
const hasStems = computed(() => props.file?.hasStems);
const tracks = computed(() => {
    if (!props.file) return [];

    if (hasStems.value && props.file.stems) {
        // Sort stems to consistent order if needed
        // Expected: vocals, drums, bass, piano, other
        const order = ['vocals.wav', 'drums.wav', 'bass.wav', 'piano.wav', 'other.wav'];
        const files = [...props.file.stems].sort((a, b) => {
            return order.indexOf(a) - order.indexOf(b);
        });

        return files.map(f => {
            const name = f.replace('.wav', '');
            return {
                id: name,
                name: name,
                stem: true
            };
        });
    } else {
        return [{ id: 'original', name: 'Original Mix', stem: false }];
    }
});

// Watchers
watch(() => props.file, async (newFile) => {
    stopAll();
    if (newFile) {
        await loadAudio(newFile);
        await fetchChords();
        if (props.isPlaying) play();
    }
});

watch(() => props.isPlaying, (val) => {
    if (val) play();
    else pause();
});

onMounted(async () => {
    if (props.file) {
        await loadAudio(props.file);
        await fetchChords();
        if (props.isPlaying) play();
    }
});

// Methods
const loadAudio = async (file) => {
    loading.value = true;
    try {
        if (file.hasStems && file.stems) {
            // Load Stems
            const stemObj = {};
            const volObj = {};
            const muteObj = {};
            const soloObj = {};

            // We need to load at least one to get duration
            const promises = file.stems.map(async (stemFile) => {
                const name = stemFile.replace('.wav', '');
                const url = `/api/stems/${encodeURIComponent(file.stemFolder)}/${stemFile}`;
                const audioEl = new Audio(url);
                stemObj[name] = audioEl;
                volObj[name] = 80; // Default volume
                muteObj[name] = false;
                soloObj[name] = false;

                // Preload
                audioEl.preload = 'metadata';
            });

            await Promise.all(promises);

            stems.value = stemObj;
            stemVolumes.value = volObj;
            stemMuted.value = muteObj;
            stemSolo.value = soloObj;

            // Setup listeners on the first stem (usually vocals)
            const leader = Object.values(stems.value)[0];
            if (leader) setupListeners(leader);

        } else {
            // Single file
            audio.value = new Audio(file.url);
            setupListeners(audio.value);
            stemVolumes.value = { original: 100 };
            stemMuted.value = { original: false };
            stemSolo.value = { original: false };
        }
    } catch (e) {
        console.error("Failed to load audio", e);
    } finally {
        loading.value = false;
    }
};

const setupListeners = (audioEl) => {
    audioEl.addEventListener('timeupdate', () => {
        currentTime.value = audioEl.currentTime;
    });
    audioEl.addEventListener('loadedmetadata', () => {
        duration.value = audioEl.duration;
    });
    audioEl.addEventListener('ended', () => {
        emit('update:isPlaying', false);
        // Reset or loop?
    });
};

const play = async () => {
    try {
        if (hasStems.value) {
            await Promise.all(Object.values(stems.value).map(s => s.play()));
        } else if (audio.value) {
            await audio.value.play();
        }
        emit('update:isPlaying', true);
    } catch (e) {
        console.error("Play error", e);
    }
};

const pause = () => {
    if (hasStems.value) {
        Object.values(stems.value).forEach(s => s.pause());
    } else if (audio.value) {
        audio.value.pause();
    }
    emit('update:isPlaying', false);
};

const stopAll = () => {
    pause();
    if (audio.value) {
        audio.value.src = '';
        audio.value = null;
    }
    stems.value = {};
    currentTime.value = 0;
    duration.value = 0;
};

const seek = (time) => {
    currentTime.value = time;
    if (hasStems.value) {
        Object.values(stems.value).forEach(s => s.currentTime = time);
    } else if (audio.value) {
        audio.value.currentTime = time;
    }
};

const updateVolume = (id, val) => {
    stemVolumes.value[id] = val;
    applyVolume(id);
};

const toggleMute = (id) => {
    stemMuted.value[id] = !stemMuted.value[id];
    applyVolume(id);
};

const toggleSolo = (id) => {
    // Exclusive solo logic for now (like Moises often feels) or additive
    // Let's do additive to match standard mixers
    stemSolo.value[id] = !stemSolo.value[id];
    updateAllVolumes();
};

const updateAllVolumes = () => {
    if (hasStems.value) {
        Object.keys(stems.value).forEach(id => applyVolume(id));
    } else {
        applyVolume('original');
    }
};

const applyVolume = (id) => {
    const vol = stemVolumes.value[id] / 100;
    const isMuted = stemMuted.value[id];
    const isSolo = stemSolo.value[id];

    // Check if ANY track is soloed
    const anySolo = Object.values(stemSolo.value).some(s => s);

    let finalVol = vol;

    if (isMuted) {
        finalVol = 0;
    } else if (anySolo) {
        // If there are solo tracks, and this one IS NOT soloed, mute it
        if (!isSolo) {
            finalVol = 0;
        }
    }

    if (hasStems.value && stems.value[id]) {
        stems.value[id].volume = finalVol;
    } else if (id === 'original' && audio.value) {
        audio.value.volume = finalVol;
    }
};

onUnmounted(() => {
    stopAll();
});
</script>

<template>
    <div v-if="file" class="fixed inset-0 bg-moises-bg flex flex-col z-50">

        <!-- Header -->
        <MixerHeader :title="file.name" :artist="'Unknown Artist'" @back="$emit('back')" class="z-10" />

        <!-- Main Studio Area -->
        <div
            class="flex-1 flex flex-col items-center justify-between w-full max-w-6xl mx-auto px-4 pb-4 overflow-hidden relative">

            <!-- Waveform Visualization (Mock) -->
            <div class="w-full h-32 md:h-48 mt-8 flex flex-col items-center justify-center relative">
                
                <!-- Chords display -->
                <div v-if="chords" class="z-20 mb-2 min-h-[60px] flex items-center justify-center">
                    <div class="text-4xl md:text-5xl font-black text-moises-accent drop-shadow-md text-center min-w-[3em] transition-all">
                        {{ currentChord }}
                    </div>
                </div>
                <div v-else class="z-20 mb-2 min-h-[60px] flex items-center justify-center">
                    <button @click="extractChords" :disabled="chordsLoading" class="px-4 py-2 bg-moises-surface border border-moises-border rounded-full text-white text-sm hover:bg-moises-accent hover:border-moises-accent transition-colors disabled:opacity-50">
                        <i v-if="chordsLoading" class="pi pi-spinner pi-spin mr-2"></i>
                        {{ chordsLoading ? 'Extracting...' : 'Detect Chords' }}
                    </button>
                </div>

                <div class="absolute inset-0 flex items-center gap-[4px] opacity-30 mt-16">
                    <div v-for="n in 100" :key="n" class="flex-1 bg-moises-accent rounded-full animate-pulse" :style="{
                        height: Math.max(10, Math.random() * 100) + '%',
                        animationDelay: `${n * 0.05}s`
                    }"></div>
                </div>

                <!-- Time Display Huge -->
                <div class="z-10 text-6xl font-black text-white mix-blend-overlay tracking-widest font-mono">
                    {{ Math.floor(currentTime / 60) }}:{{ Math.floor(currentTime % 60).toString().padStart(2, '0') }}
                </div>
            </div>

            <!-- Tracks Container (Horizontal Scroll) -->
            <div
                class="w-full flex-1 flex items-end justify-center gap-2 md:gap-4 overflow-x-auto pb-4 scrollbar-hide mask-fade py-8">
                <template v-for="track in tracks" :key="track.id">
                    <MixerTrack :stem="track.name" :volume="stemVolumes[track.id]" :isMuted="stemMuted[track.id]"
                        :isSolo="stemSolo[track.id]" @update:volume="updateVolume(track.id, $event)"
                        @update:mute="toggleMute(track.id)" @update:solo="toggleSolo(track.id)" />
                </template>
            </div>

        </div>

        <!-- Footer Controls (Fixed) -->
        <div class="bg-moises-surface/80 backdrop-blur-xl border-t border-moises-border pb-safe">
            <MixerControls :isPlaying="isPlaying" :currentTime="currentTime" :duration="duration"
                @togglePlay="emit('update:isPlaying', !isPlaying)" @seek="seek" @prev="emit('prev')"
                @next="emit('next')" />
        </div>
    </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}

.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
}

.mask-fade {
    mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
}
</style>
