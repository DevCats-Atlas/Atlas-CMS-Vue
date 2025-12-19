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

// Fields organized by groups (only groups with existing fields, excluding hidden fields)
const fieldsInGroups = computed(() => {
    return fieldGroups.value
        .map(group => ({
            ...group,
            fieldObjects: (group.fields || [])
                .map(fieldName => props.fields.find(f => f.name === fieldName))
                .filter(field => field && !isFieldHiddenInForm(field.name)), // Remove undefined and hidden fields
        }))
        .filter(group => group.fieldObjects.length > 0); // Only groups with fields
});

// Check if a field should be hidden in the form
const isFieldHiddenInForm = (fieldName) => {
    const config = props.uiConfig[fieldName] || {};
    // Hide if editable is false AND hide_in_form is true
    return config.editable === false && config.hide_in_form === true;
};

// Fields not in any group (excluding hidden fields)
const ungroupedFields = computed(() => {
    return props.fields.filter(field => 
        !groupedFieldNames.value.has(field.name) && !isFieldHiddenInForm(field.name)
    );
});

// Check if we have any field groups defined
const hasFieldGroups = computed(() => fieldsInGroups.value.length > 0);

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

// Format datetime value for datetime-local input (YYYY-MM-DDTHH:mm)
const formatDateTimeForInput = (value, interfaceType) => {
    if (!value || interfaceType !== 'datetime' && interfaceType !== 'datetime-local') {
        return value;
    }
    
    // If already in correct format, return as is
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
        return value.substring(0, 16); // Remove seconds and timezone if present
    }
    
    // Try to parse and format
    try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        }
    } catch (e) {
        // If parsing fails, return original value
    }
    
    return value;
};

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
    } else if (field.interface === 'datetime' || field.interface === 'datetime-local') {
        // Format datetime values for datetime-local input
        defaultValue = formatDateTimeForInput(defaultValue, field.interface);
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

// Format field value for display in read-only mode
const formatFieldValue = (field) => {
    const value = field.value;
    
    if (value === null || value === undefined || value === '') {
        return '—';
    }
    
    // Handle checkbox
    if (field.interface === 'checkbox') {
        return value ? 'Yes' : 'No';
    }
    
    // Handle select - try to find label from options
    if (field.interface === 'select' && field.options && Array.isArray(field.options)) {
        const option = field.options.find(opt => {
            const optValue = typeof opt === 'object' ? opt.value : opt;
            return String(optValue) === String(value);
        });
        if (option) {
            return typeof option === 'object' ? option.label : option;
        }
    }
    
    // Handle date/datetime
    if (field.interface === 'date' || field.interface === 'datetime' || field.interface === 'datetime-local') {
        if (value) {
            try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    if (field.interface === 'date') {
                        return date.toLocaleDateString();
                    }
                    return date.toLocaleString();
                }
            } catch (e) {
                // Fall through to return raw value
            }
        }
    }
    
    // Handle file
    if (field.interface === 'file' && field.value_url) {
        return field.value || '—';
    }
    
    // Default: return string representation
    return String(value);
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

// Format cast display with safe HTML and newline support
const formatCastDisplay = (html) => {
    if (!html) return '';
    
    // Allowed tags whitelist
    const allowedTags = ['div', 'p', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'a', 'br', 'span'];
    
    // Create a temporary div to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Sanitize: remove disallowed tags but keep their content
    const sanitize = (node) => {
        const children = Array.from(node.childNodes);
        children.forEach(child => {
            if (child.nodeType === Node.ELEMENT_NODE) {
                const tagName = child.tagName.toLowerCase();
                if (!allowedTags.includes(tagName)) {
                    // Replace disallowed tag with its content
                    while (child.firstChild) {
                        node.insertBefore(child.firstChild, child);
                    }
                    node.removeChild(child);
                } else {
                    // For <a> tags, ensure they open in new tab and have safe attributes
                    if (tagName === 'a') {
                        child.setAttribute('target', '_blank');
                        child.setAttribute('rel', 'noopener noreferrer');
                        child.classList.add('underline', 'hover:text-blue-700');
                    }
                    // Recursively sanitize children
                    sanitize(child);
                }
            }
        });
    };
    
    sanitize(temp);
    
    // Convert remaining newlines to <br>
    let result = temp.innerHTML;
    result = result.replace(/\n/g, '<br>');
    
    return '→ ' + result;
};
</script>

