<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { Link } from '@inertiajs/vue3';
import axios from 'axios';
import { confirmDialog } from '@/utils/confirmDialog.js';
import RelationshipEditForm from './RelationshipEditForm.vue';
import { useTranslation } from '@admin/js/utils/useTranslation';

const { t } = useTranslation();

const props = defineProps({
    relationship: {
        type: Object,
        required: true,
    },
    records: {
        type: Array,
        default: () => [],
    },
    pagination: {
        type: Object,
        default: null,
    },
    primaryKeyColumn: {
        type: String,
        default: 'id',
    },
    relatedTableName: {
        type: String,
        required: true,
    },
    moduleHandle: {
        type: String,
        required: true,
    },
    recordId: {
        type: [String, Number],
        required: true,
    },
    onRemove: {
        type: Function,
        default: null,
    },
});

const emit = defineEmits(['removed', 'edit', 'pageChange']);

const isHasMany = computed(() => {
    return props.relationship.type === 'hasMany';
});

const hasPagination = computed(() => {
    return isHasMany.value && props.pagination !== null;
});

const goToPage = (page) => {
    if (props.pagination && page >= 1 && page <= props.pagination.last_page) {
        emit('pageChange', page);
    }
};

const getPageNumbers = () => {
    if (!props.pagination) {
        return [];
    }
    
    const current = props.pagination.current_page;
    const last = props.pagination.last_page;
    const pages = [];
    
    // Show max 5 page numbers
    let start = Math.max(1, current - 2);
    let end = Math.min(last, current + 2);
    
    // Adjust if we're near the start or end
    if (end - start < 4) {
        if (start === 1) {
            end = Math.min(last, start + 4);
        } else {
            start = Math.max(1, end - 4);
        }
    }
    
    for (let i = start; i <= end; i++) {
        pages.push(i);
    }
    
    return pages;
};

const editingRecordId = ref(null);
const selectedRelatedId = ref(null);
const editModalOpen = ref(false);
const editingRecord = ref(null);

// For belongsTo select dropdown
const belongsToOptions = ref([]);
const belongsToLoading = ref(false);
const belongsToSearchQuery = ref('');
const belongsToTotalCount = ref(null);
const belongsToRequiresSearch = ref(false);
let belongsToSearchTimeout = null;

const showViewButton = computed(() => {
    // Don't show View button for belongsToMany and belongsTo
    // (View button is not needed for these relationship types)
    return false;
});

const showEditButton = computed(() => {
    // Show Edit button for hasMany, hasOne, and belongsTo
    return ['hasMany', 'hasOne', 'belongsTo'].includes(props.relationship.type);
});

const isBelongsTo = computed(() => {
    return props.relationship.type === 'belongsTo';
});

// Check total count for belongsTo select
const checkBelongsToCount = async () => {
    if (!props.relatedTableName || !props.relatedTableName.trim()) {
        return;
    }
    
    try {
        const response = await axios.get(`/admin/api/tables/${props.relatedTableName}/count`);
        belongsToTotalCount.value = response.data.count || 0;
        belongsToRequiresSearch.value = belongsToTotalCount.value >= 100;
        
        // If less than 100 records, load them all immediately
        if (!belongsToRequiresSearch.value) {
            loadBelongsToOptions();
        }
    } catch (error) {
        console.error('Error loading record count:', error);
        // Default to requiring search if count fails
        belongsToRequiresSearch.value = true;
    }
};

// Load options for belongsTo select
const loadBelongsToOptions = async () => {
    if (!props.relatedTableName || !props.relatedTableName.trim()) {
        belongsToOptions.value = [];
        return;
    }
    
    // If search is required and no query provided, don't load
    if (belongsToRequiresSearch.value && !belongsToSearchQuery.value.trim()) {
        belongsToOptions.value = [];
        return;
    }
    
    belongsToLoading.value = true;
    const url = `/admin/api/tables/${props.relatedTableName}/records`;
    const params = {
        search: belongsToSearchQuery.value || '',
        per_page: belongsToRequiresSearch.value ? 50 : 100,
    };
    
    try {
        const response = await axios.get(url, { params });
        belongsToOptions.value = response.data.records || [];
    } catch (error) {
        console.error('Error loading belongsTo options:', error);
        belongsToOptions.value = [];
    } finally {
        belongsToLoading.value = false;
    }
};

