<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from "primevue/useconfirm";
import AudioLibrary from '../components/AudioLibrary.vue';
import EventFormDialog from '../components/EventFormDialog.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id;
const event = ref(null);
const loading = ref(true);
const error = ref(null);
const confirm = useConfirm();
const eventFormRef = ref(null);

// Team Data
const allParticipants = ref([]);
const allGroups = ref([]);
const selectedParticipantId = ref(null);
const selectedParticipantGroupId = ref(null);

// Songs Selection
const libraryFiles = ref([]);
const showSongPicker = ref(false);

const fetchEvent = async () => {
    loading.value = true;
    try {
        const res = await fetch(`/api/events/${id}`);
        if (!res.ok) throw new Error('Event not found');
        event.value = await res.json();
        
        // Ensure arrays exist
        if (!event.value.participants) event.value.participants = [];
        if (!event.value.songs) event.value.songs = [];
    } catch (e) {
        error.value = e.message;
    } finally {
        loading.value = false;
    }
};

const fetchTeamData = async () => {
    try {
        const [pRes, gRes] = await Promise.all([
            fetch('/api/participants'),
            fetch('/api/participant-groups')
        ]);
        if (pRes.ok) allParticipants.value = await pRes.json();
        if (gRes.ok) allGroups.value = await gRes.json();
    } catch (e) {
        console.error("Failed to fetch team data", e);
    }
};

const fetchLibraryFiles = async () => {
    try {
        const res = await fetch('/api/files');
        if (res.ok) {
            libraryFiles.value = await res.json();
        }
    } catch (e) {
        console.error("Failed to fetch library", e);
    }
};

