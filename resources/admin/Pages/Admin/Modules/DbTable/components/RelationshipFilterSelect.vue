<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import axios from 'axios';
import MultiSelect from './MultiSelect.vue';

const props = defineProps({
    filter: {
        type: Object,
        required: true,
    },
    relationships: {
        type: Array,
        default: () => [],
    },
    moduleHandle: {
        type: String,
        required: true,
    },
    modelValue: {
        type: [String, Number, Array],
        default: null,
    },
});

const emit = defineEmits(['update:modelValue']);

// Find the relationship configuration
const relationship = computed(() => {
    return props.relationships.find(r => r.related_table === props.filter.relationship) || null;
});

const relatedTableName = computed(() => {
    return props.filter.relationship || relationship.value?.related_table || '';
});

const availableRecords = ref([]);
const loading = ref(false);
const searchQuery = ref('');
const requiresSearch = ref(false);
let searchTimeout = null;

// Check if search is required (for large tables)
const checkRecordCount = async () => {
    if (!relatedTableName.value) return;
    
    try {
        const response = await axios.get(`/admin/api/tables/${relatedTableName.value}/count`);
        const count = response.data.count || 0;
        requiresSearch.value = count >= 100;
        
        // Don't auto-load here - let initializeRecords handle it
        // This prevents duplicate calls
    } catch (error) {
        console.error('Error loading record count:', error);
        requiresSearch.value = true;
    }
};

// Load available records
const loadAvailableRecords = async () => {
    if (!relatedTableName.value) {
        availableRecords.value = [];
        return;
    }
    
    // For single select, always load records (even if requiresSearch is true, show first page)
    // For multiple select with requiresSearch, load first page when dropdown opens
    // The user can then search for more specific records
    // Note: We allow loading even with empty search for initial display
    
    loading.value = true;
    try {
        const response = await axios.get(`/admin/api/tables/${relatedTableName.value}/records`, {
            params: {
                search: searchQuery.value || '',
                per_page: requiresSearch.value ? 50 : 100,
            },
        });
        const records = response.data.records || [];
        const recordsArray = Array.isArray(records) ? records : [];
        
        // Force reactivity by creating a new array
        availableRecords.value = [...recordsArray];
        
        // Debug logging
        console.log('RelationshipFilterSelect - Loaded and set records:', {
            tableName: relatedTableName.value,
            recordsCount: recordsArray.length,
            availableRecordsCount: availableRecords.value.length,
            firstRecord: availableRecords.value[0],
            isMultiple: isMultiple.value
        });
        
        if (recordsArray.length === 0) {
            console.warn('No records returned from API:', response.data);
        }
    } catch (error) {
        console.error('Error loading records:', error);
        console.error('Error details:', error.response?.data);
        availableRecords.value = [];
    } finally {
        loading.value = false;
    }
};

// Watch search query with debounce
watch(searchQuery, () => {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
        if (requiresSearch.value) {
            loadAvailableRecords();
        }
    }, 300);
});

// Check if multiple selection is enabled
const isMultiple = computed(() => props.filter.multiple || false);

// Track if we've already initialized to prevent duplicate loads
let isInitialized = false;
let isLoading = false;

// Initialize records loading
const initializeRecords = async () => {
    if (isInitialized || isLoading) return;
    if (!relatedTableName.value) return;
    
    isLoading = true;
    try {
        await checkRecordCount();
        // For both single and multiple select, load records on mount
        // This ensures options are available when dropdown opens
        await loadAvailableRecords();
        isInitialized = true;
    } finally {
        isLoading = false;
    }
};

// Initialize on mount
onMounted(async () => {
    await initializeRecords();
});

// Handle value changes
const updateValue = (value) => {
    emit('update:modelValue', value);
};

// Helper to get primary key from a record
const getRecordId = (record) => {
    // Try common primary key names
    return record.id || record.ID || record[Object.keys(record)[0]] || null;
};

// Helper to get display text from a record
const getRecordDisplay = (record) => {
    return record.title || record.name || record.label || record.title || 
           record[Object.keys(record).find(k => k.toLowerCase().includes('name'))] ||
           record[Object.keys(record).find(k => k.toLowerCase().includes('title'))] ||
           `#${getRecordId(record)}`;
};

