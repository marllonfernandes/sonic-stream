<script setup>
import { ref, onMounted, computed } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from "primevue/useconfirm";

const participants = ref([]);
const groups = ref([]);
const loading = ref(true);
const confirm = useConfirm();
const currentUser = ref(null);

// --- Dialog States ---
const showParticipantDialog = ref(false);
const editingParticipant = ref(null);
const participantForm = ref({ name: '', email: '', photoUrl: '', groupId: null });

const showGroupDialog = ref(false);
const editingGroup = ref(null);
const groupForm = ref({ name: '' });

// --- Fetch Data ---
const fetchData = async () => {
    loading.value = true;
    try {
        const [pRes, gRes] = await Promise.all([
            fetch('/api/participants'),
            fetch('/api/participant-groups')
        ]);
        
        if (pRes.ok) participants.value = await pRes.json();
        if (gRes.ok) groups.value = await gRes.json();
        
    } catch (e) {
        console.error("Failed to fetch team data", e);
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchData();
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        try {
            currentUser.value = JSON.parse(savedUser);
        } catch (e) {}
    }
});

// --- Computed ---
const groupOptions = computed(() => {
    return [{ name: 'No Group', id: null }, ...groups.value];
});

const participantsByGroup = computed(() => {
    const grouped = {
        ungrouped: participants.value.filter(p => !p.groupId)
    };
    
    groups.value.forEach(g => {
        grouped[g.id] = participants.value.filter(p => p.groupId === g.id);
    });
    
    return grouped;
});

// --- Participant Logic ---
const openParticipantDialog = (participant = null) => {
    if (participant) {
        editingParticipant.value = participant.id;
        participantForm.value = { ...participant };
    } else {
        editingParticipant.value = null;
        participantForm.value = { name: '', email: '', photoUrl: '', groupId: null };
    }
    showParticipantDialog.value = true;
};

const saveParticipant = async () => {
    if (!participantForm.value.name.trim()) return;
    
    const url = editingParticipant.value ? `/api/participants/${editingParticipant.value}` : '/api/participants';
    const method = editingParticipant.value ? 'PUT' : 'POST';
    
    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(participantForm.value)
        });
        
        if (res.ok) {
            showParticipantDialog.value = false;
            await fetchData();
        }
    } catch (e) {
        console.error("Failed to save participant", e);
    }
};

const deleteParticipant = (id) => {
    confirm.require({
        message: 'Are you sure you want to delete this participant?',
        header: 'Confirm Delete',
        icon: 'pi pi-exclamation-triangle',
        acceptProps: { label: 'Delete', severity: 'danger' },
        rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
        accept: async () => {
            try {
                const res = await fetch(`/api/participants/${id}`, { method: 'DELETE' });
                if (res.ok) await fetchData();
            } catch (e) {
                console.error("Failed to delete participant", e);
            }
        }
    });
};

// --- Group Logic ---
const openGroupDialog = (group = null) => {
    if (group) {
        editingGroup.value = group.id;
        groupForm.value = { ...group };
    } else {
        editingGroup.value = null;
        groupForm.value = { name: '' };
    }
    showGroupDialog.value = true;
};

const saveGroup = async () => {
    if (!groupForm.value.name.trim()) return;
    
    const url = editingGroup.value ? `/api/participant-groups/${editingGroup.value}` : '/api/participant-groups';
    const method = editingGroup.value ? 'PUT' : 'POST';
    
    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(groupForm.value)
        });
        
        if (res.ok) {
            showGroupDialog.value = false;
            await fetchData();
        }
    } catch (e) {
        console.error("Failed to save group", e);
    }
};

