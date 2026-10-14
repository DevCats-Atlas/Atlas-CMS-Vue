<script setup>
import { adminUrl } from '@/utils/adminUrl';
import { onMounted, reactive, ref } from 'vue';
import axios from 'axios';
import { useTranslation } from '@admin/js/utils/useTranslation';
import { createModels, submitValues } from '@/dbTable/formModel.js';
import DbTableRecordForm from './DbTableRecordForm.vue';

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
const models = reactive({});
const loading = ref(false);
const submitting = ref(false);
const errors = ref({});

const relationshipUrl = (action) => adminUrl(`${props.moduleHandle}/relationships/${props.relationship.name || props.relationship.related_table || 'unknown'}/${action}`);

const resetModels = () => {
    Object.keys(models).forEach((key) => delete models[key]);
    Object.assign(models, createModels(fields.value));
};

const loadStructure = async () => {
    loading.value = true;
    errors.value = {};

    try {
        const response = await axios.get(relationshipUrl('structure'));
        fields.value = response.data.fields || [];
        resetModels();
    } catch (error) {
        console.error('Error loading table structure:', error);
        errors.value = { general: error.response?.data?.message || error.message || t('admin.errors.error_occurred') };
    } finally {
        loading.value = false;
    }
};

const submitForm = async () => {
    submitting.value = true;
    errors.value = {};

    try {
        const response = await axios.post(relationshipUrl('create'), {
            record_id: props.recordId,
            ...submitValues(fields.value, models),
        });
        emit('created', response.data.record_id);
        resetModels();
    } catch (error) {
        console.error('Error creating record:', error);
        errors.value = error.response?.status === 422 && error.response?.data?.errors
            ? error.response.data.errors
            : { general: error.response?.data?.message || error.message || t('admin.errors.error_creating_record') };
    } finally {
        submitting.value = false;
    }
};

onMounted(loadStructure);
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
            <DbTableRecordForm :fields="fields" :models="models" :errors="errors" compact />

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

