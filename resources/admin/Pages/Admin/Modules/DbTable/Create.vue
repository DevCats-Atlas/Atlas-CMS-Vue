<script setup>
import { ref, computed, watch } from 'vue';
import { Head, Link, router, useForm } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import { resolveInterfaceComponent } from '@admin/Pages/Admin/Modules/Default/components/interfaces';
import { useTranslation } from '@/utils/useTranslation.js';

const { t } = useTranslation();

const props = defineProps({
    title: {
        type: String,
        default: null,
    },
    moduleHandle: {
        type: String,
        required: true,
    },
    module: {
        type: Object,
        required: true,
    },
    tableName: {
        type: String,
        required: true,
    },
    fields: {
        type: Array,
        default: () => [],
    },
    uiConfig: {
        type: Object,
        default: () => ({}),
    },
    hasDeepStructure: {
        type: Boolean,
        default: false,
    },
    parentColumn: {
        type: String,
        default: 'parent_id',
    },
    availableParents: {
        type: Array,
        default: () => [],
    },
    parentId: {
        type: [String, Number],
        default: null,
    },
});

const baseUrl = computed(() => `/admin/${props.moduleHandle}`);

// Parse field groups from uiConfig
const fieldGroups = computed(() => {
    // field_groups can be at root level or nested
    if (props.uiConfig.field_groups && Array.isArray(props.uiConfig.field_groups)) {
        return props.uiConfig.field_groups;
    }
    return [];
});

// Get all field names that are in groups
const groupedFieldNames = computed(() => {
    const names = new Set();
    fieldGroups.value.forEach(group => {
        (group.fields || []).forEach(fieldName => names.add(fieldName));
    });
    return names;
});

// Fields organized by groups (only groups with existing fields)
const fieldsInGroups = computed(() => {
    return fieldGroups.value
        .map(group => ({
            ...group,
            fieldObjects: (group.fields || [])
                .map(fieldName => props.fields.find(f => f.name === fieldName))
                .filter(Boolean), // Remove undefined (field not found)
        }))
        .filter(group => group.fieldObjects.length > 0); // Only groups with fields
});

// Fields not in any group
const ungroupedFields = computed(() => {
    return props.fields.filter(field => !groupedFieldNames.value.has(field.name));
});

// Check if we have any field groups defined
const hasFieldGroups = computed(() => fieldsInGroups.value.length > 0);

// Build form data structure based on fields
const buildFormData = () => {
    const formData = {};
    
    // Initialize parent_id if tree structure is enabled
    if (props.hasDeepStructure && props.parentColumn) {
        formData[props.parentColumn] = props.parentId || null;
    }
    
    props.fields.forEach((field) => {
        const fieldConfig = props.uiConfig[field.name] || {};
        const interfaceType = field.interface || 'text';
        
        // Initialize with default value if available
        if (field.default !== null && field.default !== undefined) {
            if (interfaceType === 'checkbox') {
                formData[field.name] = field.default ? true : false;
            } else {
                formData[field.name] = field.default;
            }
        } else {
            // Set empty defaults based on interface type
            if (interfaceType === 'checkbox') {
                formData[field.name] = false;
            } else if (interfaceType === 'select') {
                formData[field.name] = '';
            } else {
                formData[field.name] = '';
            }
        }
    });
    
    return formData;
};

const createForm = useForm(buildFormData());

// Create field model structure for interface components (reactive)
const fieldModels = ref({});

// Initialize field models
props.fields.forEach((field) => {
    const defaultValue = field.default !== null && field.default !== undefined
        ? (field.interface === 'checkbox' ? (field.default ? true : false) : field.default)
        : (field.interface === 'checkbox' ? false : '');
    
    fieldModels.value[field.name] = {
        default: defaultValue,
        translations: {},
    };
});

// Watch field models and sync to form
props.fields.forEach((field) => {
    watch(
        () => fieldModels.value[field.name]?.default,
        (newValue) => {
            createForm[field.name] = newValue;
        },
        { immediate: true }
    );
});

// Get display text for parent option with hierarchy indicators
const getParentDisplayText = (parent) => {
    if (!parent.depth || parent.depth === 0) {
        return parent.title;
    }
    // Use visual hierarchy indicators
    const indent = '  '.repeat(parent.depth); // 2 spaces per level
    const connector = parent.depth > 0 ? '└─ ' : '';
    return indent + connector + parent.title;
};

