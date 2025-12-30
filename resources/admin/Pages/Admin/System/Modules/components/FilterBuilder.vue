<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import FilterModal from './FilterModal.vue';

const props = defineProps({
    filters: {
        type: Array,
        default: () => [],
    },
    defaultSearch: {
        type: Object,
        default: () => ({
            enabled: true,
            label: 'Search',
            placeholder: 'Search across all columns',
            columns: [],
        }),
    },
    tableName: {
        type: String,
        required: true,
    },
    moduleId: {
        type: [Number, String],
        required: true,
    },
    uiConfig: {
        type: Object,
        default: () => ({}),
    },
    relationships: {
        type: Array,
        default: () => [],
    },
});

const emit = defineEmits(['update:filters', 'update:defaultSearch']);

const filterModalOpen = ref(false);
const editingFilterIndex = ref(null);

const draggedFilterIndex = ref(null);
const draggedOverFilterIndex = ref(null);

const localFilters = ref([...props.filters]);
const localDefaultSearch = ref({ ...props.defaultSearch });

// Flag to prevent recursive updates
let isInternalUpdate = false;
let isMounted = false;

// Helper to deep compare objects
const deepEqual = (a, b) => {
    return JSON.stringify(a) === JSON.stringify(b);
};

// Only sync props to local state when they actually change from outside (not from our emits)
watch(() => props.filters, (newFilters) => {
    if (!isInternalUpdate && !deepEqual(localFilters.value, newFilters)) {
        localFilters.value = [...newFilters];
    }
}, { deep: true });

watch(() => props.defaultSearch, (newDefaultSearch) => {
    if (!isInternalUpdate && !deepEqual(localDefaultSearch.value, newDefaultSearch)) {
        localDefaultSearch.value = { ...newDefaultSearch };
    }
}, { deep: true });

// Emit changes to parent (skip initial emit on mount)
watch(localFilters, (newFilters) => {
    if (!isMounted) return; // Skip initial emit
    if (!isInternalUpdate) {
        isInternalUpdate = true;
        emit('update:filters', newFilters);
        nextTick(() => {
            isInternalUpdate = false;
        });
    }
}, { deep: true });

watch(localDefaultSearch, (newDefaultSearch) => {
    if (!isMounted) return; // Skip initial emit
    if (!isInternalUpdate) {
        isInternalUpdate = true;
        emit('update:defaultSearch', newDefaultSearch);
        nextTick(() => {
            isInternalUpdate = false;
        });
    }
}, { deep: true });

onMounted(() => {
    isMounted = true;
});

const openFilterModal = (index = null) => {
    editingFilterIndex.value = index;
    filterModalOpen.value = true;
};

const closeFilterModal = () => {
    filterModalOpen.value = false;
    editingFilterIndex.value = null;
};

const saveFilter = (filterData) => {
    if (editingFilterIndex.value !== null) {
        // Edit existing filter
        localFilters.value[editingFilterIndex.value] = { ...filterData };
    } else {
        // Add new filter
        localFilters.value.push({ ...filterData });
    }
    closeFilterModal();
};

const removeFilter = (index) => {
    localFilters.value.splice(index, 1);
};

const toggleFilterEnabled = (index) => {
    localFilters.value[index].enabled = !localFilters.value[index].enabled;
};

const getFilterDisplayName = (filter) => {
    if (filter.label) {
        return filter.label;
    }
    if (filter.type === 'search') {
        return 'Search Filter';
    }
    if (filter.type === 'field' && filter.field) {
        return `Field: ${filter.field}`;
    }
    if (filter.type === 'relationship' && filter.relationship) {
        return `Relationship: ${filter.relationship}`;
    }
    return 'Unnamed filter';
};

const getFilterTypeLabel = (type) => {
    const labels = {
        search: 'Search',
        field: 'Field',
        relationship: 'Relationship',
    };
    return labels[type] || type;
};

const handleFilterDragStart = (event, index) => {
    draggedFilterIndex.value = index;
    event.dataTransfer.effectAllowed = 'move';
};

const handleFilterDragEnd = () => {
    draggedFilterIndex.value = null;
    draggedOverFilterIndex.value = null;
};

const handleFilterDragOver = (event, index) => {
    event.preventDefault();
    draggedOverFilterIndex.value = index;
};

const handleFilterDrop = (event, dropIndex) => {
    event.preventDefault();
    
    if (draggedFilterIndex.value === null || draggedFilterIndex.value === dropIndex) {
        draggedFilterIndex.value = null;
        draggedOverFilterIndex.value = null;
        return;
    }
    
    // Reorder filters
    const filters = [...localFilters.value];
    const [dragged] = filters.splice(draggedFilterIndex.value, 1);
    filters.splice(dropIndex, 0, dragged);
    localFilters.value = filters;
    
    draggedFilterIndex.value = null;
    draggedOverFilterIndex.value = null;
};

const editingFilter = computed(() => {
    if (editingFilterIndex.value === null) {
        return null;
    }
    return localFilters.value[editingFilterIndex.value] || null;
});
</script>

