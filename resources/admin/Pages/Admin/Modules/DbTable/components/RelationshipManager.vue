<script setup>
import { ref, onMounted, computed } from 'vue';
import { router } from '@inertiajs/vue3';
import axios from 'axios';
import RelationshipList from './RelationshipList.vue';
import RelationshipSelector from './RelationshipSelector.vue';
import RelationshipCreateForm from './RelationshipCreateForm.vue';
import ToastStack from '@/components/ToastStack.vue';
import { useToast } from '@/composables/useToast.js';

const props = defineProps({
    relationships: {
        type: Array,
        default: () => [],
    },
    recordId: {
        type: [String, Number],
        required: true,
    },
    moduleHandle: {
        type: String,
        required: true,
    },
    primaryKeyColumn: {
        type: String,
        default: 'id',
    },
});

const { toasts, showToast, dismissToast } = useToast();

const activeTab = ref(0);
const relationshipData = ref({});
const relationshipErrors = ref({}); // Store errors for each relationship
const loading = ref({});
const editingRelationships = ref({});
const showSelector = ref({});

// Get relationship name (use name or fallback to related_table)
const getRelationshipName = (relationship) => {
    return relationship.name || relationship.related_table || 'relationship';
};

// Load relationship data
const loadRelationship = async (relationship, index) => {
    const name = getRelationshipName(relationship);
    loading.value[name] = true;
    relationshipErrors.value[name] = null; // Clear previous error
    
    try {
        const response = await axios.get(`/admin/${props.moduleHandle}/relationships/${name}`, {
            params: {
                record_id: props.recordId,
            },
        });
        relationshipData.value[name] = response.data.records || [];
        relationshipErrors.value[name] = null; // Clear error on success
    } catch (error) {
        console.error(`Error loading relationship ${name}:`, error);
        relationshipData.value[name] = [];
        
        // Extract error message from response
        const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to load relationship';
        relationshipErrors.value[name] = errorMessage;
        
        // Show toast notification
        showToast({
            title: 'Error Loading Relationship',
            message: errorMessage,
            intent: 'danger',
            duration: 6000,
        });
    } finally {
        loading.value[name] = false;
    }
};

// Load all relationships on mount
onMounted(() => {
    props.relationships.forEach((relationship, index) => {
        loadRelationship(relationship, index);
    });
});

// Get relationship type label
const getTypeLabel = (type) => {
    const labels = {
        hasOne: 'Has One',
        hasMany: 'Has Many',
        belongsTo: 'Belongs To',
        belongsToMany: 'Belongs To Many',
    };
    return labels[type] || type;
};

// Check if relationship is editable (all relationship types can be managed)
const isEditable = (relationship) => {
    return ['belongsTo', 'belongsToMany', 'hasMany', 'hasOne'].includes(relationship.type);
};

// Check if relationship should show create form (hasMany and hasOne)
const shouldShowCreateForm = (relationship) => {
    return ['hasMany', 'hasOne'].includes(relationship.type);
};

// Get related table name for navigation
const getRelatedTableName = (relationship) => {
    return relationship.related_table || 'unknown';
};

// Open selector to add records
const toggleSelector = (relationship) => {
    const name = getRelationshipName(relationship);
    showSelector.value[name] = true;
    
    // Initialize with currently selected IDs
    if (!editingRelationships.value[name]) {
        if (relationship.type === 'belongsToMany') {
            // For belongsToMany, start with existing relationships (user can add/remove)
            editingRelationships.value[name] = [...(relationshipData.value[name] || []).map(r => r[props.primaryKeyColumn] ?? r.id)];
        } else if (relationship.type === 'belongsTo') {
            // For belongsTo, start with current selection (single value)
            editingRelationships.value[name] = relationshipData.value[name]?.length > 0 
                ? [relationshipData.value[name][0][props.primaryKeyColumn] ?? relationshipData.value[name][0].id]
                : [];
        }
        // hasMany and hasOne don't need initialization here - they use create form
    }
};

// Save relationship changes
const saveRelationship = async (relationship) => {
    const name = getRelationshipName(relationship);
    loading.value[name] = true;
    
    try {
        // All relationship types use the sync endpoint
        const response = await axios.put(`/admin/${props.moduleHandle}/relationships/${name}/sync`, {
            record_id: props.recordId,
            related_ids: editingRelationships.value[name] || [],
        });
        
        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to sync relationships');
        }
        
        // Reload relationship data
        await loadRelationship(relationship, 0);
        showSelector.value[name] = false;
        editingRelationships.value[name] = null;
        
        // Show success toast
        showToast({
            title: 'Success',
            message: 'Relationship saved successfully',
            intent: 'success',
        });
    } catch (error) {
        console.error(`Error saving relationship ${name}:`, error);
        const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save relationship';
        
        showToast({
            title: 'Error Saving Relationship',
            message: errorMessage,
            intent: 'danger',
            duration: 6000,
        });
    } finally {
        loading.value[name] = false;
    }
};

// Cancel editing
const cancelEditing = (relationship) => {
    const name = getRelationshipName(relationship);
    showSelector.value[name] = false;
    editingRelationships.value[name] = null;
};