// Update parent field when select changes
const updateParentField = () => {
    if (props.hasDeepStructure && props.parentColumn) {
        const parentIdValue = createForm[props.parentColumn];
        // Ensure the value is properly set (convert empty string to null)
        const normalizedValue = parentIdValue === '' || parentIdValue === undefined ? null : parentIdValue;
        createForm[props.parentColumn] = normalizedValue;
        
        // Also update the field model if parent_id is in the fields list
        const parentField = props.fields.find(f => f.name === props.parentColumn);
        if (parentField && fieldModels.value[props.parentColumn]) {
            fieldModels.value[props.parentColumn].default = normalizedValue;
        }
    }
};

const submitCreate = () => {
    // Explicitly sync fieldModels to form before submission
    props.fields.forEach((field) => {
        if (fieldModels.value[field.name]) {
            createForm[field.name] = fieldModels.value[field.name].default;
        }
    });
    
    // Ensure parent_id is properly set
    if (props.hasDeepStructure && props.parentColumn) {
        const parentIdValue = createForm[props.parentColumn];
        createForm[props.parentColumn] = parentIdValue === '' || parentIdValue === undefined ? null : parentIdValue;
    }
    
    createForm.post(`${baseUrl.value}/create`, {
        preserveScroll: true,
        onSuccess: () => {
            router.visit(baseUrl.value);
        },
    });
};

// Parse select options from string based on input type
const parseSelectOptions = (optionsString, inputType = 'comma') => {
    // Convert to string if it's not already (handles numbers, null, undefined)
    if (optionsString == null) {
        return [];
    }
    optionsString = String(optionsString);
    if (optionsString.trim() === '') {
        return [];
    }
    
    // Handle different input types
    switch (inputType) {
        case 'comma':
            // Comma-separated values
            const commaSeparated = optionsString.split(',').map(opt => opt.trim()).filter(opt => opt);
            return commaSeparated.map(opt => ({
                key: opt,
                label: opt,
            }));
            
        case 'newline':
            // Line break separated values
            const newlineSeparated = optionsString.split('\n').map(opt => opt.trim()).filter(opt => opt);
            return newlineSeparated.map(opt => ({
                key: opt,
                label: opt,
            }));
            
        case 'value_label':
            // Value=Label format (line break separated)
            const valueLabelLines = optionsString.split('\n').map(opt => opt.trim()).filter(opt => opt);
            return valueLabelLines.map(line => {
                if (line.includes('=')) {
                    const [key, ...labelParts] = line.split('=');
                    const label = labelParts.join('='); // In case label contains '='
                    return {
                        key: key.trim(),
                        label: label.trim() || key.trim(),
                    };
                } else {
                    // If no '=' found, use the whole line as both key and label
                    return {
                        key: line,
                        label: line,
                    };
                }
            });
            
        default:
            // Fallback: try to auto-detect (backward compatibility)
            // Try comma-separated first
            const autoComma = optionsString.split(',').map(opt => opt.trim()).filter(opt => opt);
            if (autoComma.length > 1) {
                return autoComma.map(opt => ({
                    key: opt,
                    label: opt,
                }));
            }
            
            // Try newline-separated
            const autoNewline = optionsString.split('\n').map(opt => opt.trim()).filter(opt => opt);
            if (autoNewline.length > 1) {
                return autoNewline.map(opt => ({
                    key: opt,
                    label: opt,
                }));
            }
            
            // Single option
            if (optionsString.trim()) {
                return [{
                    key: optionsString.trim(),
                    label: optionsString.trim(),
                }];
            }
            
            return [];
    }
};

