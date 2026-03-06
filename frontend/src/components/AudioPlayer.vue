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
const audioContext = ref(null);
const audioBuffers = ref({}); // { trackId: AudioBuffer }
const sourceNodes = ref({}); // { trackId: AudioBufferSourceNode }
const gainNodes = ref({}); // { trackId: GainNode }
const masterGain = ref(null);

const currentTime = ref(0);
const duration = ref(0);
const loading = ref(false);
const chords = ref(null);
const chordsLoading = ref(false);

const startTime = ref(0); // context time when play was clicked
const offsetTime = ref(0); // time into the song in seconds
const timerId = ref(null);

const stemVolumes = ref({}); // { vocals: 100, drums: 100, ... }
const stemMuted = ref({}); // { vocals: false, ... }
const stemSolo = ref({}); // { vocals: false, ... }

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
const initAudioContext = () => {
    if (!audioContext.value) {
        audioContext.value = new (window.AudioContext || window.webkitAudioContext)();
        masterGain.value = audioContext.value.createGain();
        masterGain.value.connect(audioContext.value.destination);
    }
};

const fetchAudioBuffer = async (url) => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await audioContext.value.decodeAudioData(arrayBuffer);
};

const loadAudio = async (file) => {
    loading.value = true;
    initAudioContext();
    try {
        const tracksToLoad = [];
        if (file.hasStems && file.stems) {
            file.stems.forEach(s => {
                const name = s.replace('.wav', '');
                tracksToLoad.push({ id: name, url: `/api/stems/${encodeURIComponent(file.stemFolder)}/${s}` });
            });
        } else {
            tracksToLoad.push({ id: 'original', url: file.url });
        }

        const promises = tracksToLoad.map(async (t) => {
            const buffer = await fetchAudioBuffer(t.url);
            audioBuffers.value[t.id] = buffer;
            
            const gain = audioContext.value.createGain();
            gain.connect(masterGain.value);
            gainNodes.value[t.id] = gain;
            
            stemVolumes.value[t.id] = 80;
            stemMuted.value[t.id] = false;
            stemSolo.value[t.id] = false;
        });

        await Promise.all(promises);
        
        const firstBuffer = Object.values(audioBuffers.value)[0];
        duration.value = firstBuffer ? firstBuffer.duration : 0;
        
        updateAllVolumes();
    } catch (e) {
        console.error("Failed to load audio with Web Audio API", e);
    } finally {
        loading.value = false;
    }
};

const stopSourceNodes = () => {
    Object.values(sourceNodes.value).forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    sourceNodes.value = {};
};

const startTimer = () => {
    stopTimer();
    const update = () => {
        if (!props.isPlaying) return;
        const elapsed = audioContext.value.currentTime - startTime.value;
        currentTime.value = Math.min(offsetTime.value + elapsed, duration.value);
        
        if (currentTime.value >= duration.value) {
            emit('update:isPlaying', false);
            stopTimer();
        } else {
            timerId.value = requestAnimationFrame(update);
        }
    };
    timerId.value = requestAnimationFrame(update);
};

const stopTimer = () => {
    if (timerId.value) {
        cancelAnimationFrame(timerId.value);
        timerId.value = null;
    }
};

const play = async () => {
    if (!audioContext.value) return;
    try {
        if (audioContext.value.state === 'suspended') {
            await audioContext.value.resume();
        }
        
        stopSourceNodes();
        
        const now = audioContext.value.currentTime;
        startTime.value = now;
        
        Object.keys(audioBuffers.value).forEach(id => {
            const source = audioContext.value.createBufferSource();
            source.buffer = audioBuffers.value[id];
            source.connect(gainNodes.value[id]);
            source.start(0, offsetTime.value);
            sourceNodes.value[id] = source;
        });
        
        startTimer();
        emit('update:isPlaying', true);
    } catch (e) {
        console.error("Play error", e);
    }
};

const pause = () => {
    if (!audioContext.value) return;
    const elapsed = audioContext.value.currentTime - startTime.value;
    offsetTime.value = Math.min(offsetTime.value + elapsed, duration.value);
    
    stopSourceNodes();
    stopTimer();
    emit('update:isPlaying', false);
};

const stopAll = () => {
    pause();
    audioBuffers.value = {};
    gainNodes.value = {};
    sourceNodes.value = {};
    currentTime.value = 0;
    duration.value = 0;
    offsetTime.value = 0;
};

const seek = (time) => {
    const wasPlaying = props.isPlaying;
    if (wasPlaying) {
        stopSourceNodes();
        stopTimer();
    }
    
    offsetTime.value = time;
    currentTime.value = time;
    
    if (wasPlaying) {
        play();
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
    Object.keys(gainNodes.value).forEach(id => applyVolume(id));
};

const applyVolume = (id) => {
    if (!gainNodes.value[id] || !audioContext.value) return;

    const vol = stemVolumes.value[id] / 100;
    const isMuted = stemMuted.value[id];
    const isSolo = stemSolo.value[id];

    // Check if ANY track is soloed
    const anySolo = Object.values(stemSolo.value).some(s => s);

    let finalVol = vol;

    if (isMuted) {
        finalVol = 0;
    } else if (anySolo) {
        if (!isSolo) {
            finalVol = 0;
        }
    }

    // Smooth transition
    gainNodes.value[id].gain.setTargetAtTime(finalVol, audioContext.value.currentTime, 0.02);
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

            <!-- Tracks Container -->
            <div
                class="w-full flex-1 flex items-end justify-center gap-1 sm:gap-2 md:gap-4 pb-4 py-8">
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
