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
    relatedRecordId: {
        type: [String, Number],
        required: true,
    },
    primaryKeyColumn: {
        type: String,
        default: 'id',
    },
    relatedTableName: {
        type: String,
        required: true,
    },
});

const emit = defineEmits(['updated', 'cancel']);

const fields = ref([]);
const loading = ref(false);
const submitting = ref(false);
const errors = ref({});
const formData = ref({});
const fieldModels = ref({});

// Get field config for interface component
const getFieldConfig = (field) => {
    return {
        name: field.name,
        type: field.interface || 'text',
        title: field.name,
        options: field.options || '',
        required: !field.nullable,
    };
};

// Build form data structure based on fields and existing record
const buildFormData = (recordData) => {
    const data = {};
    fields.value.forEach((field) => {
        // Use existing value from record if available
        const existingValue = recordData[field.name];
        
        if (existingValue !== null && existingValue !== undefined) {
            if (field.interface === 'checkbox') {
                data[field.name] = existingValue ? true : false;
            } else {
                data[field.name] = existingValue;
            }
        } else if (field.default !== null && field.default !== undefined) {
            if (field.interface === 'checkbox') {
                data[field.name] = field.default ? true : false;
            } else {
                data[field.name] = field.default;
            }
        } else {
            if (field.interface === 'checkbox') {
                data[field.name] = false;
            } else if (field.interface === 'select') {
                data[field.name] = '';
            } else {
                data[field.name] = '';
            }
        }
        
        // Initialize field model for interface components
        fieldModels.value[field.name] = {
            default: data[field.name],
            translations: {},
        };
    });
    return data;
};

// Load table structure and record data
const loadData = async () => {
    loading.value = true;
    errors.value = {};
    
    try {
        // Load structure
        const structureResponse = await axios.get(`/admin/${props.moduleHandle}/relationships/${getRelationshipName()}/structure`);
        
        if (!structureResponse.data.success) {
            errors.value = { general: structureResponse.data.message || t('admin.errors.error_occurred') };
            return;
        }
        
        fields.value = structureResponse.data.fields || [];
        
        // Load existing record data
        const recordDataResponse = await axios.get(`/admin/api/tables/${props.relatedTableName}/record`, {
            params: {
                id: props.relatedRecordId,
            },
        });
        
        if (!recordDataResponse.data.success) {
            errors.value = { general: recordDataResponse.data.error || t('admin.errors.error_occurred') };
            return;
        }
        
        const recordData = recordDataResponse.data.record || {};
        formData.value = buildFormData(recordData);
    } catch (error) {
        console.error('Error loading data:', error);
        errors.value = { 
            general: error.response?.data?.message || error.message || t('admin.errors.error_occurred')
        };
    } finally {
        loading.value = false;
    }
};

// Submit form
const submitForm = async () => {
    submitting.value = true;
    errors.value = {};
    
    try {
        // Build payload from field models
        const payload = {};
        
        fields.value.forEach((field) => {
            if (fieldModels.value[field.name]) {
                payload[field.name] = fieldModels.value[field.name].default;
            }
        });
        
        // Use the relationship update endpoint
        const response = await axios.put(`/admin/${props.moduleHandle}/relationships/${getRelationshipName()}/update`, {
            record_id: props.recordId,
            related_record_id: props.relatedRecordId,
            ...payload,
        });
        
        if (response.data.success) {
            emit('updated', props.relatedRecordId);
        } else {
            errors.value = { general: response.data.message || t('admin.errors.error_updating_record') };
        }
    } catch (error) {
        console.error('Error updating record:', error);
        if (error.response?.status === 422 && error.response?.data?.errors) {
            errors.value = error.response.data.errors;
        } else {
            errors.value = { 
                general: error.response?.data?.message || error.message || t('admin.errors.error_updating_record')
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
    loadData();
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
                    <span v-if="submitting">Updating...</span>
                    <span v-else>{{ t('admin.common.update') }}</span>
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

