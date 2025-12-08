<script setup>
import { ref, computed, onMounted } from 'vue';
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

const emit = defineEmits(['removed', 'edit']);

const editingRecordId = ref(null);

const showViewButton = computed(() => {
    // Don't show View button for belongsToMany and belongsTo
    // (View button is not needed for these relationship types)
    return false;
});

const showEditButton = computed(() => {
    // Show Edit button for hasMany and hasOne
    return ['hasMany', 'hasOne'].includes(props.relationship.type);
});

const startEdit = (recordId) => {
    editingRecordId.value = recordId;
    emit('edit', recordId);
};

const cancelEdit = () => {
    editingRecordId.value = null;
};

const handleUpdated = () => {
    editingRecordId.value = null;
    emit('removed'); // Trigger reload
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
                        <!-- Edit form row -->
                        <tr v-if="editingRecordId === getRecordId(record)" class="bg-white dark:bg-gray-800">
                            <td :colspan="displayColumns.length + 1" class="px-4 py-4">
                                <RelationshipEditForm
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
                <!-- Edit form -->
                <div v-if="editingRecordId === getRecordId(record)" class="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <RelationshipEditForm
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
    </div>
</template>

