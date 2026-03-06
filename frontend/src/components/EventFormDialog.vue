<script setup>
import { ref, defineExpose, defineEmits } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';

const visible = ref(false);
const loading = ref(false);
const editingId = ref(null);
const emit = defineEmits(['saved']);

const eventForm = ref({
    title: '',
    description: '',
    date: '',
    time: ''
});

const open = (eventData = null) => {
    if (eventData) {
        editingId.value = eventData.id;
        eventForm.value = {
            title: eventData.title || '',
            description: eventData.description || '',
            date: eventData.date || new Date().toISOString().split('T')[0],
            time: eventData.time || '19:00'
        };
    } else {
        editingId.value = null;
        eventForm.value = {
            title: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            time: '19:00'
        };
    }
    visible.value = true;
};

const close = () => {
    visible.value = false;
};

const save = async () => {
    if (!eventForm.value.title || !eventForm.value.date) return;
    
    loading.value = true;
    try {
        const url = editingId.value ? `/api/events/${editingId.value}` : '/api/events';
        const method = editingId.value ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventForm.value)
        });
        
        if (res.ok) {
            emit('saved');
            close();
        } else {
            console.error("Failed to save event");
        }
    } catch (e) {
        console.error("Error saving event", e);
    } finally {
        loading.value = false;
    }
};

defineExpose({ open, close });
</script>

<template>
    <Dialog v-model:visible="visible" modal :header="editingId ? 'Edit Event' : 'Create New Event'" :style="{ width: '90vw', maxWidth: '500px' }" class="p-fluid dark-theme-dialog">
        <div class="flex flex-col gap-4 mt-2">
            <div class="flex flex-col gap-2">
                <label for="title" class="text-sm font-medium text-gray-300">Event Title</label>
                <InputText id="title" v-model="eventForm.title" placeholder="E.g. Sunday Worship" class="bg-gray-800 border-gray-700 text-white" />
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                    <label for="date" class="text-sm font-medium text-gray-300">Date</label>
                    <input type="date" id="date" v-model="eventForm.date" class="bg-gray-800 border-gray-700 text-white p-2 rounded border focus:outline-none focus:border-moises-accent" />
                </div>
                <div class="flex flex-col gap-2">
                    <label for="time" class="text-sm font-medium text-gray-300">Time</label>
                    <input type="time" id="time" v-model="eventForm.time" class="bg-gray-800 border-gray-700 text-white p-2 rounded border focus:outline-none focus:border-moises-accent" />
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <label for="description" class="text-sm font-medium text-gray-300">Description</label>
                <Textarea id="description" v-model="eventForm.description" rows="3" placeholder="Optional details..." class="bg-gray-800 border-gray-700 text-white" />
            </div>
        </div>

        <template #footer>
            <Button label="Cancel" icon="pi pi-times" text @click="close" class="text-gray-400 hover:text-white" />
            <Button label="Save Event" icon="pi pi-check" @click="save" :loading="loading" class="bg-moises-accent hover:bg-purple-600 border-none text-white" />
        </template>
    </Dialog>
</template>

<style>
/* Appending some quick global classes to override PrimeVue dialog for dark theme if necessary */
.dark-theme-dialog .p-dialog-header,
.dark-theme-dialog .p-dialog-content,
.dark-theme-dialog .p-dialog-footer {
    background-color: #1e1e24 !important;
    color: white !important;
    border-color: #2d2d35 !important;
}
</style>