// Get enhanced field config for interface components
const getFieldConfig = (field) => {
    // Keep datetime and datetime-local as is, don't map to date
    let interfaceType = field.interface || 'text';
    // Map datetime-local to datetime for component lookup (DateInterface handles both)
    if (interfaceType === 'datetime-local') {
        interfaceType = 'datetime';
    }
    
    const config = {
        ...field,
        type: interfaceType,
        title: field.title || field.name,
        config: {
            type: interfaceType,
            // For datetime fields, specify input type
            inputType: field.interface === 'datetime' || field.interface === 'datetime-local' ? 'datetime-local' : undefined,
        },
        // For file fields, add value and value_url
        values: field.interface === 'file' ? {
            default: field.value || null,
            default_url: field.value_url || null,
        } : undefined,
    };
    
    // For select fields, parse options
    if (interfaceType === 'select' && field.options) {
        const inputType = field.select_input_type || 'comma';
        const options = parseSelectOptions(field.options, inputType);
        config.config.options = options;
    }
    
    return config;
};
</script>

<template>
    <AdminLayout>
        <Head :title="title || t('admin.db_table.create_record')" />

        <div class="py-6 pb-24">
            <div class="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
                    <div class="flex items-start justify-between gap-4 mb-6">
                        <div>
                            <h1 class="heading-1">{{ title }}</h1>
                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Table: <code class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{{ tableName }}</code>
                            </p>
                        </div>
                        <Link :href="baseUrl" class="btn btn-outline">
                            Back to list
                        </Link>
                    </div>

                    <form @submit.prevent="submitCreate" class="space-y-6">
                        <!-- Parent selector for tree structure -->
                        <div v-if="hasDeepStructure && availableParents.length > 0" class="mb-6 pb-6 border-divider">
                            <label class="form-label">Parent</label>
                            <select
                                v-model="createForm[parentColumn]"
                                class="form-input"
                                @change="updateParentField"
                            >
                                <option :value="null">None (Root item)</option>
                                <option
                                    v-for="parent in availableParents"
                                    :key="parent.id"
                                    :value="parent.id"
                                >
                                    {{ getParentDisplayText(parent) }}
                                </option>
                            </select>
                            <p v-if="createForm.errors[parentColumn]" class="mt-1 text-sm text-red-600">
                                {{ createForm.errors[parentColumn] }}
                            </p>
                        </div>

                        <!-- Grouped Fields -->
                        <template v-if="hasFieldGroups">
                            <div 
                                v-for="group in fieldsInGroups" 
                                :key="group.id"
                                class="space-y-4"
                            >
                                <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700 pb-2">
                                    {{ group.title }}
                                </h3>
                                <div class="grid gap-6 md:grid-cols-2">
                                    <div
                                        v-for="field in group.fieldObjects"
                                        :key="field.name"
                                        :class="{
                                            'md:col-span-2': field.interface === 'textarea' || field.interface === 'wysiwyg',
                                        }"
                                    >
                                        <component
                                            :is="resolveInterfaceComponent(getFieldConfig(field).type)"
                                            :field="getFieldConfig(field)"
                                            :model="fieldModels[field.name]"
                                        />
                                        <p v-if="createForm.errors[field.name]" class="mt-1 text-sm text-red-600">
                                            {{ createForm.errors[field.name] }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </template>

                        <!-- Ungrouped Fields (or all fields if no groups defined) -->
                        <div v-if="ungroupedFields.length > 0" class="space-y-4">
                            <h3 
                                v-if="hasFieldGroups" 
                                class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700 pb-2"
                            >
                                Other Fields
                            </h3>
                            <div class="grid gap-6 md:grid-cols-2">
                                <div
                                    v-for="field in ungroupedFields"
                                    :key="field.name"
                                    :class="{
                                        'md:col-span-2': field.interface === 'textarea' || field.interface === 'wysiwyg',
                                    }"
                                >
                                    <component
                                        :is="resolveInterfaceComponent(getFieldConfig(field).type)"
                                        :field="getFieldConfig(field)"
                                        :model="fieldModels[field.name]"
                                    />
                                    <p v-if="createForm.errors[field.name]" class="mt-1 text-sm text-red-600">
                                        {{ createForm.errors[field.name] }}
                                    </p>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>
            </div>
        </div>
        
        <!-- Sticky Bottom Toolbar -->
        <div class="sticky bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
                <div class="flex items-center justify-between gap-4">
                    <Link :href="baseUrl" class="btn-text">
                        Cancel
                    </Link>
                    <button
                        type="button"
                        class="btn btn-primary"
                        :disabled="createForm.processing"
                        @click="submitCreate"
                    >
                        {{ createForm.processing ? 'Creating...' : 'Create Record' }}
                    </button>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>