// Get display value for selected record(s)
const getDisplayValue = (recordId) => {
    const record = availableRecords.value.find(r => String(getRecordId(r)) === String(recordId));
    if (record) {
        return getRecordDisplay(record);
    }
    return `#${recordId}`;
};

// Format records as options for MultiSelect
const recordOptions = computed(() => {
    const options = availableRecords.value.map(record => {
        const primaryKey = getRecordId(record);
        const displayText = getRecordDisplay(record);
        
        return {
            key: String(primaryKey),
            id: primaryKey,
            value: String(primaryKey),
            label: displayText,
            title: record.title || record.name || record.label,
            name: record.name || record.title,
        };
    });
    
    console.log('RelationshipFilterSelect - recordOptions computed:', {
        availableRecordsCount: availableRecords.value.length,
        optionsCount: options.length,
        options: options
    });
    
    return options;
});

// Watch for records changes and update options
watch(availableRecords, (newRecords) => {
    console.log('RelationshipFilterSelect - availableRecords changed:', {
        count: newRecords.length,
        records: newRecords,
        firstRecordId: newRecords[0] ? getRecordId(newRecords[0]) : null,
        firstRecordDisplay: newRecords[0] ? getRecordDisplay(newRecords[0]) : null
    });
}, { deep: true, immediate: true });

// Watch for relationship changes and load records (only once)
watch(relatedTableName, async (newTableName, oldTableName) => {
    if (newTableName && newTableName !== oldTableName) {
        // Reset initialization when relationship changes
        isInitialized = false;
        await initializeRecords();
    }
});

// Handle value changes for MultiSelect
const handleMultiSelectChange = (value) => {
    emit('update:modelValue', value);
};

// Get current value as array for MultiSelect
const multiSelectValue = computed(() => {
    if (isMultiple.value) {
        if (Array.isArray(props.modelValue)) {
            return props.modelValue.map(v => String(v));
        }
        return props.modelValue ? [String(props.modelValue)] : [];
    }
    return [];
});

// Expose method to load records when dropdown opens (for MultiSelect)
const loadRecordsForMultiSelect = async (searchTerm = '') => {
    console.log('RelationshipFilterSelect - loadRecordsForMultiSelect called:', {
        searchTerm,
        currentSearchQuery: searchQuery.value,
        requiresSearch: requiresSearch.value,
        isMultiple: isMultiple.value,
        alreadyLoaded: availableRecords.value.length > 0
    });
    
    // If records are already loaded and search term is empty, don't reload
    if (availableRecords.value.length > 0 && !searchTerm.trim()) {
        console.log('RelationshipFilterSelect - Records already loaded, skipping API call');
        return;
    }
    
    searchQuery.value = searchTerm;
    await loadAvailableRecords();
};

// Expose load function for external use
defineExpose({
    loadRecordsForMultiSelect,
});
</script>

<template>
    <div class="relative">
        <!-- Single Select -->
        <div v-if="!isMultiple" class="relative">
            <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-2">
                Loading...
            </div>
            <select
                v-else
                :key="`select-${relatedTableName}-${availableRecords.length}`"
                :value="modelValue"
                @change="updateValue($event.target.value)"
                class="form-select text-sm"
            >
                <option value="">{{ filter.placeholder || 'Select...' }}</option>
                <option
                    v-for="record in availableRecords"
                    :key="`option-${getRecordId(record)}`"
                    :value="getRecordId(record)"
                >
                    {{ getRecordDisplay(record) }}
                </option>
            </select>
            <div v-if="!loading && availableRecords.length === 0" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                No records found
            </div>
            <!-- Debug info -->
            <div v-if="!loading && availableRecords.length > 0" class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {{ availableRecords.length }} option(s) loaded
            </div>
        </div>
        
        <!-- Multiple Select using MultiSelect component -->
        <div v-else>
            <MultiSelect
                :options="recordOptions"
                :model-value="multiSelectValue"
                :placeholder="filter.placeholder || 'Select...'"
                :searchable="true"
                :on-search="loadRecordsForMultiSelect"
                @update:model-value="handleMultiSelectChange"
            />
            <!-- Debug info -->
            <div v-if="loading" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Loading records...
            </div>
            <div v-else class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {{ recordOptions.length }} option(s) available, {{ availableRecords.length }} record(s) loaded
            </div>
        </div>
    </div>
</template>

