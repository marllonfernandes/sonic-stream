<script setup>
import { ref, onMounted } from 'vue';
import Button from 'primevue/button';
import UrlInput from './components/UrlInput.vue';
import VideoCard from './components/VideoCard.vue';
import LoadingSpinner from './components/LoadingSpinner.vue';
import SettingsDialog from './components/SettingsDialog.vue';
import AudioLibrary from './components/AudioLibrary.vue';
import AudioPlayer from './components/AudioPlayer.vue';

const videoInfo = ref(null);
const loading = ref(false);
const downloading = ref(false);
const error = ref(null);
const currentUrl = ref('');
const settingsRef = ref(null);
const files = ref([]);
const currentFile = ref(null);
const isPlaying = ref(false);

const fetchInfo = async (url) => {
    loading.value = true;
    error.value = null;
    videoInfo.value = null;
    currentUrl.value = url;

    try {
        const response = await fetch('/api/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        if (!response.ok) throw new Error('Failed to fetch video info');

        videoInfo.value = await response.json();
    } catch (err) {
        error.value = err.message || 'Something went wrong';
    } finally {
        loading.value = false;
    }
};

const handleDownload = async () => {
    if (!currentUrl.value) return;
    downloading.value = true;

    try {
        const res = await fetch(`/api/download?url=${encodeURIComponent(currentUrl.value)}`);
        if (res.ok) {
            await fetchFiles();
        }

    } catch (err) {
        error.value = "Download failed to start";
    } finally {
        downloading.value = false;
        await fetchFiles();
    }
}

const fetchFiles = async () => {
    try {
        const res = await fetch('/api/files');
        if (res.ok) {
            files.value = await res.json();
        }
    } catch (e) {
        console.error("Failed to list files", e);
    }
};

const playNext = () => {
    if (!currentFile.value || files.value.length === 0) return;
    const idx = files.value.findIndex(f => f.path === currentFile.value.path);
    if (idx === -1 || idx === files.value.length - 1) return;
    playFile(files.value[idx + 1]);
};

const playPrev = () => {
    if (!currentFile.value || files.value.length === 0) return;
    const idx = files.value.findIndex(f => f.path === currentFile.value.path);
    if (idx === -1 || idx === 0) return;
    playFile(files.value[idx - 1]);
};

const playFile = (file) => {
    if (currentFile.value?.path === file.path) {
        if (!isPlaying.value) isPlaying.value = true;
    } else {
        currentFile.value = file;
        isPlaying.value = true;
    }
};

onMounted(() => {
    fetchFiles();
});
</script>

<template>
    <div class="h-screen w-screen bg-moises-bg text-moises-text flex flex-col overflow-hidden relative font-sans">

        <!-- Top Bar -->
        <header
            class="h-16 flex items-center justify-between px-6 border-b border-moises-border bg-moises-surface/50 backdrop-blur-md z-10 shrink-0">
            <div class="flex items-center gap-3">
                <div
                    class="w-8 h-8 rounded-lg bg-gradient-to-br from-moises-accent to-purple-600 flex items-center justify-center shadow-lg shadow-moises-accent/20">
                    <i class="pi pi-wave-pulse text-white text-lg"></i>
                </div>
                <h1 class="font-bold text-xl tracking-tight">SonicStream</h1>
            </div>
            <Button icon="pi pi-cog" text rounded class="text-moises-secondary hover:text-white transition-colors"
                @click="settingsRef.open()" />
        </header>

        <!-- Main Content Area (Scrollable) -->
        <main class="flex-1 overflow-y-auto overflow-x-hidden p-6 relative">
            <div class="max-w-5xl mx-auto space-y-12 pb-32">

                <!-- Hero / Input Section -->
                <section class="flex flex-col items-center gap-6 mt-8">
                    <div class="text-center space-y-2">
                        <h2
                            class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Import Audio
                        </h2>
                        <p class="text-moises-secondary text-sm">Paste a YouTube link to separate stems</p>
                    </div>

                    <div class="w-full max-w-2xl">
                        <UrlInput @search="fetchInfo" />
                    </div>

                    <!-- Status States -->
                    <div v-if="loading" class="mt-4">
                        <LoadingSpinner />
                    </div>
                    <div v-if="error"
                        class="bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-4 rounded-xl text-center text-sm">
                        {{ error }}
                    </div>
                    <div v-if="videoInfo" class="w-full max-w-2xl">
                        <VideoCard :info="videoInfo" :loading="downloading" @download="handleDownload" />
                    </div>
                </section>

                <!-- Library Section -->
                <section>
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-lg font-semibold text-white">Your Library</h3>
                        <span
                            class="text-xs text-moises-secondary bg-moises-surface px-2 py-1 rounded-md border border-moises-border">
                            {{ files.length }} Tracks
                        </span>
                    </div>

                    <AudioLibrary :files="files" :current-file="currentFile" :is-playing="isPlaying" @play="playFile"
                        @separate="fetchFiles" />
                </section>
            </div>
        </main>

        <!-- Player Overlay / Studio View -->
        <!-- We mount it but hide it/transition it? Or use v-if? 
         For persistence, v-show or keep-alive is better, but v-if works for now as state is external -->
        <Transition enter-active-class="transform transition duration-300 ease-out" enter-from-class="translate-y-full"
            enter-to-class="translate-y-0" leave-active-class="transform transition duration-300 ease-in"
            leave-from-class="translate-y-0" leave-to-class="translate-y-full">
            <div v-if="currentFile" class="fixed inset-0 z-50 bg-moises-bg">
                <AudioPlayer :file="currentFile" v-model:isPlaying="isPlaying" @back="currentFile = null"
                    @next="playNext" @prev="playPrev" />
            </div>
        </Transition>

        <SettingsDialog ref="settingsRef" />
    </div>
</template>

<style scoped>
/* No scoped styles needed, using utility classes */
</style>
