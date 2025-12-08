<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { resolveInterfaceComponent } from '@admin/Pages/Admin/Modules/Default/components/interfaces';

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
            errors.value = { general: response.data.message || 'Failed to load table structure' };
        }
    } catch (error) {
        console.error('Error loading table structure:', error);
        errors.value = { 
            general: error.response?.data?.message || error.message || 'Failed to load table structure' 
        };
    } finally {
        loading.value = false;
    }
};

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
            errors.value = { general: response.data.message || 'Failed to create record' };
        }
    } catch (error) {
        console.error('Error creating record:', error);
        if (error.response?.status === 422 && error.response?.data?.errors) {
            errors.value = error.response.data.errors;
        } else {
            errors.value = { 
                general: error.response?.data?.message || error.message || 'Failed to create record' 
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
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading form structure...</p>
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
                    <span v-if="submitting">Creating...</span>
                    <span v-else>Create Record</span>
                </button>
                <button
                    type="button"
                    @click="emit('cancel')"
                    class="btn btn-sm btn-outline"
                    :disabled="submitting"
                >
                    Cancel
                </button>
            </div>
        </form>
    </div>
</template>

