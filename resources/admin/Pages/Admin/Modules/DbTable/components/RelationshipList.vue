<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { Link } from '@inertiajs/vue3';
import axios from 'axios';
import { confirmDialog } from '@/utils/confirmDialog.js';
import RelationshipEditForm from './RelationshipEditForm.vue';

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
};

const handleUpdated = () => {
    editingRecordId.value = null;
    selectedRelatedId.value = null;
    belongsToOptions.value = [];
    belongsToSearchQuery.value = '';
    emit('removed'); // Trigger reload
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
            alert(response.data.error || 'Failed to update relationship');
        }
    } catch (error) {
        console.error('Error updating belongsTo relationship:', error);
        alert(error.response?.data?.error || error.message || 'Failed to update relationship');
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

// Get display columns from relationship config
const getDisplayColumns = () => {
    const displayColumns = props.relationship.display_columns;
    if (!displayColumns || !displayColumns.trim()) {
        return null; // Use default display
    }
    return displayColumns.split(',').map(col => col.trim()).filter(col => col);
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
        title: 'Remove relationship',
        message: `Remove "${recordLabel}" from this relationship?`,
        confirmLabel: 'Remove',
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
            alert(response.data.error || 'Failed to remove relationship');
        }
    } catch (error) {
        console.error('Error removing relationship:', error);
        alert(error.response?.data?.error || error.message || 'Failed to remove relationship');
    }
};

const canRemove = computed(() => {
    // Allow removal for belongsToMany, hasMany, and hasOne
    return ['belongsToMany', 'hasMany', 'hasOne'].includes(props.relationship.type);
});
</script>

<template>
    <div class="space-y-2">
        <div v-if="records.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            No related records found.
        </div>
        
        <!-- Table view if display columns are configured -->
        <div v-else-if="displayColumns && displayColumns.length > 0" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <th
                            v-for="column in displayColumns"
                            :key="column"
                            class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                            {{ column }}
                        </th>
                        <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Actions
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
                                            placeholder="Type to search..."
                                            :disabled="belongsToLoading"
                                        />
                                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            {{ belongsToTotalCount }} records available. Type to search.
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
                                            Please enter a search query to find records.
                                        </p>
                                        <p v-else-if="belongsToOptions.length === 0 && belongsToSearchQuery.trim()" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            No records found.
                                        </p>
                                    </div>
                                </div>
                                <!-- For hasMany and hasOne, show edit form -->
                                <RelationshipEditForm
                                    v-else
                                    :relationship="relationship"
                                    :module-handle="moduleHandle"
                                    :record-id="recordId"
                                    :related-record-id="getRecordId(record)"
                                    :primary-key-column="primaryKeyColumn"
                                    :related-table-name="relatedTableName"
                                    @updated="handleUpdated"
                                    @cancel="cancelEdit"
                                />
                            </td>
                        </tr>
                        
                        <!-- Record row -->
                        <tr
                            v-else
                            class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                            <td
                                v-for="column in displayColumns"
                                :key="column"
                                class="px-4 py-2 text-sm text-gray-900 dark:text-gray-100"
                            >
                                {{ record[column] ?? '-' }}
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
                                        title="Edit record"
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
                No record found. Click "Add" to create one.
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
                                placeholder="Type to search..."
                                :disabled="belongsToLoading"
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ belongsToTotalCount }} records available. Type to search.
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
                                Please enter a search query to find records.
                            </p>
                            <p v-else-if="belongsToOptions.length === 0 && belongsToSearchQuery.trim()" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                No records found.
                            </p>
                        </div>
                    </div>
                    <!-- For hasMany and hasOne, show edit form -->
                    <RelationshipEditForm
                        v-else
                        :relationship="relationship"
                        :module-handle="moduleHandle"
                        :record-id="recordId"
                        :related-record-id="getRecordId(record)"
                        :primary-key-column="primaryKeyColumn"
                        :related-table-name="relatedTableName"
                        @updated="handleUpdated"
                        @cancel="cancelEdit"
                    />
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
                            title="Edit record"
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
                    Showing {{ props.pagination.from }} to {{ props.pagination.to }} of {{ props.pagination.total }} records
                </div>
                <div class="flex items-center gap-2">
                    <button
                        type="button"
                        @click.prevent="goToPage(props.pagination.current_page - 1)"
                        :disabled="props.pagination.current_page === 1"
                        class="btn btn-sm btn-outline"
                        :class="{ 'opacity-50 cursor-not-allowed': props.pagination.current_page === 1 }"
                    >
                        Previous
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
                        Next
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

