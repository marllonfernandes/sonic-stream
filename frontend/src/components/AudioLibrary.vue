<script setup>
import { ref, onMounted, computed } from 'vue';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import ConfirmDialog from 'primevue/confirmdialog';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
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

// --- Groups Logic ---
const groups = ref([]);

const fetchGroups = async () => {
    try {
        const res = await fetch('/api/groups');
        groups.value = await res.json();
    } catch (e) {
        console.error("Failed to fetch groups", e);
    }
};

onMounted(() => {
    fetchGroups();
});

const showCreateGroupDialog = ref(false);
const newGroupName = ref("");

const openCreateGroupDialog = () => {
    newGroupName.value = "";
    showCreateGroupDialog.value = true;
};

const confirmCreateGroup = async () => {
    if (!newGroupName.value?.trim()) return;
    try {
        const res = await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newGroupName.value.trim() })
        });
        const newGroup = await res.json();
        groups.value.push(newGroup);
        showCreateGroupDialog.value = false;
    } catch (e) {
        console.error("Failed to create group", e);
    }
};

const deleteGroup = (group) => {
    confirm.require({
        message: `Are you sure you want to delete group "${group.name}"? Its songs will return to Ungrouped.`,
        header: 'Delete Group',
        icon: 'pi pi-exclamation-triangle',
        acceptProps: { label: 'Delete', severity: 'danger' },
        rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
        accept: async () => {
            try {
                await fetch(`/api/groups/${group.id}`, { method: 'DELETE' });
                groups.value = groups.value.filter(g => g.id !== group.id);
            } catch (e) {
                console.error("Failed to delete group", e);
            }
        }
    });
};