<template>
    <AdminLayout>
        <Head :title="title || t('admin.db_table.edit_record')" />

        <div class="py-6 pb-24">
            <div class="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
                    <div class="flex items-start justify-between gap-4 mb-6">
                        <div>
                            <h1 class="heading-1">{{ title }}</h1>
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
                        <div v-if="hasDeepStructure && availableParents.length > 0" class="mb-6 pb-6 border-divider">
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
                                        <!-- Non-editable fields shown as read-only text -->
                                        <div v-if="field.editable === false" class="space-y-1">
                                            <label class="form-label">{{ field.title || field.name }}</label>
                                            <div class="form-input bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 cursor-not-allowed">
                                                {{ formatFieldValue(field) }}
                                            </div>
                                        </div>
                                        
                                        <!-- Editable fields shown as input components -->
                                        <template v-else>
                                            <component
                                                :is="resolveInterfaceComponent(getFieldConfig(field).type)"
                                                :field="getFieldConfig(field)"
                                                :model="fieldModels[field.name]"
                                            />
                                        </template>
                                        
                                        <!-- Cast display (related data) -->
                                        <div v-if="field.cast_display || field.cast_error" class="mt-1.5">
                                            <div v-if="field.cast_error" class="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <span>{{ field.cast_error }}</span>
                                            </div>
                                            <div v-else class="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1.5 rounded cast-display" v-html="formatCastDisplay(field.cast_display)"></div>
                                        </div>
                                        
                                        <p v-if="editForm.errors[field.name]" class="mt-1 text-sm text-red-600">
                                            {{ editForm.errors[field.name] }}
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
                                    <!-- Non-editable fields shown as read-only text -->
                                    <div v-if="field.editable === false" class="space-y-1">
                                        <label class="form-label">{{ field.title || field.name }}</label>
                                        <div class="form-input bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 cursor-not-allowed">
                                            {{ formatFieldValue(field) }}
                                        </div>
                                    </div>
                                    
                                    <!-- Editable fields shown as input components -->
                                    <template v-else>
                                        <component
                                            :is="resolveInterfaceComponent(getFieldConfig(field).type)"
                                            :field="getFieldConfig(field)"
                                            :model="fieldModels[field.name]"
                                        />
                                    </template>
                                    
                                    <!-- Cast display (related data) -->
                                    <div v-if="field.cast_display || field.cast_error" class="mt-1.5">
                                        <div v-if="field.cast_error" class="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            <span>{{ field.cast_error }}</span>
                                        </div>
                                        <div v-else class="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1.5 rounded cast-display" v-html="formatCastDisplay(field.cast_display)"></div>
                                    </div>
                                    
                                    <p v-if="editForm.errors[field.name]" class="mt-1 text-sm text-red-600">
                                        {{ editForm.errors[field.name] }}
                                    </p>
                                </div>
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
                    </form>
                </div>
            </div>
        </div>
        
        <!-- Sticky Bottom Toolbar -->
        <div class="sticky bottom-0 left-0 right-0 z-40 bg-transparent dark:bg-gray-800 mx-auto max-w-7xl">

            <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 bg-white lg:mx-8 shadow-lg border-t border-gray-200 dark:border-gray-700 rounded-xl">
                <div class="flex items-center justify-between gap-4">
                    <Link :href="baseUrl" class="btn-text">
                        Cancel
                    </Link>
                    <button
                        type="button"
                        class="btn btn-primary"
                        :disabled="editForm.processing"
                        @click="submitUpdate"
                    >
                        {{ editForm.processing ? t('admin.db_table.updating') : t('admin.db_table.update_record') }}
                    </button>
                </div>
            </div>
        </div>
        
        <ToastStack :toasts="toasts" @dismiss="dismissToast" />
    </AdminLayout>
</template>