// Handle record created from RelationshipCreateForm
const handleRecordCreated = async (newRecordId, relationship) => {
    // Get the relationship if not provided (fallback to active tab)
    const targetRelationship = relationship || props.relationships[activeTab.value];
    
    if (targetRelationship) {
        // Reload relationship data to show the new record
        await loadRelationship(targetRelationship, activeTab.value);
        
        // Close the form
        const name = getRelationshipName(targetRelationship);
        showSelector.value[name] = false;
        
        // Show success toast
        showToast({
            title: 'Success',
            message: 'Record created and attached successfully',
            intent: 'success',
        });
    }
};
</script>

<template>
    <div v-if="relationships.length > 0" class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Relationships</h4>
        
        <!-- Tabs for relationships -->
        <div class="border-b border-gray-200 dark:border-gray-700 mb-4">
            <nav class="-mb-px flex space-x-4">
                <button
                    v-for="(relationship, index) in relationships"
                    :key="index"
                    type="button"
                    @click.prevent="activeTab = index"
                    class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
                    :class="activeTab === index
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'"
                >
                    {{ getRelationshipName(relationship) }}
                    <span class="ml-2 text-xs">
                        ({{ getTypeLabel(relationship.type) }})
                    </span>
                    <span v-if="relationshipData[getRelationshipName(relationship)]" class="ml-2 text-xs bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded">
                        {{ relationshipData[getRelationshipName(relationship)].length }}
                    </span>
                </button>
            </nav>
        </div>

        <!-- Relationship content -->
        <div v-for="(relationship, index) in relationships" :key="index">
            <div v-show="activeTab === index" class="space-y-4">
                <!-- Loading state -->
                <div v-if="loading[getRelationshipName(relationship)]" class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                    Loading...
                </div>

                <!-- Error state -->
                <div v-else-if="relationshipErrors[getRelationshipName(relationship)]" class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                    <div class="flex items-start">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <div class="ml-3 flex-1">
                            <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
                                Error Loading Relationship
                            </h3>
                            <p class="mt-2 text-sm text-red-700 dark:text-red-300">
                                {{ relationshipErrors[getRelationshipName(relationship)] }}
                            </p>
                            <div class="mt-4">
                                <button
                                    type="button"
                                    @click.prevent="loadRelationship(relationship, index)"
                                    class="text-sm font-medium text-red-800 dark:text-red-200 hover:text-red-600 dark:hover:text-red-400"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Always show the list of related records -->
                <div>
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h5 class="text-sm font-medium text-gray-900 dark:text-white">
                                {{ getRelationshipName(relationship) }}
                            </h5>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {{ getTypeLabel(relationship.type) }} relationship with {{ relationship.related_table }}
                            </p>
                        </div>
                        <button
                            v-if="isEditable(relationship) && !((relationship.type === 'hasOne' || relationship.type === 'belongsTo') && relationshipData[getRelationshipName(relationship)]?.length > 0)"
                            type="button"
                            @click.prevent="toggleSelector(relationship)"
                            class="btn btn-sm btn-primary"
                        >
                            {{ showSelector[getRelationshipName(relationship)] ? 'Cancel' : 'Add' }}
                        </button>
                    </div>

                    <!-- List of existing related records -->
                    <RelationshipList
                        :relationship="relationship"
                        :records="relationshipData[getRelationshipName(relationship)] || []"
                        :primary-key-column="primaryKeyColumn"
                        :related-table-name="getRelatedTableName(relationship)"
                        :module-handle="moduleHandle"
                        :record-id="recordId"
                        @removed="() => loadRelationship(relationship, 0)"
                    />
                </div>

                <!-- Add mode - Show create form for hasMany and hasOne, selector for others -->
                <div v-if="showSelector[getRelationshipName(relationship)]" class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    <div class="flex items-center justify-between mb-4">
                        <h5 class="text-sm font-medium text-gray-900 dark:text-white">
                            {{ shouldShowCreateForm(relationship) ? 'Create New Record' : (relationship.type === 'belongsTo' ? 'Add record' : 'Add records') }}
                        </h5>
                    </div>

                    <!-- Create form for hasMany and hasOne -->
                    <RelationshipCreateForm
                        v-if="shouldShowCreateForm(relationship)"
                        :relationship="relationship"
                        :module-handle="moduleHandle"
                        :record-id="recordId"
                        :primary-key-column="primaryKeyColumn"
                        @created="(newRecordId) => handleRecordCreated(newRecordId, relationship)"
                        @cancel="cancelEditing(relationship)"
                    />

                    <!-- Selector for other relationship types -->
                    <template v-else>
                        <div class="flex gap-2 mb-4">
                            <button
                                type="button"
                                @click.prevent="saveRelationship(relationship)"
                                class="btn btn-sm btn-primary"
                                :disabled="loading[getRelationshipName(relationship)]"
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                @click.prevent="cancelEditing(relationship)"
                                class="btn btn-sm btn-outline"
                            >
                                Cancel
                            </button>
                        </div>

                        <RelationshipSelector
                            :relationship="relationship"
                            :selected-ids="editingRelationships[getRelationshipName(relationship)] || []"
                            :related-table-name="getRelatedTableName(relationship)"
                            :primary-key-column="primaryKeyColumn"
                            :module-handle="moduleHandle"
                            @update:selected-ids="(ids) => editingRelationships[getRelationshipName(relationship)] = ids"
                        />
                    </template>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Toast notifications -->
    <ToastStack :toasts="toasts" @dismiss="dismissToast" />
</template>

