<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { resolveInterfaceComponent } from '@admin/Pages/Admin/Modules/Default/components/interfaces';
import { useTranslation } from '@admin/js/utils/useTranslation';

const { t } = useTranslation();

const props = defineProps({
    relationship: {
        type: Object,
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
    primaryKeyColumn: {
        type: String,
        default: 'id',
    },
});

const emit = defineEmits(['created', 'cancel']);

const fields = ref([]);
const loading = ref(false);
const submitting = ref(false);
const errors = ref({});
const formData = ref({});
const fieldModels = ref({});

// Build form data structure based on fields
const buildFormData = () => {
    const data = {};
    fields.value.forEach((field) => {
        const defaultValue = field.default !== null && field.default !== undefined
            ? (field.interface === 'checkbox' ? (field.default ? true : false) : field.default)
            : (field.interface === 'checkbox' ? false : '');
        
        data[field.name] = defaultValue;
        
        // Initialize field model for interface components
        fieldModels.value[field.name] = {
            default: defaultValue,
            translations: {},
        };
    });
    return data;
};

// Load table structure
const loadStructure = async () => {
    loading.value = true;
    errors.value = {};
    
    try {
        const response = await axios.get(`/admin/${props.moduleHandle}/relationships/${getRelationshipName()}/structure`);
        
        if (response.data.success) {
            fields.value = response.data.fields || [];
            formData.value = buildFormData();
        } else {
            errors.value = { general: response.data.message || t('admin.errors.error_occurred') };
        }
    } catch (error) {
        console.error('Error loading table structure:', error);
        errors.value = { 
            general: error.response?.data?.message || error.message || t('admin.errors.error_occurred')
        };
    } finally {
        loading.value = false;
    }
};

// Get field config for interface component
const getFieldConfig = (field) => {
    const config = {
        name: field.name,
        type: field.interface || 'text',
        title: field.title || field.name,
        required: !field.nullable,
        config: {
            type: field.interface || 'text',
        },
        // For file fields, add value and value_url
        values: field.interface === 'file' ? {
            default: field.value || null,
            default_url: field.value_url || null,
        } : undefined,
    };
    
    // Only set options for select interfaces
    // Backend now sends options as an array, so use it directly
    if (field.interface === 'select') {
        // If options is already an array (from backend), use it directly
        // Otherwise, parse it (for backward compatibility)
        if (Array.isArray(field.options)) {
            config.config.options = field.options;
        } else {
            const inputType = field.select_input_type || 'comma';
            config.config.options = field.options ? parseSelectOptions(field.options, inputType) : [];
        }
    }
    
    return config;
};

// Parse select options from string based on input type
const parseSelectOptions = (optionsString, inputType = 'comma') => {
    if (!optionsString || !optionsString.trim()) {
        return [];
    }
    
    // Handle different input types
    switch (inputType) {
        case 'comma':
            // Comma-separated values
            return optionsString.split(',').map(opt => opt.trim()).filter(opt => opt).map(opt => ({
                key: opt,
                label: opt,
            }));
            
        case 'newline':
            // Line break separated values
            return optionsString.split('\n').map(opt => opt.trim()).filter(opt => opt).map(opt => ({
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
            // Fallback: try comma-separated
            return optionsString.split(',').map(opt => opt.trim()).filter(opt => opt).map(opt => ({
                key: opt,
                label: opt,
            }));
    }
};

// Submit form
const submitForm = async () => {
    submitting.value = true;
    errors.value = {};
    
    try {
        // Build payload from field models
        const payload = {
            record_id: props.recordId,
        };
        
        fields.value.forEach((field) => {
            if (fieldModels.value[field.name]) {
                payload[field.name] = fieldModels.value[field.name].default;
            }
        });
        
        const response = await axios.post(`/admin/${props.moduleHandle}/relationships/${getRelationshipName()}/create`, payload);
        
        if (response.data.success) {
            emit('created', response.data.record_id);
            // Reset form
            formData.value = buildFormData();
        } else {
            errors.value = { general: response.data.message || t('admin.errors.error_creating_record') };
        }
    } catch (error) {
        console.error('Error creating record:', error);
        if (error.response?.status === 422 && error.response?.data?.errors) {
            errors.value = error.response.data.errors;
        } else {
            errors.value = { 
                general: error.response?.data?.message || error.message || t('admin.errors.error_creating_record')
            };
        }
    } finally {
        submitting.value = false;
    }
};

const getRelationshipName = () => {
    return props.relationship.name || props.relationship.related_table || 'unknown';
};

onMounted(() => {
    loadStructure();
});
</script>

<template>
    <div class="space-y-4">
        <!-- Loading state -->
        <div v-if="loading" class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ t('admin.common.loading') }}</p>
        </div>

        <!-- Error state -->
        <div v-else-if="errors.general" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p class="text-sm text-red-800 dark:text-red-200">{{ errors.general }}</p>
        </div>

        <!-- Form -->
        <form v-else @submit.prevent="submitForm" class="space-y-4">
            <div v-for="field in fields" :key="field.name" class="space-y-1">
                <!-- Dynamic field component -->
                <component
                    :is="resolveInterfaceComponent(getFieldConfig(field).type)"
                    :field="getFieldConfig(field)"
                    :model="fieldModels[field.name]"
                />
                
                <!-- Field error -->
                <p v-if="errors[field.name]" class="mt-1 text-sm text-red-600 dark:text-red-400">
                    {{ Array.isArray(errors[field.name]) ? errors[field.name][0] : errors[field.name] }}
                </p>
            </div>

            <!-- Form actions -->
            <div class="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    type="submit"
                    class="btn btn-sm btn-primary"
                    :disabled="submitting"
                >
                    <span v-if="submitting">{{ t('admin.db_table.creating') }}</span>
                    <span v-else>{{ t('admin.relationships.create_new_record') }}</span>
                </button>
                <button
                    type="button"
                    @click="emit('cancel')"
                    class="btn btn-sm btn-outline"
                    :disabled="submitting"
                >
                    {{ t('admin.common.cancel') }}
                </button>
            </div>
        </form>
    </div>
</template>

