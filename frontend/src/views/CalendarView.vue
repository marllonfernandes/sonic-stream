<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import EventFormDialog from '../components/EventFormDialog.vue';

const events = ref([]);
const loading = ref(true);
const router = useRouter();
const formDialog = ref(null);

const fetchEvents = async () => {
    loading.value = true;
    try {
        const res = await fetch('/api/events');
        if (res.ok) {
            events.value = await res.json();
        }
    } catch (e) {
        console.error("Failed to load events", e);
    } finally {
        loading.value = false;
    }
};

const goToEvent = (id) => {
    router.push(`/events/${id}`);
};

onMounted(() => {
    fetchEvents();
});
</script>

<template>
    <div class="h-full flex-1 overflow-y-auto overflow-x-hidden p-6 relative">
        <div class="max-w-5xl mx-auto space-y-8 pb-32">
            <div class="flex items-center justify-between">
                <h2 class="text-3xl font-bold text-white">Events Calendar</h2>
                <Button label="New Event" icon="pi pi-plus" @click="formDialog.open()" class="p-button-rounded bg-moises-accent hover:bg-purple-600 border-none" />
            </div>

            <div v-if="loading" class="text-center text-moises-secondary py-10">
                Loading events...
            </div>
            
            <div v-else-if="events.length === 0" class="text-center text-moises-secondary py-10 bg-moises-surface/30 rounded-xl border border-moises-border">
                No events found. Create one to get started!
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Simple Event List for now -->
                <div v-for="evt in events" :key="evt.id" 
                    @click="goToEvent(evt.id)"
                    class="bg-moises-surface/50 border border-moises-border rounded-xl p-5 hover:border-moises-accent transition-colors cursor-pointer group relative overflow-hidden">
                    <div class="absolute inset-0 bg-gradient-to-br from-moises-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div class="flex flex-col h-full">
                        <h4 class="text-lg font-bold text-white mb-1">{{ evt.title }}</h4>
                        <div class="text-sm text-moises-secondary bg-moises-bg/50 px-3 py-1 rounded inline-block self-start mb-3 border border-moises-border/50">
                            <i class="pi pi-calendar mr-1 text-xs"></i>
                            {{ new Date(evt.date).toLocaleDateString() }} {{ evt.time }}
                        </div>
                        <p class="text-sm text-gray-400 line-clamp-2">{{ evt.description || 'No description provided.' }}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <EventFormDialog ref="formDialog" @saved="fetchEvents" />
    </div>
</template>
