<script setup>
import { ref, computed, watch } from 'vue';
import { Head, Link, router, useForm } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import ToastStack from '@/components/ToastStack.vue';
import { useToast } from '@/composables/useToast.js';
import { resolveInterfaceComponent } from '@admin/Pages/Admin/Modules/Default/components/interfaces';
import RelationshipManager from './components/RelationshipManager.vue';
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
    recordId: {
        type: [String, Number],
        required: true,
    },
    primaryKeyColumn: {
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
    record: {
        type: Object,
        required: true,
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
    relationships: {
        type: Array,
        default: () => [],
    },
});

const baseUrl = computed(() => `/admin/${props.moduleHandle}`);
const { toasts, showToast, dismissToast } = useToast();

// Build form data structure based on fields with existing values
const buildFormData = () => {
    const formData = {
        record_id: props.recordId,
    };
    
    // Initialize parent_id if tree structure is enabled
    if (props.hasDeepStructure && props.parentColumn) {
        formData[props.parentColumn] = props.record[props.parentColumn] ?? null;
    }
    
    props.fields.forEach((field) => {
        const fieldConfig = props.uiConfig[field.name] || {};
        const interfaceType = field.interface || 'text';
        
        // Use existing value if available, otherwise use default
        let value = field.value !== null && field.value !== undefined 
            ? field.value 
            : (field.default !== null && field.default !== undefined ? field.default : null);
        
        // Handle checkbox values
        if (interfaceType === 'checkbox') {
            value = value ? true : false;
        } else if (value === null) {
            // Set empty defaults for non-checkbox fields
            if (interfaceType === 'select') {
                value = '';
            } else {
                value = '';
            }
        }
        
        formData[field.name] = value;
    });
    
    return formData;
};

const editForm = useForm(buildFormData());

// Create field model structure for interface components (reactive)
const fieldModels = ref({});

// Initialize field models with existing values
props.fields.forEach((field) => {
    let defaultValue = field.value !== null && field.value !== undefined
        ? field.value
        : (field.default !== null && field.default !== undefined ? field.default : null);
    
    // Handle checkbox values
    if (field.interface === 'checkbox') {
        defaultValue = defaultValue ? true : false;
    } else if (defaultValue === null) {
        defaultValue = '';
    }
    
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
            editForm[field.name] = newValue;
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
    // The v-model already updates editForm[parentColumn], but we ensure it's synced
    // Also check if parent_id field exists in the form fields and update it
    if (props.hasDeepStructure && props.parentColumn) {
        const parentIdValue = editForm[props.parentColumn];
        // Ensure the value is properly set (convert empty string to null)
        const normalizedValue = parentIdValue === '' || parentIdValue === undefined ? null : parentIdValue;
        editForm[props.parentColumn] = normalizedValue;
        
        // Also update the field model if parent_id is in the fields list
        const parentField = props.fields.find(f => f.name === props.parentColumn);
        if (parentField && fieldModels.value[props.parentColumn]) {
            fieldModels.value[props.parentColumn].default = normalizedValue;
        }
    }
};

const submitUpdate = () => {
    // Explicitly sync fieldModels to form before submission
    props.fields.forEach((field) => {
        if (fieldModels.value[field.name]) {
            editForm[field.name] = fieldModels.value[field.name].default;
        }
    });
    
    // Ensure parent_id is properly set
    if (props.hasDeepStructure && props.parentColumn) {
        const parentIdValue = editForm[props.parentColumn];
        editForm[props.parentColumn] = parentIdValue === '' || parentIdValue === undefined ? null : parentIdValue;
    }
    
    // Use POST with forceFormData: true and _method: 'put' for file uploads
    // This is the same pattern used in items EditForm and works correctly with multipart/form-data
    editForm.transform((data) => {
        const payload = { ...data };
        payload._method = 'put';
        return payload;
    });
    
    editForm.post(`${baseUrl.value}/edit`, {
        preserveScroll: true,
        forceFormData: true,
        onSuccess: () => {
            showToast({
                title: t('admin.common.success'),
                message: t('admin.success.record_updated'),
                intent: 'success',
            });
            router.visit(`${baseUrl.value}/edit?id=${props.recordId}`);
        },
    });
};

// Parse select options from string based on input type
const parseSelectOptions = (optionsString, inputType = 'comma') => {
    if (!optionsString || optionsString.trim() === '') {
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
    // Map datetime to date interface
    let interfaceType = field.interface || 'text';
    if (interfaceType === 'datetime') {
        interfaceType = 'date';
    }
    
    const config = {
        ...field,
        type: interfaceType,
        title: field.title || field.name,
        config: {
            type: interfaceType,
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
        <Head :title="title || t('admin.db_table.edit_record')" />

        <div class="py-6">
            <div class="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
                    <div class="flex items-start justify-between gap-4 mb-6">
                        <div>
                            <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">{{ title }}</h1>
                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Table: <code class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{{ tableName }}</code>
                                · ID: <code class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{{ recordId }}</code>
                            </p>
                        </div>
                        <Link :href="baseUrl" class="btn btn-outline">
                            Back to list
                        </Link>
                    </div>

                    <form @submit.prevent="submitUpdate" class="space-y-6">
                        <!-- Parent selector for tree structure -->
                        <div v-if="hasDeepStructure && availableParents.length > 0" class="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                            <label class="form-label">Parent</label>
                            <select
                                v-model="editForm[parentColumn]"
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
                            <p v-if="editForm.errors[parentColumn]" class="mt-1 text-sm text-red-600">
                                {{ editForm.errors[parentColumn] }}
                            </p>
                        </div>

                        <div class="grid gap-6 md:grid-cols-2">
                            <div
                                v-for="field in fields"
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
                                <p v-if="editForm.errors[field.name]" class="mt-1 text-sm text-red-600">
                                    {{ editForm.errors[field.name] }}
                                </p>
                            </div>
                        </div>

                        <!-- Relationships Section -->
                        <RelationshipManager
                            v-if="relationships.length > 0"
                            :relationships="relationships"
                            :record-id="recordId"
                            :module-handle="moduleHandle"
                            :primary-key-column="primaryKeyColumn"
                        />

                        <div class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Link :href="baseUrl" class="btn-text">
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                class="btn btn-primary"
                                :disabled="editForm.processing"
                            >
                                {{ editForm.processing ? t('admin.db_table.updating') : t('admin.db_table.update_record') }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <ToastStack :toasts="toasts" @dismiss="dismissToast" />
    </AdminLayout>
</template>