const updateEvent = async (updates) => {
    try {
        const res = await fetch(`/api/events/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (res.ok) {
            event.value = await res.json();
            // ensure arrays
            if (!event.value.participants) event.value.participants = [];
            if (!event.value.songs) event.value.songs = [];
        }
    } catch (e) {
        console.error("Failed to update event", e);
    }
};

const editEvent = () => {
    if (eventFormRef.value && event.value) {
        eventFormRef.value.open({ id, ...event.value });
    }
};

const deleteEvent = () => {
    confirm.require({
        message: 'Are you sure you want to delete this event?',
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
                const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    router.push('/calendar');
                } else {
                    console.error('Failed to delete event');
                }
            } catch (e) {
                console.error(e);
            }
        }
    });
};

// Participants Logic
const addParticipant = async () => {
    if (!selectedParticipantId.value) return;
    
    const p = allParticipants.value.find(p => p.id === selectedParticipantId.value);
    if (!p) return;
    
    // Check if already in event
    if (event.value.participants.find(existing => existing.id === p.id)) {
        selectedParticipantId.value = null;
        return;
    }
    
    const newPart = { id: p.id, name: p.name, photoUrl: p.photoUrl, confirmed: false };
    const updatedParticipants = [...event.value.participants, newPart];
    await updateEvent({ participants: updatedParticipants });
    selectedParticipantId.value = null;
};

const addParticipantGroup = async () => {
    if (!selectedParticipantGroupId.value) return;
    
    const groupId = selectedParticipantGroupId.value;
    const groupMembers = allParticipants.value.filter(p => p.groupId === groupId);
    
    let updatedParticipants = [...event.value.participants];
    let updatedParticipantGroups = [...(event.value.participantGroups || [])];
    
    let changed = false;
    let groupsChanged = false;

    if (!updatedParticipantGroups.includes(groupId)) {
        updatedParticipantGroups.push(groupId);
        groupsChanged = true;
    }
    
    for (const p of groupMembers) {
        if (!updatedParticipants.find(existing => existing.id === p.id)) {
            updatedParticipants.push({ id: p.id, name: p.name, photoUrl: p.photoUrl, confirmed: false });
            changed = true;
        }
    }
    
    let updates = {};
    if (changed) updates.participants = updatedParticipants;
    if (groupsChanged) updates.participantGroups = updatedParticipantGroups;

    if (Object.keys(updates).length > 0) {
        await updateEvent(updates);
    }
    selectedParticipantGroupId.value = null;
};

const toggleConfirmation = async (index) => {
    const updatedParticipants = [...event.value.participants];
    updatedParticipants[index].confirmed = !updatedParticipants[index].confirmed;
    await updateEvent({ participants: updatedParticipants });
};

const removeParticipant = async (index) => {
    const updatedParticipants = event.value.participants.filter((_, i) => i !== index);
    await updateEvent({ participants: updatedParticipants });
};

// Songs Logic
const addSong = async (file) => {
    // Check if already in
    if (event.value.songs.find(s => s.path === file.path)) return;
    
    const newSong = {
        title: file.name.replace('.mp3', ''),
        path: file.path,
        url: file.url,
        hasStems: file.hasStems,
        stemFolder: file.stemFolder
    };
    const updatedSongs = [...event.value.songs, newSong];
    await updateEvent({ songs: updatedSongs });
    showSongPicker.value = false;
};

const addGroupContents = async (files) => {
    let updatedSongs = [...event.value.songs];
    let changed = false;
    for (const file of files) {
        if (!updatedSongs.find(s => s.path === file.path)) {
            updatedSongs.push({
                title: file.name.replace('.mp3', ''),
                path: file.path,
                url: file.url,
                hasStems: file.hasStems,
                stemFolder: file.stemFolder
            });
            changed = true;
        }
    }
    if (changed) {
        await updateEvent({ songs: updatedSongs });
    }
    showSongPicker.value = false;
};

const removeSong = async (index) => {
    const updatedSongs = event.value.songs.filter((_, i) => i !== index);
    await updateEvent({ songs: updatedSongs });
};

// Sharing Logic
const shareText = computed(() => {
    if (!event.value) return '';
    const dateStr = new Date(event.value.date).toLocaleDateString();
    let text = `🎵 *${event.value.title}*\n📅 *Data:* ${dateStr}\n⏰ *Horário:* ${event.value.time}\n\n`;
    
    if (event.value.description) text += `📝 *Detalhes:*\n${event.value.description}\n\n`;
    
    const confirmedParticipants = event.value.participants.filter(p => p.confirmed);
    if (confirmedParticipants.length > 0) {
        text += `👥 *Equipe Confirmada:*\n`;
        confirmedParticipants.forEach(p => {
            const fullP = allParticipants.value.find(ap => ap.id === p.id);
            let groupName = '';
            if (fullP && fullP.groupId) {
                const group = allGroups.value.find(g => g.id === fullP.groupId);
                if (group) groupName = ` (${group.name})`;
            }
            text += `✅ ${p.name}${groupName}\n`;
        });
        text += '\n';
    }

    if (event.value.songs && event.value.songs.length > 0) {
        text += `🎸 *Repertório:*\n`;
        event.value.songs.forEach((s, i) => text += `${i+1}️⃣ ${s.title}\n`);
        text += '\n';
    }
    
    return encodeURIComponent(text);
});

const whatsappLink = computed(() => `https://wa.me/?text=${shareText.value}`);
const telegramLink = computed(() => `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${shareText.value}`);

const googleCalendarLink = computed(() => {
    if (!event.value) return '#';
    
    // Parse the date and time strings locally
    const startObj = new Date(`${event.value.date}T${event.value.time}:00`);
    // Add 2 hours for the end time
    const endObj = new Date(startObj.getTime() + 2 * 60 * 60 * 1000);

    const formatGCalDate = (dateObj) => {
        return dateObj.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };
    
    const startStr = formatGCalDate(startObj);
    const endStr = formatGCalDate(endObj);
    
    let details = '';
    if (event.value.description) details += `${event.value.description}\n\n`;
    
    const confirmedParticipants = event.value.participants.filter(p => p.confirmed);
    if (confirmedParticipants.length > 0) {
        details += `👥 Equipe Confirmada:\n`;
        confirmedParticipants.forEach(p => {
            const fullP = allParticipants.value.find(ap => ap.id === p.id);
            let groupName = '';
            if (fullP && fullP.groupId) {
                const group = allGroups.value.find(g => g.id === fullP.groupId);
                if (group) groupName = ` (${group.name})`;
            }
            details += `✅ ${p.name}${groupName}\n`;
        });
        details += '\n';
    }

    if (event.value.songs && event.value.songs.length > 0) {
        details += `🎸 Repertório:\n`;
        event.value.songs.forEach((s, i) => details += `${i+1}. ${s.title}\n`);
        details += '\n';
    }
    
    // Google Calendar template
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('🎵 ' + event.value.title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(details)}`;
});

const syncGroupParticipants = async () => {
    if (!event.value || !event.value.participantGroups || !allParticipants.value.length) return;
    
    let updatedParticipants = [...event.value.participants];
    let changed = false;

    for (const groupId of event.value.participantGroups) {
        const groupMembers = allParticipants.value.filter(p => p.groupId === groupId);
        for (const p of groupMembers) {
            if (!updatedParticipants.find(existing => existing.id === p.id)) {
                updatedParticipants.push({ id: p.id, name: p.name, photoUrl: p.photoUrl, confirmed: false });
                changed = true;
            }
        }
    }

    if (changed) {
        await updateEvent({ participants: updatedParticipants });
    }
};

onMounted(async () => {
    await Promise.all([
        fetchEvent(),
        fetchLibraryFiles(),
        fetchTeamData()
    ]);
    await syncGroupParticipants();
});
</script>

<template>
    <div class="h-full flex-1 overflow-y-auto overflow-x-hidden p-6 relative text-white">
        <ConfirmDialog />
        <EventFormDialog ref="eventFormRef" @saved="fetchEvent" />
        <div class="max-w-5xl mx-auto pb-32">
            <Button icon="pi pi-arrow-left" text label="Back" @click="$router.push('/calendar')" class="mb-4 text-moises-secondary hover:text-white" />
            
            <div v-if="loading" class="text-center py-10 text-moises-secondary">Loading Event...</div>
            <div v-else-if="error" class="text-red-400 py-10 text-center">{{ error }}</div>
            <div v-else>
                <!-- Header & Sharing -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <div class="flex items-center gap-3">
                            <h2 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">{{ event.title }}</h2>
                            <Button icon="pi pi-pencil" text rounded class="text-gray-400 hover:text-white hover:bg-white/10" @click="editEvent" title="Edit Event" />
                            <Button icon="pi pi-trash" text rounded class="text-gray-400 hover:text-red-400 hover:bg-red-400/10" @click="deleteEvent" title="Delete Event" />
                        </div>
                        <div class="text-moises-secondary mt-1 flex items-center gap-2">
                            <i class="pi pi-calendar text-sm"></i>
                            {{ new Date(event.date).toLocaleDateString() }} at {{ event.time }}
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap gap-2">
                        <a :href="whatsappLink" target="_blank" class="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                            <i class="pi pi-whatsapp"></i> WhatsApp
                        </a>
                        <a :href="telegramLink" target="_blank" class="bg-blue-500 hover:bg-blue-400 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                            <i class="pi pi-telegram"></i> Telegram
                        </a>
                        <a :href="googleCalendarLink" target="_blank" class="bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                            <i class="pi pi-google"></i> Calendar
                        </a>
                    </div>
                </div>
                
                <p class="mb-8 whitespace-pre-wrap text-gray-300 pl-2 border-l-2 border-moises-accent">{{ event.description }}</p>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Column 1: Participants -->
                    <div class="lg:col-span-1 space-y-6">
                        <div class="bg-moises-surface/50 border border-moises-border rounded-xl p-6">
                            <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
                                <i class="pi pi-users text-moises-accent"></i> Participants
                            </h3>
                            
                            <div class="flex flex-col gap-2 mb-4">
                                <div class="flex gap-2">
                                    <Dropdown v-model="selectedParticipantId" :options="allParticipants" optionLabel="name" optionValue="id" placeholder="Select Member" class="w-full bg-moises-bg border-gray-700 text-sm" filter />
                                    <Button icon="pi pi-plus" @click="addParticipant" class="bg-moises-accent hover:bg-purple-600 border-none aspect-square p-0 w-10 h-10 flex-shrink-0" title="Add Member" />
                                </div>
                                
                                <div class="flex gap-2 mt-2">
                                    <Dropdown v-model="selectedParticipantGroupId" :options="allGroups" optionLabel="name" optionValue="id" placeholder="Select Group" class="w-full bg-moises-bg border-gray-700 text-sm" />
                                    <Button icon="pi pi-users" @click="addParticipantGroup" class="bg-gray-700 hover:bg-gray-600 border-none aspect-square p-0 w-10 h-10 flex-shrink-0 text-gray-300" title="Add Entire Group" />
                                </div>
                            </div>

                            <ul class="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                <li v-if="event.participants.length === 0" class="text-sm text-moises-secondary text-center py-4">No participants added</li>
                                <li v-for="(p, idx) in event.participants" :key="idx" 
                                    class="flex items-center justify-between p-2 rounded-lg border"
                                    :class="p.confirmed ? 'bg-green-900/10 border-green-800/50' : 'bg-gray-800/30 border-gray-700'">
                                    
                                    <div class="flex items-center gap-3">
                                        <button @click="toggleConfirmation(idx)" class="focus:outline-none transition-transform hover:scale-110 shrink-0">
                                            <i v-if="p.confirmed" class="pi pi-check-circle text-green-400 text-lg"></i>
                                            <i v-else class="pi pi-circle text-gray-500 text-lg"></i>
                                        </button>
                                        
                                        <div class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0">
                                            <img v-if="p.photoUrl" :src="p.photoUrl" class="w-full h-full object-cover" />
                                            <span v-else>{{ p.name ? p.name.charAt(0).toUpperCase() : '?' }}</span>
                                        </div>
                                        
                                        <span class="text-sm font-medium truncate" :class="p.confirmed ? 'text-green-100' : 'text-gray-300'">{{ p.name }}</span>
                                    </div>
                                    <Button icon="pi pi-trash" text rounded class="text-gray-500 hover:text-red-400 w-8 h-8 p-0 shrink-0" @click="removeParticipant(idx)" />
                                </li>
                            </ul>
                        </div>
                    </div>
                    
                    <!-- Column 2: Songs/Setlist -->
                    <div class="lg:col-span-2 space-y-6">
                        <div class="bg-moises-surface/50 border border-moises-border rounded-xl p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-xl font-semibold flex items-center gap-2">
                                    <i class="pi pi-list text-moises-accent"></i> Setlist
                                </h3>
                                <Button label="Add Song" icon="pi pi-plus" size="small" class="bg-gray-700 hover:bg-gray-600 border-gray-600 text-sm" @click="showSongPicker = true" />
                            </div>

                            <div v-if="event.songs.length === 0" class="text-center py-10 border border-dashed border-gray-700 rounded-xl bg-gray-900/30">
                                <p class="text-moises-secondary text-sm">No songs added yet.</p>
                                <Button label="Browse Library" text class="mt-2 text-moises-accent p-0" @click="showSongPicker = true" />
                            </div>

                            <div v-else class="space-y-3">
                                <div v-for="(song, idx) in event.songs" :key="idx" class="flex items-center justify-between bg-moises-bg rounded-lg border border-gray-800 p-3 hover:border-gray-600 transition-colors">
                                    <div class="flex items-center gap-4">
                                        <div class="w-10 h-10 rounded bg-gray-800 flex items-center justify-center text-gray-400">
                                            <i class="pi pi-music"></i>
                                        </div>
                                        <div>
                                            <div class="font-medium text-white text-sm">{{ song.title }}</div>
                                            <div class="text-xs text-moises-secondary mt-1 flex gap-2">
                                                <span v-if="song.hasStems" class="text-moises-accent"><i class="pi pi-verified text-[10px]"></i> Stems</span>
                                                <!-- We can add links to chords/lyrics here later -->
                                                <span class="cursor-pointer hover:text-white transition-colors"><i class="pi pi-file-edit text-[10px]"></i> Ciphers</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="flex items-center gap-1">
                                        <Button icon="pi pi-trash" text rounded class="text-gray-500 hover:text-red-400 w-8 h-8 p-0" @click="removeSong(idx)" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Song Picker Dialog -->
        <Dialog v-model:visible="showSongPicker" modal header="Select Song from Library" :style="{ width: '90vw', maxWidth: '800px' }" class="dark-theme-dialog">
            <div class="p-4 bg-moises-bg rounded-lg border border-moises-border max-h-[60vh] overflow-y-auto">
                <AudioLibrary :files="libraryFiles" :hide-player-controls="true" @play="addSong" @add-group="addGroupContents" />
            </div>
            <p class="text-xs text-moises-secondary mt-2 text-center">Click a song's play area or a group's <i class="pi pi-plus text-xs"></i> button to add it to the setlist.</p>
        </Dialog>
    </div>
</template>
