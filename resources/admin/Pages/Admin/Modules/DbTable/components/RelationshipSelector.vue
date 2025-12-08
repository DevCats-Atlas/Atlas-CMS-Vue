<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import axios from 'axios';

const props = defineProps({
    relationship: {
        type: Object,
        required: true,
    },
    selectedIds: {
        type: Array,
        default: () => [],
    },
    relatedTableName: {
        type: String,
        required: true,
    },
    primaryKeyColumn: {
        type: String,
        default: 'id',
    },
    moduleHandle: {
        type: String,
        required: true,
    },
});

const emit = defineEmits(['update:selectedIds']);

const availableRecords = ref([]);
const loading = ref(false);
const loadingCount = ref(false);
const searchQuery = ref('');
const totalCount = ref(null);
const requiresSearch = ref(false);
let searchTimeout = null;

// Check total count and determine if search is required
const checkRecordCount = async () => {
    if (!props.relatedTableName || !props.relatedTableName.trim()) {
        return;
    }
    
    loadingCount.value = true;
    try {
        const response = await axios.get(`/admin/api/tables/${props.relatedTableName}/count`);
        totalCount.value = response.data.count || 0;
        requiresSearch.value = totalCount.value >= 100;
        
        // If less than 100 records, load them all immediately
        if (!requiresSearch.value) {
            loadAvailableRecords();
        }
    } catch (error) {
        console.error('Error loading record count:', error);
        // Default to requiring search if count fails
        requiresSearch.value = true;
    } finally {
        loadingCount.value = false;
    }
};

// Load available records from related table
const loadAvailableRecords = async () => {
    if (!props.relatedTableName || !props.relatedTableName.trim()) {
        console.warn('Related table name is not provided:', props.relatedTableName);
        availableRecords.value = [];
        return;
    }
    
    // If search is required and no query provided, don't load
    if (requiresSearch.value && !searchQuery.value.trim()) {
        availableRecords.value = [];
        return;
    }
    
    loading.value = true;
    const url = `/admin/api/tables/${props.relatedTableName}/records`;
    const params = {
        search: searchQuery.value || '',
        per_page: requiresSearch.value ? 50 : 100, // Limit results when searching
    };
    
    try {
        const response = await axios.get(url, { params });
        availableRecords.value = response.data.records || [];
    } catch (error) {
        console.error('Error loading available records:', error);
        console.error('URL:', url);
        console.error('Error response:', error.response?.data || error.message);
        availableRecords.value = [];
    } finally {
        loading.value = false;
    }
};

const isSingleSelection = computed(() => {
    return props.relationship.type === 'belongsTo' || props.relationship.type === 'hasOne';
});

const toggleSelection = (recordId) => {
    const currentIds = [...props.selectedIds];
    const index = currentIds.indexOf(recordId);
    
    if (index > -1) {
        // If single selection, allow deselecting (set to empty)
        if (isSingleSelection.value) {
            currentIds.splice(0, currentIds.length);
        } else {
            // Multiple selection - remove
            currentIds.splice(index, 1);
        }
    } else {
        if (isSingleSelection.value) {
            // Single selection - replace
            currentIds.splice(0, currentIds.length, recordId);
        } else {
            // Multiple selection - add
            currentIds.push(recordId);
        }
    }
    
    emit('update:selectedIds', currentIds);
};

const isSelected = (recordId) => {
    return props.selectedIds.includes(recordId);
};

const getRecordLabel = (record) => {
    const titleFields = ['title', 'name', 'label', 'email'];
    for (const field of titleFields) {
        if (record[field]) {
            return record[field];
        }
    }
    return `Record #${record[props.primaryKeyColumn] ?? record.id}`;
};

// Debounce search to avoid too many requests
watch(searchQuery, () => {
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Set new timeout - wait 300ms after user stops typing
    searchTimeout = setTimeout(() => {
        loadAvailableRecords();
    }, 300);
});

onMounted(() => {
    checkRecordCount();
});
</script>

<template>
    <div class="space-y-4">
        <!-- Search -->
        <div>
            <input
                v-model="searchQuery"
                type="text"
                class="form-input"
                :placeholder="requiresSearch ? 'Type to search records (required for large datasets)...' : 'Search records...'"
            />
            <p v-if="requiresSearch && totalCount !== null" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ totalCount }} records found. Please enter a search query to filter results.
            </p>
            <p v-else-if="!requiresSearch && totalCount !== null" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Showing all {{ totalCount }} records
            </p>
            <p v-if="searchQuery && !loading" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Searching for "{{ searchQuery }}"...
            </p>
        </div>

        <!-- Loading count state -->
        <div v-if="loadingCount" class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            Checking record count...
        </div>

        <!-- Loading state -->
        <div v-else-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            Loading records...
        </div>
        
        <!-- Prompt for search if required -->
        <div v-else-if="requiresSearch && !searchQuery.trim() && availableRecords.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p class="mb-2">This table has {{ totalCount }} records.</p>
            <p>Please enter a search query above to filter and view records.</p>
        </div>

        <!-- Records list -->
        <div v-else class="space-y-2 max-h-96 overflow-y-auto">
            <div
                v-for="record in availableRecords"
                :key="record[primaryKeyColumn] ?? record.id"
                class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                @click="toggleSelection(record[primaryKeyColumn] ?? record.id)"
            >
                <input
                    :type="isSingleSelection ? 'radio' : 'checkbox'"
                    :checked="isSelected(record[primaryKeyColumn] ?? record.id)"
                    :name="isSingleSelection ? `relationship-${relationship.name || relationship.related_table}` : undefined"
                    :class="isSingleSelection ? 'form-radio' : 'form-checkbox'"
                    @click.stop="toggleSelection(record[primaryKeyColumn] ?? record.id)"
                />
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ getRecordLabel(record) }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ID: {{ record[primaryKeyColumn] ?? record.id }}
                    </p>
                </div>
            </div>
            
            <div v-if="availableRecords.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                No records found.
            </div>
        </div>

        <!-- Selected count -->
        <div v-if="selectedIds.length > 0" class="text-sm text-gray-600 dark:text-gray-400">
            {{ selectedIds.length }} record(s) selected
        </div>
    </div>
</template>

