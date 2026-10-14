<script setup>
import { adminUrl } from '@/utils/adminUrl';
import { computed } from 'vue';
import { Head, Link } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import { useTranslation } from '@/utils/useTranslation.js';
import { useDbTableRecordForm } from '@/composables/useDbTableRecordForm.js';
import DbTableRecordForm from './components/DbTableRecordForm.vue';

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

const baseUrl = computed(() => adminUrl(`${props.moduleHandle}`));
const { form, models, fields, usesParentSelector, submit } = useDbTableRecordForm(props, { parentId: props.parentId });

// The backend redirects to the new record's edit page
const submitCreate = () => submit(`${baseUrl.value}/create`);
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

                    <form @submit.prevent="submitCreate">
                        <DbTableRecordForm
                            v-model:parent="form[parentColumn]"
                            :fields="fields"
                            :models="models"
                            :errors="form.errors"
                            :ui-config="uiConfig"
                            :available-parents="availableParents"
                            :parent-column="parentColumn"
                            :show-parent="usesParentSelector"
                        />
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
                        :disabled="form.processing"
                        @click="submitCreate"
                    >
                        {{ form.processing ? 'Creating...' : 'Create Record' }}
                    </button>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>