const updateGroupFiles = async (group) => {
    try {
        await fetch(`/api/groups/${group.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: group.files })
        });
    } catch (e) {
        console.error("Failed to update group", e);
    }
};

const ungroupedFiles = computed(() => {
    return props.files.filter(file => {
        return !groups.value.some(g => g.files?.includes(file.name));
    });
});

const groupedFiles = computed(() => {
    return groups.value.map(group => {
        return {
            ...group,
            fileObjects: (group.files || []).map(fileName => props.files.find(f => f.name === fileName)).filter(Boolean)
        };
    });
});

const dragStart = (e, file) => {
    e.dataTransfer.setData('fileName', file.name);
    e.dataTransfer.effectAllowed = 'move';
};

const dropToGroup = async (e, targetGroup) => {
    const fileName = e.dataTransfer.getData('fileName');
    if (!fileName) return;

    if (!targetGroup.files) targetGroup.files = [];
    if (targetGroup.files.includes(fileName)) return;

    // Remove from other groups
    for (const g of groups.value) {
        if (g.files?.includes(fileName)) {
            g.files = g.files.filter(f => f !== fileName);
            await updateGroupFiles(g);
        }
    }

    targetGroup.files.push(fileName);
    await updateGroupFiles(targetGroup);
};

const dropToUngrouped = async (e) => {
    const fileName = e.dataTransfer.getData('fileName');
    if (!fileName) return;

    let changed = false;
    for (const g of groups.value) {
        if (g.files?.includes(fileName)) {
            g.files = g.files.filter(f => f !== fileName);
            await updateGroupFiles(g);
            changed = true;
        }
    }
};

const removeFromGroup = async (file) => {
    for (const g of groups.value) {
        if (g.files?.includes(file.name)) {
            g.files = g.files.filter(f => f !== file.name);
            await updateGroupFiles(g);
        }
    }
};
// --- End Groups Logic ---

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
        <ConfirmDialog />

        <Dialog v-model:visible="showCreateGroupDialog" modal header="Create New Group" :style="{ width: '25rem' }">
            <div class="flex flex-col gap-2">
                <label for="groupName" class="text-sm font-semibold text-moises-secondary">Group Name</label>
                <InputText id="groupName" v-model="newGroupName" autocomplete="off" class="bg-black/20 border border-moises-border text-white p-2 rounded-lg focus:border-moises-accent focus:ring-1 focus:ring-moises-accent transition-all" @keyup.enter="confirmCreateGroup" autofocus />
            </div>
            <template #footer>
                <Button label="Cancel" text severity="secondary" @click="showCreateGroupDialog = false" class="text-moises-secondary hover:text-white" />
                <Button label="Create" @click="confirmCreateGroup" autofocus class="bg-moises-accent border-moises-accent hover:bg-blue-600 text-white" />
            </template>
        </Dialog>

        <div class="flex justify-between items-center mb-4 px-2">
            <h3 class="text-white font-semibold text-lg flex items-center gap-2">
                <i class="pi pi-list"></i> My Library
            </h3>
            <Button label="New Group" icon="pi pi-folder-plus" size="small" outlined class="!text-moises-accent !border-moises-accent hover:!bg-moises-accent/10 py-1" @click="openCreateGroupDialog" />
        </div>

        <!-- Groups -->
        <div v-for="group in groupedFiles" :key="group.id" 
            class="mb-4 bg-moises-surface/30 rounded-xl border border-moises-border/50 p-3 transition-colors hover:border-moises-border"
            @dragover.prevent @drop="dropToGroup($event, group)">
            
            <div class="flex justify-between items-center mb-3 px-1">
                <h4 class="text-white font-medium flex items-center gap-2">
                    <i class="pi pi-folder text-moises-accent"></i>
                    {{ group.name }}
                    <span class="text-xs text-moises-secondary ml-2 px-2 py-0.5 bg-moises-surface rounded-full">{{ group.fileObjects.length }}</span>
                </h4>
                <Button icon="pi pi-trash" text rounded severity="danger" class="w-8 h-8 p-0 text-moises-secondary hover:!text-red-500" @click="deleteGroup(group)" />
            </div>

            <div class="flex flex-col gap-2 min-h-[40px] rounded-lg p-1" :class="{'bg-black/10 border border-dashed border-white/5': group.fileObjects.length === 0}">
                <div v-if="group.fileObjects.length === 0" class="text-xs text-moises-secondary/50 italic py-3 text-center pointer-events-none">
                    Drag and drop songs here
                </div>
                <template v-for="file in group.fileObjects" :key="file.path">
                    <div draggable="true" @dragstart="dragStart($event, file)" class="group w-full p-3 rounded-xl flex items-center gap-4 transition-all border border-transparent hover:bg-moises-surface hover:border-moises-border cursor-grab active:cursor-grabbing relative overflow-hidden"
                        :class="{ 'bg-moises-surface border-moises-accent/30': isCurrent(file), 'bg-moises-surface/50': !isCurrent(file) }" @click="$emit('play', file)">
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
                        <div class="flex items-center gap-1 sm:gap-2 z-10 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <div v-if="separating[file.name]">
                                <ProgressSpinner style="width: 24px; height: 24px" strokeWidth="6" />
                            </div>
                            <Button v-else-if="!file.hasStems" label="Split" icon="pi pi-bolt" size="small"
                                class="!bg-moises-accent !border-moises-accent hover:!bg-blue-600 text-xs py-1 px-3 h-8 shadow-lg shadow-blue-500/20"
                                @click.stop="separateAudio(file)" />

                            <Button icon="pi pi-minus-circle" text rounded severity="warning"
                                title="Remove from Group"
                                class="text-moises-secondary hover:!text-orange-400 hover:!bg-orange-400/10"
                                @click.stop="removeFromGroup(file)" />

                            <Button icon="pi pi-trash" text rounded severity="danger"
                                class="text-moises-secondary hover:!text-red-500 hover:!bg-red-500/10"
                                @click.stop="deleteFile(file)" />
                        </div>
                    </div>
                </template>
            </div>
        </div>

        <!-- Ungrouped -->
        <div @dragover.prevent @drop="dropToUngrouped($event)" class="min-h-[100px] rounded-xl p-2 transition-colors border border-transparent hover:border-moises-border/30 hover:bg-white/5">
            <h4 class="text-moises-secondary text-xs font-semibold mb-3 uppercase tracking-wider px-2" v-if="groups.length > 0">Ungrouped</h4>
            <div class="flex flex-col gap-2">
                <template v-for="file in ungroupedFiles" :key="file.path">
                    <div draggable="true" @dragstart="dragStart($event, file)" class="group w-full p-3 rounded-xl flex items-center gap-4 transition-all border border-transparent hover:bg-moises-surface hover:border-moises-border cursor-grab active:cursor-grabbing relative overflow-hidden"
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
                        <div class="flex items-center gap-2 z-10 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
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
        </div>
    </div>
</template>

<style scoped></style>
