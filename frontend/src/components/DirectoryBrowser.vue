<script setup>
import { ref, watch, onMounted } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import ListBox from 'primevue/listbox';

const props = defineProps({
    visible: Boolean,
    initialPath: String
});

const emit = defineEmits(['update:visible', 'select']);

const currentPath = ref('');
const directories = ref([]);
const loading = ref(false);

const fetchDirs = async (path) => {
    loading.value = true;
    try {
        const res = await fetch('/api/config/dirs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);

        currentPath.value = data.current;
        directories.value = [
            { name: '.. (Up)', value: data.parent, isParent: true },
            ...data.directories.map(d => ({ name: d, value: `${data.current}/${d}`, isParent: false }))
        ];
    } catch (e) {
        console.error("Failed to browse", e);
    } finally {
        loading.value = false;
    }
};

const handleNavigate = (option) => {
    // If it's a directory, navigate into it
    // Note: PrimeVue ListBox selection might trigger this, need to be careful
    if (option) {
         fetchDirs(option.value);
    }
};

const selectCurrent = () => {
    emit('select', currentPath.value);
    close();
};

const close = () => {
    emit('update:visible', false);
};

// Initial load
watch(() => props.visible, (newVal) => {
    if (newVal) {
        fetchDirs(props.initialPath);
    }
});
</script>

<template>
    <Dialog 
        :visible="visible" 
        @update:visible="emit('update:visible', $event)" 
        modal 
        header="Select Directory" 
        :style="{ width: '50vw' }"
        :closable="true"
    >
        <div class="flex flex-col gap-4">
            <div class="bg-gray-800 p-3 rounded-lg text-sm font-mono text-gray-300 break-all">
                {{ currentPath || 'Loading...' }}
            </div>

            <div class="h-64 overflow-y-auto border border-gray-700 rounded-lg">
                <div v-if="loading" class="p-4 text-center text-gray-400">Loading...</div>
                <div v-else>
                     <div 
                        v-for="dir in directories" 
                        :key="dir.value"
                        @click="handleNavigate(dir)"
                        class="p-3 hover:bg-gray-700 cursor-pointer flex items-center gap-2 border-b border-gray-800 last:border-0"
                    >
                        <i class="pi" :class="dir.isParent ? 'pi-folder-open' : 'pi-folder'"></i>
                        <span>{{ dir.name }}</span>
                    </div>
                </div>
            </div>

            <div class="flex justify-end gap-2">
                <Button label="Cancel" severity="secondary" @click="close" />
                <Button label="Select Current Folder" @click="selectCurrent" />
            </div>
        </div>
    </Dialog>
</template>