// Watch search query with debounce
watch(belongsToSearchQuery, () => {
    if (belongsToSearchTimeout) {
        clearTimeout(belongsToSearchTimeout);
    }
    
    belongsToSearchTimeout = setTimeout(() => {
        if (belongsToRequiresSearch.value) {
            loadBelongsToOptions();
        }
    }, 300);
});

const getBelongsToOptionLabel = (record) => {
    // Try common title fields
    const titleFields = ['title', 'name', 'label', 'email'];
    for (const field of titleFields) {
        if (record[field]) {
            return record[field];
        }
    }
    // Fallback to primary key
    return `Record #${record[props.primaryKeyColumn]}`;
};

const startEdit = (recordId) => {
    // For hasMany and hasOne, open modal instead of inline edit
    if (props.relationship.type === 'hasMany' || props.relationship.type === 'hasOne') {
        const record = props.records.find(r => getRecordId(r) === recordId);
        if (record) {
            editingRecord.value = record;
            editModalOpen.value = true;
        }
        emit('edit', recordId);
        return;
    }
    
    // For belongsTo, use inline edit (select dropdown)
    editingRecordId.value = recordId;
    if (isBelongsTo.value) {
        // For belongsTo, pre-select the current related record
        selectedRelatedId.value = recordId;
        // Load options when editing starts
        checkBelongsToCount();
    }
    emit('edit', recordId);
};

const cancelEdit = () => {
    editingRecordId.value = null;
    selectedRelatedId.value = null;
    belongsToOptions.value = [];
    belongsToSearchQuery.value = '';
    editModalOpen.value = false;
    editingRecord.value = null;
};

const handleUpdated = () => {
    editingRecordId.value = null;
    selectedRelatedId.value = null;
    belongsToOptions.value = [];
    belongsToSearchQuery.value = '';
    editModalOpen.value = false;
    editingRecord.value = null;
    emit('updated'); // Trigger reload
};

const closeEditModal = () => {
    editModalOpen.value = false;
    editingRecord.value = null;
};

const handleBelongsToUpdate = async () => {
    const newRelatedId = selectedRelatedId.value;
    
    // Allow null/empty to unset the relationship
    try {
        const response = await axios.put(`/admin/${props.moduleHandle}/relationships/${props.relationship.name || props.relationship.related_table}/update`, {
            record_id: props.recordId,
            related_record_id: newRelatedId || null,
        });
        
        if (response.data.success) {
            handleUpdated();
        } else {
            alert(response.data.error || t('admin.errors.relationship_attach_failed'));
        }
    } catch (error) {
        console.error('Error updating belongsTo relationship:', error);
        alert(error.response?.data?.error || error.message || t('admin.errors.relationship_attach_failed'));
    }
};

const getRecordLabel = (record) => {
    // Try common title fields
    const titleFields = ['title', 'name', 'label', 'email'];
    for (const field of titleFields) {
        if (record[field]) {
            return record[field];
        }
    }
    // Fallback to primary key
    return `Record #${record[props.primaryKeyColumn]}`;
};

// Get display columns from relationship UI config
const getDisplayColumns = () => {
    // First try ui_config (new format)
    let uiConfig = null;
    if (props.relationship.ui_config) {
        try {
            uiConfig = typeof props.relationship.ui_config === 'string' 
                ? JSON.parse(props.relationship.ui_config) 
                : props.relationship.ui_config;
        } catch (e) {
            console.error('Failed to parse UI config:', e);
        }
    }
    
    if (uiConfig && typeof uiConfig === 'object') {
        // Get actual column names from the records (to filter out non-existent columns)
        const actualColumns = new Set();
        if (props.records && props.records.length > 0) {
            props.records.forEach(record => {
                Object.keys(record).forEach(key => {
                    actualColumns.add(key);
                });
            });
        }
        
        // Get columns with show_in_list = true, but only if they exist in actual records
        const visibleColumns = [];
        Object.keys(uiConfig).forEach(columnName => {
            // Only include if column exists in actual records
            if (actualColumns.size === 0 || actualColumns.has(columnName)) {
                const config = uiConfig[columnName];
                if (config && (config.show_in_list !== false)) {
                    visibleColumns.push({
                        name: columnName,
                        title: config.title || columnName,
                        interface: config.interface || 'text',
                    });
                }
            }
        });
        if (visibleColumns.length > 0) {
            return visibleColumns;
        }
    }
    
    // Fallback to display_columns (old format) for backward compatibility
    const displayColumns = props.relationship.display_columns;
    if (displayColumns && displayColumns.trim()) {
        return displayColumns.split(',').map(col => col.trim()).filter(col => col).map(col => ({
            name: col,
            title: col,
            interface: 'text',
        }));
    }
    
    return null; // Use default display
};