const deleteGroup = (id) => {
    confirm.require({
        message: 'Are you sure you want to delete this group? Participants in this group will not be deleted.',
        header: 'Confirm Delete',
        icon: 'pi pi-info-circle',
        acceptProps: { label: 'Delete', severity: 'danger' },
        rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
        accept: async () => {
            try {
                // To be safe, first set all participants in this group to null
                const members = participants.value.filter(p => p.groupId === id);
                for(let p of members) {
                     await fetch(`/api/participants/${p.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ groupId: null })
                    });
                }
                
                const res = await fetch(`/api/participant-groups/${id}`, { method: 'DELETE' });
                if (res.ok) await fetchData();
            } catch (e) {
                console.error("Failed to delete group", e);
            }
        }
    });
};

const getInitials = (name) => {
    if (!name) return '?';
    // Get the first letter of the first word, uppercase
    return name.charAt(0).toUpperCase();
};

const getPhotoUrl = (p) => {
    if (p.photoUrl) return p.photoUrl;
    if (p.email && currentUser.value && currentUser.value.email === p.email && currentUser.value.picture) {
        return currentUser.value.picture;
    }
    return null;
};
</script>

<template>
    <div class="h-full flex-1 overflow-y-auto overflow-x-hidden p-6 relative">
        <ConfirmDialog />
        
        <div class="max-w-5xl mx-auto space-y-8 pb-32">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 class="text-3xl font-bold text-white">Team Management</h2>
                <div class="flex gap-2">
                    <Button label="New Group" icon="pi pi-folder-plus" outlined @click="openGroupDialog()" class="!border-gray-500 !text-gray-300 hover:!bg-white/10" />
                    <Button label="Add Member" icon="pi pi-user-plus" @click="openParticipantDialog()" class="bg-moises-accent border-none hover:bg-purple-600" />
                </div>
            </div>

            <div v-if="loading" class="text-center text-moises-secondary py-10">
                Loading team...
            </div>
            
            <div v-else class="space-y-8">
                
                <!-- Ungrouped Participants -->
                <div v-if="participantsByGroup.ungrouped.length > 0">
                    <h3 class="text-lg font-semibold text-moises-secondary mb-3 uppercase tracking-wider text-sm flex items-center gap-2">
                        <i class="pi pi-users font-bold"></i> Ungrouped
                    </h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div v-for="p in participantsByGroup.ungrouped" :key="p.id" class="bg-moises-surface/50 border border-moises-border rounded-xl p-4 flex items-center gap-4 hover:border-gray-600 transition-colors group">
                           <div class="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold text-white overflow-hidden shrink-0">
                                <img v-if="p.photoUrl" :src="p.photoUrl" class="w-full h-full object-cover" />
                                <span v-else>{{ getInitials(p.name) }}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-medium text-white truncate">{{ p.name }}</h4>
                                <p v-if="p.email" class="text-xs text-moises-secondary truncate">{{ p.email }}</p>
                            </div>
                            <div class="opacity-0 group-hover:opacity-100 transition-opacity flex">
                                <Button icon="pi pi-pencil" text rounded class="text-gray-400 hover:text-white w-8 h-8 p-0" @click="openParticipantDialog(p)" />
                                <Button icon="pi pi-trash" text rounded class="text-gray-500 hover:text-red-400 w-8 h-8 p-0" @click="deleteParticipant(p.id)" />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Grouped Participants -->
                <div v-for="group in groups" :key="group.id" class="bg-moises-surface/20 border border-gray-800 rounded-2xl p-6">
                    <div class="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
                        <h3 class="text-xl font-bold text-white flex items-center gap-2">
                            <i class="pi pi-users text-moises-accent"></i> {{ group.name }}
                            <span class="text-xs bg-gray-800 text-gray-300 px-2 pl-2 rounded-full ml-2">{{ participantsByGroup[group.id]?.length || 0 }}</span>
                        </h3>
                        <div class="flex gap-1">
                            <Button icon="pi pi-pencil" text rounded size="small" class="text-gray-400 hover:text-white" @click="openGroupDialog(group)" />
                            <Button icon="pi pi-trash" text rounded size="small" class="text-gray-500 hover:text-red-400" @click="deleteGroup(group.id)" />
                        </div>
                    </div>
                    
                    <div v-if="!participantsByGroup[group.id] || participantsByGroup[group.id].length === 0" class="text-sm text-gray-500 italic py-2">
                        No members in this group.
                    </div>
                    
                    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div v-for="p in participantsByGroup[group.id]" :key="p.id" class="bg-moises-surface/50 border border-moises-border rounded-xl p-4 flex items-center gap-4 hover:border-gray-600 transition-colors group">
                            <div class="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold text-white overflow-hidden shrink-0">
                                <img v-if="getPhotoUrl(p)" :src="getPhotoUrl(p)" class="w-full h-full object-cover" />
                                <span v-else>{{ getInitials(p.name) }}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-medium text-white truncate">{{ p.name }}</h4>
                                <p v-if="p.email" class="text-xs text-moises-secondary truncate">{{ p.email }}</p>
                            </div>
                            <div class="opacity-0 group-hover:opacity-100 transition-opacity flex">
                                <Button icon="pi pi-pencil" text rounded class="text-gray-400 hover:text-white w-8 h-8 p-0" @click="openParticipantDialog(p)" />
                                <Button icon="pi pi-trash" text rounded class="text-gray-500 hover:text-red-400 w-8 h-8 p-0" @click="deleteParticipant(p.id)" />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- Participant Dialog -->
        <Dialog v-model:visible="showParticipantDialog" modal :header="editingParticipant ? 'Edit Member' : 'New Member'" :style="{ width: '400px' }" class="dark-theme-dialog">
            <div class="flex flex-col gap-4 mt-2">
                <div class="flex flex-col gap-2">
                    <label class="text-sm text-gray-400">Name</label>
                    <InputText v-model="participantForm.name" class="bg-moises-bg border-gray-700" placeholder="John Doe" autofocus />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-sm text-gray-400">Email (Optional)</label>
                    <InputText v-model="participantForm.email" type="email" class="bg-moises-bg border-gray-700" placeholder="john@example.com" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-sm text-gray-400">Photo URL (Optional)</label>
                    <InputText v-model="participantForm.photoUrl" class="bg-moises-bg border-gray-700" placeholder="https://..." />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-sm text-gray-400">Group</label>
                    <Dropdown v-model="participantForm.groupId" :options="groupOptions" optionLabel="name" optionValue="id" class="w-full bg-moises-bg border-gray-700" placeholder="Select a Group" />
                </div>
            </div>
            <template #footer>
                <Button label="Cancel" text class="text-gray-400" @click="showParticipantDialog = false" />
                <Button label="Save" class="bg-moises-accent border-none" @click="saveParticipant" />
            </template>
        </Dialog>

        <!-- Group Dialog -->
        <Dialog v-model:visible="showGroupDialog" modal :header="editingGroup ? 'Edit Group' : 'New Group'" :style="{ width: '400px' }" class="dark-theme-dialog">
            <div class="flex flex-col gap-4 mt-2">
                <div class="flex flex-col gap-2">
                    <label class="text-sm text-gray-400">Group Name</label>
                    <InputText v-model="groupForm.name" class="bg-moises-bg border-gray-700" placeholder="e.g. Vocals, Band" autofocus @keyup.enter="saveGroup" />
                </div>
            </div>
            <template #footer>
                <Button label="Cancel" text class="text-gray-400" @click="showGroupDialog = false" />
                <Button label="Save" class="bg-moises-accent border-none" @click="saveGroup" />
            </template>
        </Dialog>

    </div>
</template>
