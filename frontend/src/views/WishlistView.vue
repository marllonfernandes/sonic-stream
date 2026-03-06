<script setup>
import { ref, onMounted } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from "primevue/useconfirm";

// Global Toast instance typically provided by App.vue but we will manage errors here.

const items = ref([]);
const loading = ref(true);
const confirm = useConfirm();

// Form States
const showDialog = ref(false);
const editingItem = ref(null);

const form = ref({
    title: '',
    artist: '',
    youtubeUrl: '',
    status: 'pending' // pending, practicing
});

const statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Practicing', value: 'practicing' }
];

const fetchItems = async () => {
    loading.value = true;
    try {
        const res = await fetch('/api/wishlist');
        if (res.ok) {
            items.value = await res.json();
        }
    } catch (e) {
        console.error("Failed to fetch wishlist", e);
    } finally {
        loading.value = false;
    }
};

const openAddDialog = () => {
    editingItem.value = null;
    form.value = { title: '', artist: '', youtubeUrl: '', status: 'pending' };
    showDialog.value = true;
};

const openEditDialog = (item) => {
    editingItem.value = item;
    form.value = { ...item };
    showDialog.value = true;
};

const saveItem = async () => {
    const url = editingItem.value ? `/api/wishlist/${editingItem.value.id}` : '/api/wishlist';
    const method = editingItem.value ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form.value)
        });

        if (res.ok) {
            showDialog.value = false;
            fetchItems();
        } else {
            console.error("Failed to save wishlist item");
        }
    } catch (e) {
        console.error(e);
    }
};

const deleteItem = (id) => {
    confirm.require({
        message: 'Are you sure you want to delete this song from the wishlist?',
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
                const res = await fetch(`/api/wishlist/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    fetchItems();
                }
            } catch (e) {
                console.error(e);
            }
        }
    });
};

onMounted(() => {
    fetchItems();
});

</script>

<template>
    <div class="h-full flex flex-col p-6 max-w-7xl mx-auto w-full">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
                <h1 class="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <i class="pi pi-bookmark text-moises-accent"></i> Future Songs List
                </h1>
                <p class="text-moises-secondary mt-1">Keep track of songs you want to play or register in the future.</p>
            </div>
            <Button label="Add Song" icon="pi pi-plus" class="bg-moises-accent hover:bg-purple-600 border-none px-6 py-3 rounded-xl shadow-lg shadow-moises-accent/20 transition-all font-semibold max-w-[200px]" @click="openAddDialog" />
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto">
            <div v-if="loading" class="flex justify-center items-center py-20">
                <i class="pi pi-spin pi-spinner text-moises-accent text-4xl"></i>
            </div>
            
            <div v-else-if="items.length === 0" class="flex flex-col items-center justify-center py-20 text-center bg-moises-surface/30 rounded-2xl border border-dashed border-gray-700">
                <div class="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                    <i class="pi pi-bookmark text-gray-400 text-2xl"></i>
                </div>
                <h3 class="text-xl font-bold text-white mb-2">Your wishlist is empty</h3>
                <p class="text-moises-secondary mb-6 max-w-md">Start adding songs you'd like to include in your repertoire.</p>
                <Button label="Add First Song" icon="pi pi-plus" outlined class="text-moises-accent border-moises-accent hover:bg-moises-accent/10" @click="openAddDialog" />
            </div>

            <!-- List View -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="item in items" :key="item.id" class="bg-moises-surface/50 border border-moises-border rounded-xl p-5 flex flex-col gap-3 hover:border-gray-600 transition-colors group relative">
                     <!-- Action buttons (visible on hover) -->
                     <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button icon="pi pi-pencil" text rounded class="text-gray-400 hover:text-white w-8 h-8 p-0" @click="openEditDialog(item)" />
                        <Button icon="pi pi-trash" text rounded class="text-gray-500 hover:text-red-400 w-8 h-8 p-0" @click="deleteItem(item.id)" />
                    </div>

                    <div class="pr-16">
                        <h3 class="text-lg font-bold text-white truncate" :title="item.title">{{ item.title }}</h3>
                        <p class="text-sm text-gray-400 truncate">{{ item.artist || 'Unknown Artist' }}</p>
                    </div>

                    <div class="mt-2 text-sm flex items-center justify-between">
                        <div class="px-2 py-1 rounded inline-flex items-center gap-1.5" :class="item.status === 'pending' ? 'bg-orange-900/40 text-orange-200 border border-orange-800/50' : 'bg-green-900/40 text-green-200 border border-green-800/50'">
                            <span class="w-2 h-2 rounded-full" :class="item.status === 'pending' ? 'bg-orange-400' : 'bg-green-400'"></span>
                            <span class="capitalize text-xs font-medium">{{ item.status }}</span>
                        </div>

                        <!-- YouTube Link if available -->
                        <a v-if="item.youtubeUrl" :href="item.youtubeUrl" target="_blank" class="text-moises-accent hover:text-purple-400 hover:underline flex items-center gap-1 text-xs">
                            <i class="pi pi-youtube"></i> Watch
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add / Edit Dialog -->
        <Dialog v-model:visible="showDialog" :header="editingItem ? 'Edit Future Song' : 'Add Future Song'" :modal="true" :style="{ width: '100%', maxWidth: '450px' }" class="p-fluid">
            <div class="flex flex-col gap-4 mt-2">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">Song Title <span class="text-red-400">*</span></label>
                    <InputText v-model="form.title" placeholder="e.g. Ousado Amor" class="w-full bg-gray-800 border-gray-700 text-white" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">Artist</label>
                    <InputText v-model="form.artist" placeholder="e.g. Isaias Saad" class="w-full bg-gray-800 border-gray-700 text-white" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">YouTube URL</label>
                    <InputText v-model="form.youtubeUrl" placeholder="https://youtube.com/..." class="w-full bg-gray-800 border-gray-700 text-white" />
                </div>
                <div v-if="editingItem">
                    <label class="block text-sm font-medium text-gray-300 mb-1">Status</label>
                    <Dropdown v-model="form.status" :options="statusOptions" optionLabel="label" optionValue="value" class="w-full bg-gray-800 border-gray-700 text-white" />
                </div>
            </div>
            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text class="text-gray-400 hover:text-white" @click="showDialog = false" />
                <Button label="Save" icon="pi pi-check" class="bg-moises-accent hover:bg-purple-600 border-none" @click="saveItem" :disabled="!form.title" />
            </template>
        </Dialog>

        <ConfirmDialog />
    </div>
</template>
