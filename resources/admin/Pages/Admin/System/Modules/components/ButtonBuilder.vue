<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import ButtonModal from './ButtonModal.vue';

const props = defineProps({
    buttons: {
        type: Array,
        default: () => [],
    },
});

const emit = defineEmits(['update:buttons']);

const buttonModalOpen = ref(false);
const editingButtonIndex = ref(null);

const draggedButtonIndex = ref(null);
const draggedOverButtonIndex = ref(null);

const localButtons = ref([...props.buttons]);

// Flag to prevent recursive updates
let isInternalUpdate = false;
let isMounted = false;

// Helper to deep compare objects
const deepEqual = (a, b) => {
    return JSON.stringify(a) === JSON.stringify(b);
};

// Only sync props to local state when they actually change from outside (not from our emits)
watch(() => props.buttons, (newButtons) => {
    if (!isInternalUpdate && !deepEqual(localButtons.value, newButtons)) {
        localButtons.value = [...newButtons];
    }
}, { deep: true });

// Emit changes to parent (skip initial emit on mount)
watch(localButtons, (newButtons) => {
    if (!isMounted) return; // Skip initial emit
    if (!isInternalUpdate) {
        isInternalUpdate = true;
        emit('update:buttons', newButtons);
        nextTick(() => {
            isInternalUpdate = false;
        });
    }
}, { deep: true });

onMounted(() => {
    isMounted = true;
});

const openButtonModal = (index = null) => {
    editingButtonIndex.value = index;
    buttonModalOpen.value = true;
};

const closeButtonModal = () => {
    buttonModalOpen.value = false;
    editingButtonIndex.value = null;
};

const saveButton = (buttonData) => {
    if (editingButtonIndex.value !== null) {
        // Edit existing button
        localButtons.value[editingButtonIndex.value] = { ...buttonData };
    } else {
        // Add new button
        localButtons.value.push({ ...buttonData });
    }
    closeButtonModal();
};

const removeButton = (index) => {
    localButtons.value.splice(index, 1);
};

const toggleButtonEnabled = (index) => {
    localButtons.value[index].enabled = !localButtons.value[index].enabled;
};

const handleButtonDragStart = (event, index) => {
    draggedButtonIndex.value = index;
    event.dataTransfer.effectAllowed = 'move';
};

const handleButtonDragEnd = () => {
    draggedButtonIndex.value = null;
    draggedOverButtonIndex.value = null;
};

const handleButtonDragOver = (event, index) => {
    event.preventDefault();
    draggedOverButtonIndex.value = index;
};

const handleButtonDrop = (event, dropIndex) => {
    event.preventDefault();
    
    if (draggedButtonIndex.value === null || draggedButtonIndex.value === dropIndex) {
        draggedButtonIndex.value = null;
        draggedOverButtonIndex.value = null;
        return;
    }
    
    // Reorder buttons and update order_index
    const buttons = [...localButtons.value];
    const [dragged] = buttons.splice(draggedButtonIndex.value, 1);
    buttons.splice(dropIndex, 0, dragged);
    
    // Update order_index for all buttons
    buttons.forEach((button, idx) => {
        button.order_index = idx;
    });
    
    localButtons.value = buttons;
    
    draggedButtonIndex.value = null;
    draggedOverButtonIndex.value = null;
};

const editingButton = computed(() => {
    if (editingButtonIndex.value === null) {
        return null;
    }
    return localButtons.value[editingButtonIndex.value] || null;
});
</script>

<template>
    <div>
        <!-- Buttons List -->
        <div class="flex items-center justify-between mb-4">
            <div>
                <h5 class="text-sm font-semibold text-gray-900 dark:text-white">Custom Buttons</h5>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Configure custom buttons that appear on the edit record page
                </p>
            </div>
            <button
                type="button"
                @click="openButtonModal()"
                class="btn btn-sm btn-primary"
            >
                Add Button
            </button>
        </div>
        
        <div v-if="localButtons.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
            No buttons defined. Click "Add Button" to get started.
        </div>
        
        <div v-else class="space-y-2">
            <div
                v-for="(button, index) in localButtons"
                :key="button.id || index"
                :draggable="true"
                @dragstart="handleButtonDragStart($event, index)"
                @dragend="handleButtonDragEnd($event)"
                @dragover="handleButtonDragOver($event, index)"
                @drop="handleButtonDrop($event, index)"
                class="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-move transition-colors"
                :class="{
                    'opacity-50': draggedButtonIndex === index,
                    'border-blue-500 bg-blue-50 dark:bg-blue-900/20': draggedOverButtonIndex === index,
                    'opacity-60': !button.enabled
                }"
            >
                <!-- Drag handle -->
                <div class="flex-shrink-0 text-gray-400 dark:text-gray-500">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                    </svg>
                </div>
                
                <!-- Button info -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-gray-900 dark:text-white">
                            {{ button.title || 'Untitled Button' }}
                        </span>
                        <span class="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                            {{ button.method?.toUpperCase() || 'POST' }}
                        </span>
                        <span class="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded">
                            {{ button.route }}
                        </span>
                        <span v-if="!button.enabled" class="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded">
                            Disabled
                        </span>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span v-if="button.variant">Variant: {{ button.variant }}</span>
                        <span v-if="button.icon" class="ml-2">Icon: {{ button.icon }}</span>
                        <span v-if="button.confirm_message" class="ml-2">Requires confirmation</span>
                        <span v-if="button.requires_permission" class="ml-2">Requires permission: {{ button.permission }}</span>
                    </p>
                </div>
                
                <!-- Actions -->
                <div class="flex items-center gap-2 flex-shrink-0">
                    <label class="inline-flex items-center">
                        <input
                            :checked="button.enabled"
                            type="checkbox"
                            class="form-checkbox"
                            @change="toggleButtonEnabled(index)"
                        />
                        <span class="ml-2 text-xs text-gray-600 dark:text-gray-400">Enabled</span>
                    </label>
                    <button
                        type="button"
                        @click="openButtonModal(index)"
                        class="btn btn-sm btn-outline"
                        title="Edit button"
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        @click="removeButton(index)"
                        class="btn btn-sm btn-danger"
                        title="Remove button"
                    >
                        Remove
                    </button>
                </div>
            </div>
        </div>

        <!-- Button Modal -->
        <ButtonModal
            :open="buttonModalOpen"
            :button="editingButton"
            @close="closeButtonModal"
            @save="saveButton"
        />
    </div>
</template>