const displayColumns = computed(() => getDisplayColumns());

const getRecordId = (record) => {
    return record[props.primaryKeyColumn] ?? record.id;
};

const removeRelationship = async (relatedRecordId, event) => {
    // Prevent any default behavior or event propagation
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Find the record to get a label for the confirmation message
    const record = props.records.find(r => getRecordId(r) === relatedRecordId);
    const recordLabel = record ? getRecordLabel(record) : `Record #${relatedRecordId}`;
    
    const confirmed = await confirmDialog({
        title: t('admin.relationships.remove_relationship'),
        message: `${t('admin.relationships.remove')} "${recordLabel}" ${t('admin.common.from')} ${t('admin.common.this')} ${t('admin.relationships.title').toLowerCase()}?`,
        confirmLabel: t('admin.relationships.remove'),
        intent: 'danger',
    });
    
    if (!confirmed) {
        return;
    }
    
    const relationshipName = props.relationship.name || props.relationship.related_table || 'relationship';
    
    try {
        const response = await axios.delete(`/admin/${props.moduleHandle}/relationships/${relationshipName}/detach`, {
            data: {
                record_id: props.recordId,
                related_id: relatedRecordId,
            },
        });
        
        if (response.data.success) {
            emit('removed', relatedRecordId);
            if (props.onRemove) {
                props.onRemove(relatedRecordId);
            }
        } else {
            alert(response.data.error || t('admin.errors.relationship_detach_failed'));
        }
    } catch (error) {
        console.error('Error removing relationship:', error);
        alert(error.response?.data?.error || error.message || t('admin.errors.relationship_detach_failed'));
    }
};

const canRemove = computed(() => {
    // Allow removal for belongsToMany, hasMany, and hasOne
    return ['belongsToMany', 'hasMany', 'hasOne'].includes(props.relationship.type);
});

// Format value based on column interface
const formatValue = (value, column) => {
    if (value === null || value === undefined) {
        return '-';
    }
    
    const columnConfig = typeof column === 'object' ? column : { interface: 'text' };
    const interfaceType = columnConfig.interface || 'text';
    
    if (interfaceType === 'checkbox') {
        return value ? 'Yes' : 'No';
    }
    
    if (interfaceType === 'datetime') {
        // Try to parse as date
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date.toLocaleString();
        }
    }
    
    return String(value);
};
</script>