<template>
    <div>
        <!-- Default Search Configuration -->
        <div class="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <h5 class="text-sm font-semibold text-gray-900 dark:text-white">Default Search</h5>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Configure the default search field that appears on the index page
                    </p>
                </div>
                <label class="inline-flex items-center">
                    <input
                        v-model="localDefaultSearch.enabled"
                        type="checkbox"
                        class="form-checkbox"
                    />
                    <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Enabled</span>
                </label>
            </div>
            
            <div v-if="localDefaultSearch.enabled" class="grid gap-4 md:grid-cols-2">
                <div>
                    <label class="form-label">Label</label>
                    <input
                        v-model="localDefaultSearch.label"
                        type="text"
                        class="form-input"
                        placeholder="Search"
                    />
                </div>
                <div>
                    <label class="form-label">Placeholder</label>
                    <input
                        v-model="localDefaultSearch.placeholder"
                        type="text"
                        class="form-input"
                        placeholder="Search across all columns"
                    />
                </div>
                <div class="md:col-span-2">
                    <label class="form-label">Columns to Search</label>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Leave empty to search all columns. Select specific columns to limit the search scope.
                    </p>
                    <div class="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                        <label
                            v-for="column in Object.keys(uiConfig)"
                            :key="column"
                            class="inline-flex items-center mr-4 mb-2"
                        >
                            <input
                                :checked="localDefaultSearch.columns.includes(column)"
                                type="checkbox"
                                class="form-checkbox"
                                @change="(e) => {
                                    if (e.target.checked) {
                                        if (!localDefaultSearch.columns.includes(column)) {
                                            localDefaultSearch.columns.push(column);
                                        }
                                    } else {
                                        localDefaultSearch.columns = localDefaultSearch.columns.filter(c => c !== column);
                                    }
                                }"
                            />
                            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">{{ column }}</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>

        <!-- Filters List -->
        <div class="flex items-center justify-between mb-4">
            <div>
                <h5 class="text-sm font-semibold text-gray-900 dark:text-white">Custom Filters</h5>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Add custom filters for the index page (search, field-based, or relationship filters)
                </p>
            </div>
            <button
                type="button"
                @click="openFilterModal()"
                class="btn btn-sm btn-primary"
            >
                Add Filter
            </button>
        </div>
        
        <div v-if="localFilters.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
            No filters defined. Click "Add Filter" to get started.
        </div>
        
        <div v-else class="space-y-2">
            <div
                v-for="(filter, index) in localFilters"
                :key="filter.id || index"
                :draggable="true"
                @dragstart="handleFilterDragStart($event, index)"
                @dragend="handleFilterDragEnd($event)"
                @dragover="handleFilterDragOver($event, index)"
                @drop="handleFilterDrop($event, index)"
                class="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-move transition-colors"
                :class="{
                    'opacity-50': draggedFilterIndex === index,
                    'border-blue-500 bg-blue-50 dark:bg-blue-900/20': draggedOverFilterIndex === index,
                    'opacity-60': !filter.enabled
                }"
            >
                <!-- Drag handle -->
                <div class="flex-shrink-0 text-gray-400 dark:text-gray-500">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                    </svg>
                </div>
                
                <!-- Filter info -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-gray-900 dark:text-white">
                            {{ getFilterDisplayName(filter) }}
                        </span>
                        <span class="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                            {{ getFilterTypeLabel(filter.type) }}
                        </span>
                        <span v-if="!filter.enabled" class="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded">
                            Disabled
                        </span>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span v-if="filter.type === 'search'">
                            Searches: {{ filter.columns && filter.columns.length > 0 ? filter.columns.join(', ') : 'All columns' }}
                        </span>
                        <span v-else-if="filter.type === 'field'">
                            Field: {{ filter.field }} ({{ filter.operator || 'equals' }})
                        </span>
                        <span v-else-if="filter.type === 'relationship'">
                            Relationship: {{ filter.relationship }} ({{ filter.operator || 'equals' }})
                        </span>
                    </p>
                </div>
                
                <!-- Actions -->
                <div class="flex items-center gap-2 flex-shrink-0">
                    <label class="inline-flex items-center">
                        <input
                            :checked="filter.enabled"
                            type="checkbox"
                            class="form-checkbox"
                            @change="toggleFilterEnabled(index)"
                        />
                        <span class="ml-2 text-xs text-gray-600 dark:text-gray-400">Enabled</span>
                    </label>
                    <button
                        type="button"
                        @click="openFilterModal(index)"
                        class="btn btn-sm btn-outline"
                        title="Edit filter"
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        @click="removeFilter(index)"
                        class="btn btn-sm btn-danger"
                        title="Remove filter"
                    >
                        Remove
                    </button>
                </div>
            </div>
        </div>

        <!-- Filter Modal -->
        <FilterModal
            :open="filterModalOpen"
            :filter="editingFilter"
            :table-name="tableName"
            :module-id="moduleId"
            :ui-config="uiConfig"
            :relationships="relationships"
            @close="closeFilterModal"
            @save="saveFilter"
        />
    </div>
</template>

