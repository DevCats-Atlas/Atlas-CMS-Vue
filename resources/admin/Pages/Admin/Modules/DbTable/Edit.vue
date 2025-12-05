<script setup>
import { ref, computed, watch } from 'vue';
import { Head, Link, router, useForm } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import ToastStack from '@/components/ToastStack.vue';
import { useToast } from '@/composables/useToast.js';
import { resolveInterfaceComponent } from '@admin/Pages/Admin/Modules/Default/components/interfaces';

const props = defineProps({
    title: {
        type: String,
        default: 'Edit Record',
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
});

const baseUrl = computed(() => `/admin/${props.moduleHandle}`);
const { toasts, showToast, dismissToast } = useToast();

// Build form data structure based on fields with existing values
const buildFormData = () => {
    const formData = {
        record_id: props.recordId,
    };
    
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

const submitUpdate = () => {
    // Explicitly sync fieldModels to form before submission
    props.fields.forEach((field) => {
        if (fieldModels.value[field.name]) {
            editForm[field.name] = fieldModels.value[field.name].default;
        }
    });
    
    editForm.put(`${baseUrl.value}/edit`, {
        preserveScroll: true,
        onSuccess: () => {
            showToast({
                title: 'Success',
                message: 'Record updated successfully',
                intent: 'success',
            });
            router.visit(`${baseUrl.value}/edit?id=${props.recordId}`);
        },
    });
};

// Parse select options from string
const parseSelectOptions = (optionsString) => {
    if (!optionsString || optionsString.trim() === '') {
        return [];
    }
    
    // Try comma-separated first
    const commaSeparated = optionsString.split(',').map(opt => opt.trim()).filter(opt => opt);
    if (commaSeparated.length > 1) {
        return commaSeparated.map(opt => ({
            key: opt,
            label: opt,
        }));
    }
    
    // Try newline-separated
    const newlineSeparated = optionsString.split('\n').map(opt => opt.trim()).filter(opt => opt);
    if (newlineSeparated.length > 1) {
        return newlineSeparated.map(opt => ({
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
    };
    
    // For select fields, parse options
    if (interfaceType === 'select' && field.options) {
        const options = parseSelectOptions(field.options);
        config.config.options = options;
    }
    
    return config;
};
</script>

<template>
    <AdminLayout>
        <Head :title="title" />

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

                        <div class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Link :href="baseUrl" class="btn-text">
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                class="btn btn-primary"
                                :disabled="editForm.processing"
                            >
                                {{ editForm.processing ? 'Updating...' : 'Update Record' }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <ToastStack :toasts="toasts" @dismiss="dismissToast" />
    </AdminLayout>
</template>

