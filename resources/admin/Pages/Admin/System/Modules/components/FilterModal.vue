<script setup>
import { ref, watch, computed, onMounted, nextTick } from 'vue';

const props = defineProps({
    open: {
        type: Boolean,
        default: false,
    },
    filter: {
        type: Object,
        default: null,
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

const emit = defineEmits(['close', 'save']);

const formData = ref({
    id: '',
    type: 'search',
    enabled: true,
    label: '',
    placeholder: '',
    columns: [],
    field: '',
    relationship: '',
    operator: 'equals',
    multiple: false,
    default_value: null,
});

// Separate ref for relationship to prevent it from being cleared
const relationshipValue = ref('');

// Track if we've initialized to prevent unnecessary resets
let isInitialized = false;
let lastFilterId = null;
let savedRelationshipValue = '';

// Initialize form only when modal opens (not on every filter change)
watch(() => props.open, (isOpen, wasOpen) => {
    // Only initialize when modal is opening (was closed, now open)
    if (isOpen && !wasOpen) {
        const filter = props.filter;
        
        if (filter) {
            // Edit mode - populate with existing data
            const filterId = filter.id || JSON.stringify(filter);
            // Only reset if it's a different filter
            if (filterId !== lastFilterId) {
                savedRelationshipValue = filter.relationship || '';
                const relationship = filter.relationship || '';
                relationshipValue.value = relationship;
                savedRelationshipValue = relationship;
                formData.value = {
                    id: filter.id || generateFilterId(),
                    type: filter.type || 'search',
                    enabled: filter.enabled !== undefined ? filter.enabled : true,
                    label: filter.label || '',
                    placeholder: filter.placeholder || '',
                    columns: filter.columns ? [...filter.columns] : [],
                    field: filter.field || '',
                    relationship: relationship,
                    operator: filter.operator || 'equals',
                    multiple: filter.multiple || false,
                    default_value: filter.default_value ?? null,
                };
                lastFilterId = filterId;
            }
        } else {
            // Create mode - reset to defaults
            savedRelationshipValue = '';
            relationshipValue.value = '';
            formData.value = {
                id: generateFilterId(),
                type: 'search',
                enabled: true,
                label: '',
                placeholder: '',
                columns: [],
                field: '',
                relationship: '',
                operator: 'equals',
                multiple: false,
                default_value: null,
            };
            lastFilterId = null;
        }
        isInitialized = true;
    } else if (!isOpen && wasOpen) {
        // Reset flag when modal closes
        isInitialized = false;
        lastFilterId = null;
        savedRelationshipValue = '';
    }
}, { immediate: true });

const generateFilterId = () => {
    return 'filter_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Sync relationshipValue with formData.relationship
watch(() => formData.value.relationship, (newValue) => {
    if (newValue && newValue.trim() !== '') {
        relationshipValue.value = newValue;
        savedRelationshipValue = newValue;
    }
}, { immediate: true });

// Sync formData.relationship with relationshipValue
watch(relationshipValue, (newValue) => {
    if (formData.value.type === 'relationship') {
        formData.value.relationship = newValue;
    }
});

// CRITICAL: Watch operator changes and ensure relationship is preserved
watch(() => formData.value.operator, () => {
    // Only act if we're in relationship mode and modal is open
    if (props.open && formData.value.type === 'relationship' && isInitialized) {
        // Restore relationship from saved value if it got cleared
        nextTick(() => {
            if ((!formData.value.relationship || formData.value.relationship.trim() === '') && savedRelationshipValue) {
                relationshipValue.value = savedRelationshipValue;
                formData.value.relationship = savedRelationshipValue;
            } else if (formData.value.relationship && formData.value.relationship !== relationshipValue.value) {
                // Sync relationshipValue if formData has a value
                relationshipValue.value = formData.value.relationship;
            }
        });
    }
});

const isEditMode = computed(() => !!props.filter);

const availableFields = computed(() => {
    return Object.keys(props.uiConfig || {});
});

const availableRelationships = computed(() => {
    return props.relationships || [];
});

// Cache relationship operator options to prevent unnecessary re-renders
const relationshipOperatorOptions = [
    { value: 'equals', label: 'Equals' },
    { value: 'in', label: 'In (Multiple)' },
];

const operatorOptions = computed(() => {
    if (formData.value.type === 'search') {
        return [];
    }
    
    if (formData.value.type === 'relationship') {
        // Return cached options for relationships (stable, no dependencies)
        return relationshipOperatorOptions;
    }
    
    if (formData.value.type === 'field') {
        const fieldConfig = props.uiConfig[formData.value.field];
        if (!fieldConfig) {
            return [
                { value: 'equals', label: 'Equals' },
                { value: 'contains', label: 'Contains' },
                { value: 'not_equals', label: 'Not Equals' },
            ];
        }
        
        const interfaceType = fieldConfig.interface;
        if (interfaceType === 'datetime' || interfaceType === 'date') {
            return [
                { value: 'equals', label: 'Equals' },
                { value: 'range', label: 'Range (From/To)' },
                { value: 'after', label: 'After' },
                { value: 'before', label: 'Before' },
            ];
        }
        if (interfaceType === 'checkbox') {
            return [
                { value: 'equals', label: 'Equals' },
            ];
        }
        if (interfaceType === 'select') {
            return [
                { value: 'equals', label: 'Equals' },
                { value: 'in', label: 'In (Multiple)' },
            ];
        }
        // For number/text fields
        return [
            { value: 'equals', label: 'Equals' },
            { value: 'contains', label: 'Contains' },
            { value: 'not_equals', label: 'Not Equals' },
            { value: 'range', label: 'Range (Min/Max)' },
        ];
    }
    
    return [];
});

const supportsMultiple = computed(() => {
    if (formData.value.type === 'field') {
        const fieldConfig = props.uiConfig[formData.value.field];
        if (fieldConfig && fieldConfig.interface === 'select') {
            return true;
        }
    }
    if (formData.value.type === 'relationship') {
        return true;
    }
    return false;
});

const submit = () => {
    // Sync relationshipValue to formData before validation
    if (formData.value.type === 'relationship') {
        formData.value.relationship = relationshipValue.value;
    }
    
    // Store current values to prevent any race conditions
    const currentType = formData.value.type;
    const currentRelationship = formData.value.relationship || relationshipValue.value;
    const currentField = formData.value.field;
    const currentLabel = formData.value.label;
    
    // Validate required fields based on type
    if (currentType === 'search') {
        if (!currentLabel) {
            alert('Label is required for search filters');
            return;
        }
    } else if (currentType === 'field') {
        if (!currentField) {
            alert('Field is required for field filters');
            return;
        }
        if (!currentLabel) {
            formData.value.label = currentField;
        }
    } else if (currentType === 'relationship') {
        if (!currentRelationship || currentRelationship.trim() === '') {
            alert('Relationship is required for relationship filters');
            return;
        }
        const relationship = availableRelationships.value.find(r => r.related_table === currentRelationship);
        if (!currentLabel) {
            formData.value.label = relationship?.name || relationship?.related_table || currentRelationship;
        }
    }
    
    // Ensure relationship is preserved in the final data (use related_table)
    const saveData = { ...formData.value };
    if (currentType === 'relationship' && currentRelationship) {
        // Always save the related_table as the relationship value
        saveData.relationship = currentRelationship;
        // Also ensure relationshipValue is synced
        if (relationshipValue.value !== currentRelationship) {
            relationshipValue.value = currentRelationship;
        }
    }
    
    emit('save', saveData);
    emit('close');
};

const close = () => {
    emit('close');
};

const toggleColumn = (column) => {
    const index = formData.value.columns.indexOf(column);
    if (index > -1) {
        formData.value.columns.splice(index, 1);
    } else {
        formData.value.columns.push(column);
    }
};
</script>

<template>
    <div
        v-if="open"
        class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4"
        @click.self="close"
    >
        <div class="w-full max-w-4xl rounded-2xl bg-white dark:bg-gray-800 shadow-xl flex flex-col max-h-[90vh]">
            <div class="modal-header">
                <h3 class="section-heading">
                    {{ isEditMode ? 'Edit Filter' : 'Create Filter' }}
                </h3>
                <button
                    type="button"
                    class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    @click="close"
                >
                    ✕
                </button>
            </div>
            <div class="modal-body">
                <form @submit.prevent="submit" class="space-y-4">
                    <!-- Filter Type -->
                    <div>
                        <label class="form-label">Filter Type <span class="text-red-500">*</span></label>
                        <select
                            v-model="formData.type"
                            class="form-select"
                            required
                        >
                            <option value="search">Search Filter</option>
                            <option value="field">Field Filter</option>
                            <option value="relationship">Relationship Filter</option>
                        </select>
                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Choose the type of filter you want to create
                        </p>
                    </div>

                    <!-- Enabled Toggle -->
                    <div>
                        <label class="inline-flex items-center">
                            <input
                                v-model="formData.enabled"
                                type="checkbox"
                                class="form-checkbox"
                            />
                            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Enabled</span>
                        </label>
                    </div>

                    <!-- Common Fields: Label and Placeholder -->
                    <div class="grid gap-4 md:grid-cols-2">
                        <div>
                            <label class="form-label">Label <span class="text-red-500">*</span></label>
                            <input
                                v-model="formData.label"
                                type="text"
                                class="form-input"
                                placeholder="Filter label"
                                required
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Display label for this filter
                            </p>
                        </div>
                        <div>
                            <label class="form-label">Placeholder</label>
                            <input
                                v-model="formData.placeholder"
                                type="text"
                                class="form-input"
                                placeholder="Filter placeholder"
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Placeholder text for the input field
                            </p>
                        </div>
                    </div>

                    <!-- Search Filter Configuration -->
                    <div v-if="formData.type === 'search'">
                        <label class="form-label">Columns to Search</label>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Select columns to include in search. Leave empty to search all columns.
                        </p>
                        <div class="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                            <label
                                v-for="column in availableFields"
                                :key="column"
                                class="inline-flex items-center mr-4 mb-2"
                            >
                                <input
                                    :checked="formData.columns.includes(column)"
                                    type="checkbox"
                                    class="form-checkbox"
                                    @change="toggleColumn(column)"
                                />
                                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">{{ column }}</span>
                            </label>
                        </div>
                    </div>

                    <!-- Field Filter Configuration -->
                    <div v-if="formData.type === 'field'">
                        <div class="grid gap-4 md:grid-cols-2">
                            <div>
                                <label class="form-label">Field <span class="text-red-500">*</span></label>
                                <select
                                    v-model="formData.field"
                                    class="form-select"
                                    required
                                >
                                    <option value="">Select a field</option>
                                    <option
                                        v-for="field in availableFields"
                                        :key="field"
                                        :value="field"
                                    >
                                        {{ field }}
                                    </option>
                                </select>
                                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Select the field to filter by
                                </p>
                            </div>
                            <div>
                                <label class="form-label">Operator <span class="text-red-500">*</span></label>
                                <select
                                    v-model="formData.operator"
                                    class="form-select"
                                    required
                                >
                                    <option
                                        v-for="option in operatorOptions"
                                        :key="option.value"
                                        :value="option.value"
                                    >
                                        {{ option.label }}
                                    </option>
                                </select>
                                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    How to compare the field value
                                </p>
                            </div>
                        </div>
                        <div v-if="supportsMultiple" class="mt-4">
                            <label class="inline-flex items-center">
                                <input
                                    v-model="formData.multiple"
                                    type="checkbox"
                                    class="form-checkbox"
                                />
                                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Allow multiple selection</span>
                            </label>
                        </div>
                    </div>

                    <!-- Relationship Filter Configuration -->
                    <div v-if="formData.type === 'relationship'" key="relationship-filter-config">
                        <div class="grid gap-4 md:grid-cols-2">
                            <div>
                                <label class="form-label">Relationship <span class="text-red-500">*</span></label>
                                <select
                                    :key="`relationship-select-${formData.id || 'new'}-${formData.type}`"
                                    v-model="relationshipValue"
                                    class="form-select"
                                    required
                                >
                                    <option value="">Select a relationship</option>
                                    <option
                                        v-for="rel in availableRelationships"
                                        :key="rel.related_table || rel.name"
                                        :value="rel.related_table"
                                    >
                                        {{ rel.name || rel.related_table }} ({{ rel.related_table }})
                                    </option>
                                </select>
                                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Select the relationship to filter by
                                </p>
                            </div>
                            <div>
                                <label class="form-label">Operator <span class="text-red-500">*</span></label>
                                <select
                                    :key="`operator-select-${formData.id || 'new'}`"
                                    v-model="formData.operator"
                                    class="form-select"
                                    required
                                >
                                    <option
                                        v-for="option in operatorOptions"
                                        :key="option.value"
                                        :value="option.value"
                                    >
                                        {{ option.label }}
                                    </option>
                                </select>
                                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    How to compare the relationship value
                                </p>
                            </div>
                        </div>
                        <div class="mt-4">
                            <label class="inline-flex items-center">
                                <input
                                    v-model="formData.multiple"
                                    type="checkbox"
                                    class="form-checkbox"
                                />
                                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Allow multiple selection</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="actions-footer pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" class="btn-text" @click="close">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.15s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>