<template>
    <div class="space-y-2">
        <div v-if="records.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            {{ t('admin.common.no_results') }}
        </div>
        
        <!-- Table view if display columns are configured -->
        <div v-else-if="displayColumns && displayColumns.length > 0" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <th
                            v-for="column in displayColumns"
                            :key="column.name || column"
                            class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                            {{ typeof column === 'object' ? column.title : column }}
                        </th>
                        <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {{ t('admin.common.actions') }}
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    <template v-for="record in records" :key="getRecordId(record)">
                        <!-- Edit form/selector row -->
                        <tr v-if="editingRecordId === getRecordId(record)" class="bg-white dark:bg-gray-800">
                            <td :colspan="displayColumns.length + 1" class="px-4 py-4">
                                <!-- For belongsTo, show select dropdown -->
                                <div v-if="isBelongsTo" class="space-y-4">
                                    <div class="flex items-center justify-between mb-4">
                                        <h6 class="text-sm font-medium text-gray-900 dark:text-white">
                                            {{ t('admin.relationships.select_related_record') }}
                                        </h6>
                                        <div class="flex items-center gap-2">
                                            <button
                                                type="button"
                                                @click.prevent="handleBelongsToUpdate"
                                                class="btn btn-sm btn-primary"
                                                :disabled="belongsToLoading"
                                            >
                                                {{ t('admin.common.save') }}
                                            </button>
                                            <button
                                                type="button"
                                                @click.prevent="cancelEdit"
                                                class="btn btn-sm btn-outline"
                                            >
                                                {{ t('admin.common.cancel') }}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <!-- Search input if more than 100 records -->
                                    <div v-if="belongsToRequiresSearch" class="mb-4">
                                        <label class="form-label">{{ t('admin.common.search') }}</label>
                                        <input
                                            v-model="belongsToSearchQuery"
                                            type="text"
                                            class="form-input"
                                            :placeholder="t('admin.common.search')"
                                            :disabled="belongsToLoading"
                                        />
                                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            {{ belongsToTotalCount }} {{ t('admin.common.records_available') }}. {{ t('admin.common.type_to_search') }}.
                                        </p>
                                    </div>
                                    
                                    <!-- Select dropdown -->
                                    <div>
                                        <label class="form-label">{{ t('admin.relationships.select_related_record') }}</label>
                                        <select
                                            v-model="selectedRelatedId"
                                            class="form-select"
                                            :disabled="belongsToLoading || (belongsToRequiresSearch && !belongsToSearchQuery.trim())"
                                        >
                                            <option :value="null">-- {{ t('admin.common.none') }} --</option>
                                            <option
                                                v-for="option in belongsToOptions"
                                                :key="option[primaryKeyColumn]"
                                                :value="option[primaryKeyColumn]"
                                            >
                                                {{ getBelongsToOptionLabel(option) }}
                                            </option>
                                        </select>
                                        <p v-if="belongsToLoading" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            {{ t('admin.common.loading') }}
                                        </p>
                                        <p v-else-if="belongsToRequiresSearch && !belongsToSearchQuery.trim()" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            {{ t('admin.common.please_search') }}
                                        </p>
                                        <p v-else-if="belongsToOptions.length === 0 && belongsToSearchQuery.trim()" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            {{ t('admin.common.no_results') }}
                                        </p>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        
                                <!-- Record row -->
                                <tr
                                    v-else
                                    class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                >
                                    <td
                                        v-for="column in displayColumns"
                                        :key="column.name || column"
                                        class="px-4 py-2 text-sm text-gray-900 dark:text-gray-100"
                                    >
                                        {{ formatValue(record[typeof column === 'object' ? column.name : column], column) }}
                                    </td>
                            <td class="px-4 py-2 text-sm font-medium text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <Link
                                        v-if="showViewButton"
                                        :href="`/admin/${relatedTableName}/edit?id=${getRecordId(record)}`"
                                        class="btn btn-sm btn-outline"
                                        target="_blank"
                                    >
                                        View
                                    </Link>
                                    <button
                                        v-if="showEditButton"
                                        type="button"
                                        @click.prevent="startEdit(getRecordId(record))"
                                        class="btn btn-sm btn-outline"
                                        :title="t('admin.common.edit')"
                                    >
                                        {{ t('admin.common.edit') }}
                                    </button>
                                    <button
                                        v-if="canRemove"
                                        type="button"
                                        @click.prevent="removeRelationship(getRecordId(record), $event)"
                                        class="btn btn-sm btn-danger"
                                        :title="t('admin.relationships.remove_relationship')"
                                    >
                                        {{ t('admin.relationships.remove') }}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
        
        <!-- Default card view if no display columns configured -->
        <div v-else class="space-y-2">
            <!-- For hasOne, show message if no record exists -->
            <div v-if="relationship.type === 'hasOne' && records.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                {{ t('admin.relationships.no_record') }}. {{ t('admin.common.click_add_to_create') }}.
            </div>
            
            <template v-for="record in records" :key="getRecordId(record)">
                <!-- Edit form/selector -->
                <div v-if="editingRecordId === getRecordId(record)" class="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <!-- For belongsTo, show select dropdown -->
                    <div v-if="isBelongsTo" class="space-y-4">
                        <div class="flex items-center justify-between mb-4">
                            <h6 class="text-sm font-medium text-gray-900 dark:text-white">
                                Select Related Record
                            </h6>
                            <div class="flex items-center gap-2">
                                <button
                                    type="button"
                                    @click.prevent="handleBelongsToUpdate"
                                    class="btn btn-sm btn-primary"
                                    :disabled="belongsToLoading"
                                >
                                    Save
                                </button>
                                <button
                                    type="button"
                                    @click.prevent="cancelEdit"
                                    class="btn btn-sm btn-outline"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                        
                        <!-- Search input if more than 100 records -->
                        <div v-if="belongsToRequiresSearch" class="mb-4">
                            <label class="form-label">Search</label>
                            <input
                                v-model="belongsToSearchQuery"
                                type="text"
                                class="form-input"
                                :placeholder="t('admin.common.type_to_search')"
                                :disabled="belongsToLoading"
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ belongsToTotalCount }} {{ t('admin.common.records_available') }}. {{ t('admin.common.type_to_search') }}.
                            </p>
                        </div>
                        
                        <!-- Select dropdown -->
                        <div>
                            <label class="form-label">Related Record</label>
                            <select
                                v-model="selectedRelatedId"
                                class="form-select"
                                :disabled="belongsToLoading || (belongsToRequiresSearch && !belongsToSearchQuery.trim())"
                            >
                                <option :value="null">-- None --</option>
                                <option
                                    v-for="option in belongsToOptions"
                                    :key="option[primaryKeyColumn]"
                                    :value="option[primaryKeyColumn]"
                                >
                                    {{ getBelongsToOptionLabel(option) }}
                                </option>
                            </select>
                            <p v-if="belongsToLoading" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Loading...
                            </p>
                            <p v-else-if="belongsToRequiresSearch && !belongsToSearchQuery.trim()" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ t('admin.common.please_search') }}
                            </p>
                            <p v-else-if="belongsToOptions.length === 0 && belongsToSearchQuery.trim()" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ t('admin.common.no_results') }}
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Record display -->
                <div
                    v-else
                    class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                    <div class="flex-1">
                        <p class="text-sm font-medium text-gray-900 dark:text-white">
                            {{ getRecordLabel(record) }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            ID: {{ getRecordId(record) }}
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <Link
                            v-if="showViewButton"
                            :href="`/admin/${relatedTableName}/edit?id=${getRecordId(record)}`"
                            class="btn btn-sm btn-outline"
                            target="_blank"
                        >
                            View
                        </Link>
                        <button
                            v-if="showEditButton"
                            type="button"
                            @click.prevent="startEdit(getRecordId(record))"
                            class="btn btn-sm btn-outline"
                            :title="t('admin.common.edit')"
                        >
                            Edit
                        </button>
                        <button
                            v-if="canRemove"
                            type="button"
                            @click.prevent="removeRelationship(getRecordId(record), $event)"
                            class="btn btn-sm btn-danger"
                            title="Remove relationship"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            </template>
        </div>
        
        <!-- Pagination for hasMany relationships -->
        <div v-if="hasPagination && props.pagination" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
                <div class="text-sm text-gray-600 dark:text-gray-400">
                    {{ t('admin.common.showing') }} {{ props.pagination.from }} {{ t('admin.common.to') }} {{ props.pagination.to }} {{ t('admin.common.of') }} {{ props.pagination.total }} {{ t('admin.common.records') }}
                </div>
                <div class="flex items-center gap-2">
                    <button
                        type="button"
                        @click.prevent="goToPage(props.pagination.current_page - 1)"
                        :disabled="props.pagination.current_page === 1"
                        class="btn btn-sm btn-outline"
                        :class="{ 'opacity-50 cursor-not-allowed': props.pagination.current_page === 1 }"
                    >
                        {{ t('admin.common.previous') }}
                    </button>
                    <div class="flex items-center gap-1">
                        <button
                            v-for="page in getPageNumbers()"
                            :key="page"
                            type="button"
                            @click.prevent="goToPage(page)"
                            class="px-3 py-1 text-sm rounded"
                            :class="page === props.pagination.current_page
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
                        >
                            {{ page }}
                        </button>
                    </div>
                    <button
                        type="button"
                        @click.prevent="goToPage(props.pagination.current_page + 1)"
                        :disabled="props.pagination.current_page === props.pagination.last_page"
                        class="btn btn-sm btn-outline"
                        :class="{ 'opacity-50 cursor-not-allowed': props.pagination.current_page === props.pagination.last_page }"
                    >
                        {{ t('admin.common.next') }}
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Edit Modal for hasMany and hasOne -->
        <div
            v-if="editModalOpen && editingRecord && (relationship.type === 'hasMany' || relationship.type === 'hasOne')"
            class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4"
            @click.self="closeEditModal"
        >
            <div class="w-full max-w-4xl rounded-2xl bg-white dark:bg-gray-800 shadow-xl flex flex-col max-h-[90vh]">
                <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                        {{ t('admin.relationships.edit_relationship') }}
                    </h3>
                    <button
                        type="button"
                        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        @click="closeEditModal"
                    >
                        ✕
                    </button>
                </div>
                <div class="px-6 py-4 overflow-y-auto flex-1">
                    <RelationshipEditForm
                        :relationship="relationship"
                        :module-handle="moduleHandle"
                        :record-id="recordId"
                        :related-record-id="getRecordId(editingRecord)"
                        :primary-key-column="primaryKeyColumn"
                        :related-table-name="relatedTableName"
                        @updated="handleUpdated"
                        @cancel="closeEditModal"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

