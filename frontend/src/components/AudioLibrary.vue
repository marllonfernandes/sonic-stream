<script setup>
import { ref } from 'vue';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from "primevue/useconfirm";

const props = defineProps({
    files: {
        type: Array,
        required: true
    },
    currentFile: {
        type: Object,
        default: null
    },
    isPlaying: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['play', 'separate']);
const confirm = useConfirm();

const separating = ref({}); // Track separation status by filename

const isCurrent = (file) => props.currentFile?.path === file.path;

// Generate a gradient based on the filename for a placeholder thumb
const getGradient = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c1 = `hsl(${hash % 360}, 70%, 60%)`;
    const c2 = `hsl(${(hash + 40) % 360}, 70%, 40%)`;
    return `linear-gradient(135deg, ${c1}, ${c2})`;
}

const separateAudio = async (file) => {
    separating.value[file.name] = true;
    try {
        const res = await fetch('/api/separate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        // Notify parent to refresh list or handle success
        emit('separate', file);
    } catch (e) {
        console.error("Separation failed", e);
        alert("Separation failed: " + e.message);
    } finally {
        separating.value[file.name] = false;
    }
};

const deleteFile = (file) => {
    confirm.require({
        message: `Are you sure you want to delete "${file.name}"? This cannot be undone.`,
        header: 'Delete Confirmation',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: {
            label: 'Cancel',
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: 'Delete',
            severity: 'danger'
        },
        accept: async () => {
            try {
                const res = await fetch(`/api/files/${encodeURIComponent(file.name)}`, {
                    method: 'DELETE'
                });

                if (res.ok) {
                    emit('separate'); // Reuse refresh event
                } else {
                    const data = await res.json();
                    throw new Error(data.error || 'Delete failed');
                }
            } catch (e) {
                console.error("Delete failed", e);
                // Keep alert for error feedback for now, or use toast if available
                alert("Failed to delete: " + e.message);
            }
        }
    });
};
</script>

<template>
    <div class="w-full flex flex-col gap-2 pb-32">
        <ConfirmDialog :pt="{
            root: { class: 'bg-moises-surface border border-moises-border text-white' },
            header: { class: 'text-white' },
            content: { class: 'text-moises-secondary' },
            icon: { class: 'text-red-500' }
        }" />

        <template v-for="file in files" :key="file.path">
            <div class="group w-full p-3 rounded-xl flex items-center gap-4 transition-all border border-transparent hover:bg-moises-surface hover:border-moises-border cursor-pointer relative overflow-hidden"
                :class="{ 'bg-moises-surface border-moises-accent/30': isCurrent(file) }" @click="$emit('play', file)">
                <!-- Playing Indication Background -->
                <div v-if="isCurrent(file) && isPlaying"
                    class="absolute inset-0 bg-moises-accent/5 z-0 pointer-events-none"></div>

                <!-- Thumbnail -->
                <div class="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center shadow-md z-10 relative overflow-hidden"
                    :style="{ background: file.imageUrl ? `url('${file.imageUrl}') center/cover no-repeat` : getGradient(file.name) }">
                    <div class="absolute inset-0 bg-black/20"></div>
                    <i v-if="isCurrent(file) && isPlaying"
                        class="pi pi-pause text-white text-xl drop-shadow-md relative z-10"></i>
                    <i v-else
                        class="pi pi-play text-white text-xl drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity relative z-10"></i>
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0 z-10 flex flex-col justify-center">
                    <h4 class="font-semibold text-white truncate text-base leading-tight"
                        :class="{ 'text-moises-accent': isCurrent(file) }">
                        {{ file.name }}
                    </h4>
                    <p class="text-sm text-moises-secondary truncate mt-0.5 flex items-center gap-2">
                        <span v-if="file.hasStems" class="text-green-500 flex items-center gap-1 text-xs">
                            <i class="pi pi-check-circle text-[10px]"></i> Stems Ready
                        </span>
                        <span v-else class="text-orange-400 flex items-center gap-1 text-xs">
                            Single Track
                        </span>
                    </p>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <!-- Separation Badge/Button -->
                    <div v-if="separating[file.name]">
                        <ProgressSpinner style="width: 24px; height: 24px" strokeWidth="6" />
                    </div>
                    <Button v-else-if="!file.hasStems" label="Split" icon="pi pi-bolt" size="small"
                        class="!bg-moises-accent !border-moises-accent hover:!bg-blue-600 text-xs py-1 px-3 h-8 shadow-lg shadow-blue-500/20"
                        @click.stop="separateAudio(file)" />

                    <Button icon="pi pi-trash" text rounded severity="danger"
                        class="text-moises-secondary hover:!text-red-500 hover:!bg-red-500/10"
                        @click.stop="deleteFile(file)" />
                </div>
            </div>
        </template>

        <div v-if="files.length === 0"
            class="text-center py-12 text-moises-secondary bg-moises-surface/30 rounded-2xl border border-dashed border-moises-border/50">
            <i class="pi pi-music text-4xl mb-4 opacity-50"></i>
            <p>No files found. Import a YouTube link to get started.</p>
        </div>
    </div>
</template>

<style scoped></style>
